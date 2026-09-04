#!/usr/bin/env node
// 引き継ぎプロンプト生成スクリプト。
// handoff-template.md の {{...}} をリポジトリの現在状態で埋めて標準出力に出す。
//
// Usage:
//   node prompts/generate-handoff.mjs
//   node prompts/generate-handoff.mjs --task "武器の天星器シリーズを処理して"
//   node prompts/generate-handoff.mjs > handoff.txt
//
// どのディレクトリから実行しても動く(スクリプト位置からリポジトリルートを解決)。

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SCRIPT_DIR, "..");
const TEMPLATE = path.join(SCRIPT_DIR, "handoff-template.md");

function git(...args) {
  try {
    return execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function taskFromArgs() {
  const i = process.argv.indexOf("--task");
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1].trim();
  return "<<ここに今回の依頼を書く。例: 「武器の天星器シリーズを draft に上げたので処理して」>>";
}

// --- git 情報 ---------------------------------------------------------------
const branch = git("rev-parse", "--abbrev-ref", "HEAD") || "(不明)";
const porcelain = git("status", "--porcelain");
const changed = porcelain ? porcelain.split("\n").filter(Boolean).length : 0;
const worktreeStatus = changed === 0
  ? "クリーン(未コミットの変更なし)"
  : `**未コミットの変更 ${changed} 件あり** — 引き継ぎ前にコミットまたは退避すること`;
const recentCommits = git("log", "--oneline", "-12") || "(コミット履歴を取得できませんでした)";

// --- knowledge/ 件数 ------------------------------------------------------
function countMarkdown(dir) {
  let n = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      if (!e.isFile() || !e.name.endsWith(".md")) continue;
      if (e.name === "README.md" || e.name.startsWith("_template")) continue;
      n++;
    }
  }
  return n;
}
function countJson(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

const knowledgeRoot = path.join(REPO, "knowledge");
let knowledgeCounts = "(knowledge/ が見つかりません)";
try {
  const cats = fs.readdirSync(knowledgeRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const rows = cats.map((c) => {
    const dir = path.join(knowledgeRoot, c);
    const md = countMarkdown(dir);
    const json = countJson(dir);
    const parts = [];
    if (md) parts.push(`${md} md`);
    if (json) parts.push(`${json} json`);
    return `- \`knowledge/${c}/\`: ${parts.join(" + ") || "(空)"}`;
  });
  knowledgeCounts = rows.join("\n");
} catch { /* keep default */ }

// --- draft/ 状況 --------------------------------------------------------
const draftRoot = path.join(REPO, "draft");
let draftStatus = "`draft/` が見つかりません。";
try {
  const tops = fs.readdirSync(draftRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
  const lines = [];
  let totalJson = 0;
  for (const top of tops.sort((a, b) => a.name.localeCompare(b.name, "ja"))) {
    const topDir = path.join(draftRoot, top.name);
    // top 直下の json + サブフォルダごとの json
    let sub;
    try { sub = fs.readdirSync(topDir, { withFileTypes: true }); } catch { sub = []; }
    const directJson = sub.filter((e) => e.isFile() && e.name.endsWith(".json")).length;
    const subDirs = sub.filter((e) => e.isDirectory());
    const subCounts = subDirs
      .map((d) => ({ name: d.name, n: countJson(path.join(topDir, d.name)) }))
      .filter((x) => x.n > 0);
    const topTotal = directJson + subCounts.reduce((a, x) => a + x.n, 0);
    totalJson += topTotal;
    if (topTotal === 0) {
      lines.push(`- \`draft/${top.name}/\`: json なし`);
    } else {
      const detail = subCounts.length
        ? `(${subCounts.map((x) => `${x.name} ${x.n}`).join(" / ")}${directJson ? ` / 直下 ${directJson}` : ""})`
        : "";
      lines.push(`- \`draft/${top.name}/\`: **json ${topTotal} 件** ${detail}`);
    }
  }
  draftStatus = (totalJson === 0
    ? "未処理の json は **なし**(すべて処理済み or 受け皿フォルダのみ)。\n\n"
    : `未処理の json 合計 **${totalJson} 件**。処理して 4 ステップのルーティンを回すこと。\n\n`)
    + lines.join("\n");
} catch { /* keep default */ }

// --- data-collection-notes.md の最新見出し --------------------------------
const notesPath = path.join(REPO, "docs", "data-collection-notes.md");
let notesHeadings = "(docs/data-collection-notes.md を読めませんでした)";
try {
  const text = fs.readFileSync(notesPath, "utf8");
  // 日付付き見出しを集め、見出し内の最初の日付でソートして新しい順に(ファイル内の
  // 記述順は時系列と一致しない — 新しい節が中間に挿入されるため)。
  const dateRe = /(20\d\d)[-/](\d{1,2})[-/](\d{1,2})/;
  const heads = text.split(/\r?\n/)
    .filter((l) => /^#{2,3}\s/.test(l) && dateRe.test(l))
    .map((l) => {
      const m = l.match(dateRe);
      const key = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      return { key, text: l.replace(/^#+\s*/, "") };
    });
  // 同じ日付の見出しは元の順序を保ちつつ、日付で安定ソート
  heads.forEach((h, i) => { h.i = i; });
  heads.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : b.i - a.i));
  const latest = heads.slice(0, 8);
  notesHeadings = latest.length
    ? latest.map((h) => `- ${h.text}`).join("\n")
    : "(日付付きの見出しが見つかりませんでした。ファイル末尾を直接読んでください)";
} catch { /* keep default */ }

// --- 差し込み ------------------------------------------------------------
const now = new Date();
const generatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

let out = fs.readFileSync(TEMPLATE, "utf8");
const fills = {
  GENERATED_AT: generatedAt,
  BRANCH: branch,
  WORKTREE_STATUS: worktreeStatus,
  RECENT_COMMITS: recentCommits,
  KNOWLEDGE_COUNTS: knowledgeCounts,
  DRAFT_STATUS: draftStatus,
  NOTES_HEADINGS: notesHeadings,
  TASK: taskFromArgs(),
};
for (const [k, v] of Object.entries(fills)) {
  out = out.replaceAll(`{{${k}}}`, v);
}

const leftover = out.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) {
  process.stderr.write(`warning: 未置換のプレースホルダ: ${[...new Set(leftover)].join(", ")}\n`);
}

process.stdout.write(out.endsWith("\n") ? out : out + "\n");
