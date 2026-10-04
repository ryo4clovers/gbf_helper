#!/usr/bin/env node
// Local Git helper. No shell interpolation, network, commit, merge, or removal.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const help = `使い方 (Windows版Node.js / Git、追加依存なし):
  node scripts/worktree.mjs status
  node scripts/worktree.mjs review --base <基点コミットまたはブランチ>
  node scripts/worktree.mjs new <task名> --base <基点> --directory <絶対パス> [--dry-run]

new は task/<task名> を新規作成。英小文字・数字・ハイフンのみ使用。
基点と作成先は必須。作成先は全worktreeの外側の、存在しないパスに限定。
元worktreeに未コミット変更や進行中のGit操作がある場合は停止。
status/review/dry-run は読み取りのみ。依存のインストールや統合は行いません。
review はコミット済み差分の概要と未コミット差分の概要を分けて表示。
詳細な手順: docs/multi-agent-workflow.md`;

function git(...args) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).trimEnd();
}
function print(title, result) {
  console.log(`\n${title}\n${result || "(なし)"}`);
}
function commit(ref) {
  if (!ref || ref.startsWith("-") || /[\s\x00-\x1f]/.test(ref)) {
    throw new Error("基点を1つのコミットまたはブランチで指定してください。");
  }
  return git("rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`).trim();
}
function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}
function validateDirectory(directory) {
  if (!directory || !path.isAbsolute(directory)) throw new Error("作成先を絶対パスで指定してください。");
  if (process.platform !== "win32") return;
  const windowsPath = directory.replaceAll("/", "\\");
  // Validate before path.resolve: normalization must not hide invalid components.
  // See https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file
  if (/^\\\\[?.]\\/.test(windowsPath) || !/^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+(?:\\|$))/i.test(windowsPath)) {
    throw new Error("Windowsの作成先はドライブ付き絶対パスまたは通常のUNCパスで指定してください。特殊名前空間は使いません。");
  }
  const components = windowsPath.replace(/^[a-z]:\\/i, "").split("\\").filter(Boolean);
  for (const component of components) {
    if (component === "." || component === "..") continue;
    const stem = component.split(".")[0].replace(/[ .]+$/, "");
    if (/[<>:"|?*\x00-\x1f]/.test(component) || /[ .]$/.test(component)
      || /^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³]|CONIN\$|CONOUT\$)$/i.test(stem)) {
      throw new Error(`Windowsの作成先に予約名・禁止文字・末尾の空白/ピリオドがあります: ${JSON.stringify(component)}`);
    }
  }
}
// Resolve existing ancestors so junctions/symlinks cannot hide a nested destination.
function physicalPath(target) {
  if (fs.existsSync(target)) return fs.realpathSync.native(target);
  const parent = path.dirname(target);
  if (parent === target) throw new Error("作成先の親フォルダーを解決できません。");
  return path.join(physicalPath(parent), path.basename(target));
}
function cleanSource() {
  if (git("status", "--porcelain=v1")) {
    throw new Error("元worktreeに未コミット変更があります。所有者に相談してください。");
  }
  for (const marker of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "sequencer", "BISECT_START"]) {
    const location = git("rev-parse", "--git-path", marker).trim();
    if (fs.existsSync(path.resolve(repo, location))) throw new Error(`Git操作が進行中です: ${marker}`);
  }
}

try {
  const args = process.argv.slice(2);
  if (!args.length || (args.length === 1 && args[0] === "--help")) {
    console.log(help);
  } else {
    const command = args.shift();
    const name = command === "new" ? args.shift() : undefined;
    const options = {};
    while (args.length) {
      const key = args.shift();
      if (!["--base", "--directory", "--dry-run"].includes(key) || key in options) throw new Error(`不正なオプション: ${key}`);
      if (key === "--dry-run") options[key] = true;
      else {
        const value = args.shift();
        if (!value || value.startsWith("--")) throw new Error(`${key} に値が必要です。`);
        options[key] = value;
      }
    }
    if (!["status", "review", "new"].includes(command)) throw new Error("不明なコマンドです。");
    if (command !== "new" && (options["--directory"] || options["--dry-run"])) throw new Error("このオプションはnew専用です。");
    if (command === "status" && options["--base"]) throw new Error("statusに基点指定は不要です。");
    git("rev-parse", "--show-toplevel");
    if (command === "status") {
      console.log(`worktree: ${repo}\nHEAD: ${commit("HEAD")}`);
      print("作業状態", git("status", "--short", "--branch"));
      print("ブランチ", git("branch", "-vv"));
      print("全worktree", git("worktree", "list", "--porcelain"));
    } else if (command === "review") {
      const base = commit(options["--base"]);
      const head = commit("HEAD");
      console.log(`worktree: ${repo}\n基点: ${base}\n確認対象HEAD: ${head}`);
      print("作業状態 (未コミット内容はHEADに含まれません)", git("status", "--short", "--branch"));
      print("基点からのコミット", git("log", "--oneline", `${base}..${head}`, "--"));
      print("分岐点からのコミット済み差分", git("diff", "--stat", `${base}...${head}`, "--"));
      print("未ステージ差分", git("diff", "--stat", "--"));
      print("ステージ済み差分", git("diff", "--cached", "--stat", "--"));
      console.log("\n未追跡ファイルの内容はdiffに含まれません。statusの??も確認してください。");
    } else {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name ?? "")) throw new Error("task名は英小文字・数字・ハイフンで指定してください。");
      const base = commit(options["--base"]);
      const directory = options["--directory"];
      validateDirectory(directory);
      const target = path.resolve(directory);
      if (fs.existsSync(target)) throw new Error("作成先が既に存在します。上書きしません。");
      const resolved = physicalPath(target);
      // -z avoids Git's quoted path representation (spaces/non-ASCII names).
      const roots = git("worktree", "list", "--porcelain", "-z").split("\0")
        .filter(line => line.startsWith("worktree ")).map(line => line.slice(9));
      for (const root of roots) {
        const physicalRoot = physicalPath(root);
        if (isInside(resolved, physicalRoot) || isInside(physicalRoot, resolved)) throw new Error("作成先が既存worktreeと重なります。");
      }
      const branch = `task/${name}`;
      if (git("branch", "--list", branch)) throw new Error("ブランチが既に存在します。別のtask名を指定してください。");
      cleanSource();
      console.log(`元worktree: ${repo}\n基点: ${base}\n新ブランチ: ${branch}\n作成先: ${target}`);
      if (options["--dry-run"]) console.log("dry-run: 変更していません。");
      else {
        try {
          print("作成結果", git("worktree", "add", "-b", branch, "--", target, base));
        } catch (error) {
          console.error(`作成途中のブランチやworktree登録・フォルダーが残っている可能性があります。
git worktree list --porcelain、git branch --list ${branch}、作成先 ${JSON.stringify(target)} を確認して所有者に相談してください。
自動削除・強制処理は行いません。同じコマンドを再試行する前に状態を確認してください。`);
          throw error;
        }
        console.log("依存関係は新worktreeのmcp-serverでnpm ciを実行してください。");
      }
    }
  }
} catch (error) {
  console.error(`停止: ${error.stderr?.toString().trim() || error.message}`);
  process.exitCode = 1;
}
