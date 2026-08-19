import fs from "node:fs";
import path from "node:path";

// Generates knowledge/summons/*.md files from list.json (GameWith master-list
// data: effects/obtain/stats) + verify_report.json (gbf.wiki cross-check
// status per summon), for one element's scratch dir.
// Usage: node scratch-generate-summon-files.mjs <scratch-dir-abs-path> <element-en e.g. fire> <out-dir>

const SCRATCH = process.argv[2];
const ELEMENT_EN = process.argv[3];
const OUT_DIR = process.argv[4];
if (!SCRATCH || !ELEMENT_EN || !OUT_DIR) {
  console.error("usage: node scratch-generate-summon-files.mjs <scratch-dir> <element-en> <out-dir>");
  process.exit(1);
}

const VERSION_KEYWORD_HINTS = [
  ["水着", "summer"],
  ["浴衣", "yukata"],
  ["ハロウィン", "halloween"],
  ["クリスマス", "christmas"],
  ["バレンタイン", "valentine"],
];

const NAME_STRIP_SUFFIXES = [" (Summon)", " (SSR)", " (SR)", " (R)"];
const VERSION_SUFFIX_STRIP = [" (Summer)", " (Halloween)", " (Yukata)", " (Christmas)", " (Valentine)", " (Holiday)"];

// gbf.wiki candidate titles come from raw HTML attributes and may carry numeric
// character references (e.g. "Vane&#039;s Cooking") — decode before any further
// text processing so they don't leak into slugs/filenames as literal digits.
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// gbf.wiki has no page for some summons the automated search couldn't resolve
// (e.g. raid-only "Magna" tiers); their English name has to come from general
// knowledge of the game rather than a fetched page.
const MANUAL_NAME_OVERRIDES = {
  "コロッサス･マグナ": "Colossus Magna",
};

function kebab(s) {
  return s
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function deriveVersion(name) {
  for (const [kw, ver] of VERSION_KEYWORD_HINTS) {
    if (name.includes(kw)) return ver;
  }
  return "normal";
}

function deriveNameEn(candidateTitle, jpName) {
  if (!candidateTitle) return MANUAL_NAME_OVERRIDES[jpName] || jpName;
  let t = decodeEntities(candidateTitle);
  for (const suffix of NAME_STRIP_SUFFIXES) {
    if (t.endsWith(suffix)) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }
  return t.trim();
}

// The version suffix (summer/halloween/...) is appended separately in the id,
// so strip it from the name before kebab-casing to avoid "-summer-summer".
function deriveSlug(nameEn) {
  let t = nameEn;
  for (const suffix of VERSION_SUFFIX_STRIP) {
    if (t.endsWith(suffix)) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }
  return kebab(t);
}

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));
const report = JSON.parse(fs.readFileSync(path.join(SCRATCH, "verify_report.json"), "utf-8"));

fs.mkdirSync(OUT_DIR, { recursive: true });

const today = "2026-08-20";
const generated = [];

for (let i = 0; i < list.length; i++) {
  const c = list[i];
  const r = report[i];
  const nameEn = deriveNameEn(r.candidateTitle, c.name);
  const version = deriveVersion(c.name);
  const slug = deriveSlug(nameEn);
  const id = `${ELEMENT_EN}-ssr-${slug}-${version}`;
  const fileName = `${id}.md`;

  const obtainClean = c.obtain.replace(/^\(|\)$/g, "");
  // GameWith sometimes doesn't display a parenthesized second value even when a
  // real further uncap tier exists (e.g. Shiva, Wilnas) — gbf.wiki's own Level
  // 150 row, when present, is the authoritative signal and takes priority. When
  // there's no gbf.wiki data at all (NO_CANDIDATE), fall back to whether
  // GameWith itself showed two different values.
  const wikiLvl150 = r.gbfwikiLevels?.["150"];
  const gamewithHasSecondTier = c.atk !== c.atk_max || c.hp !== c.hp_max;
  const singleTier = !wikiLvl150 && !gamewithHasSecondTier;
  const maxHp = wikiLvl150 ? wikiLvl150.hp : c.hp_max;
  const maxAtk = wikiLvl150 ? wikiLvl150.atk : c.atk_max;

  let sourceLine;
  if (r.status === "MATCH") {
    sourceLine = `GameWith SSR召喚石一覧 (https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/136372) と gbf.wiki (https://gbf.wiki/${r.candidateHref}) の両方で確認(取得日: ${today})。ATK/HPともに一致。`;
  } else if (r.status === "PARTIAL_MATCH") {
    sourceLine = `GameWith SSR召喚石一覧 (https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/136372) と gbf.wiki (https://gbf.wiki/${r.candidateHref}) の両方で確認(取得日: ${today})。ATK/HPの一部に不一致あり(未確認・要検証事項を参照)。`;
  } else {
    sourceLine = `GameWith SSR召喚石一覧 (https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/136372) のみ(取得日: ${today})。gbf.wiki候補は自動検索で見つからず/確認できず。`;
  }

  const statsRows = [];
  statsRows.push(`| Lv100(3★)${singleTier ? "・最終上限解放" : ""} | ${c.hp} | ${c.atk} |`);
  if (!singleTier) {
    statsRows.push(`| Lv150(4★・最終上限解放) | ${maxHp} | ${maxAtk} |`);
  }

  const hasMainSub = c.guard_effect_raw.includes("メイン効果:") && c.guard_effect_raw.includes("サブ効果:");
  let mainGuard, subGuard;
  if (hasMainSub) {
    // Lines look like "(3凸)メイン効果:X" / "サブ効果:Y" / "(4凸)メイン効果:X" / "サブ効果:Y" —
    // a 凸-tier prefix only appears on the メイン line; the following サブ line
    // implicitly belongs to that same tier, so track and re-attach it.
    const mainLines = [];
    const subLines = [];
    let currentTier = "";
    for (const raw of c.guard_effect_raw.split("\n")) {
      const tierMatch = raw.match(/^(\(\d凸\))(.*)$/);
      const tier = tierMatch ? tierMatch[1] : currentTier;
      const line = tierMatch ? tierMatch[2] : raw;
      if (tierMatch) currentTier = tierMatch[1];

      if (line.startsWith("メイン効果:")) {
        mainLines.push(`${tier}${line.replace(/^メイン効果:/, "")}`.trim());
      } else if (line.startsWith("サブ効果:")) {
        subLines.push(`${tier}${line.replace(/^サブ効果:/, "")}`.trim());
      } else if (line.trim()) {
        mainLines.push(raw);
      }
    }
    mainGuard = mainLines.join("\n");
    subGuard = subLines.join("\n");
  } else {
    mainGuard = c.guard_effect_raw;
    subGuard = null;
  }

  const verifyNote =
    r.status === "PARTIAL_MATCH"
      ? `\n- gbf.wikiとの間でステータスに不一致あり(GameWith: HP${c.hp}/ATK${c.atk} vs gbf.wiki Lv100: ${JSON.stringify(r.gbfwikiLevels?.["100"] || {})})。要ゲーム内再検証。`
      : "";
  const noCandidateNote =
    r.status === "NO_CANDIDATE"
      ? "\n- gbf.wiki候補が自動検索で見つからなかったため、正確なHP/ATKは未検証。"
      : "";
  const missingFourTsuNote =
    !singleTier && wikiLvl150 && !c.guard_effect_raw.includes("4凸") && !c.call_effect_raw.includes("4凸")
      ? "\n- 4★(4凸)到達時点のステータスはgbf.wikiで確認済みだが、その時点での加護効果/召喚効果の具体的な変化はGameWith一覧に明記されておらず未検証。"
      : "";
  const unverifiedMaxTierNote =
    !singleTier && !wikiLvl150
      ? "\n- 4★(4凸)時点のHP/ATKはGameWithの記載値のみで、gbf.wikiによるクロスチェックができていない(候補ページが見つからないため)。"
      : "";

  const body = `---
id: "${id}"
name_jp: "${c.name.replace(/･/g, "・")}"
name_en: "${nameEn}"
rarity: SSR
element: "${c.element}"
obtain: "${obtainClean}"
status: 下書き
last_updated: ${today}
source: "${sourceLine}"
---

# ${c.name.replace(/･/g, "・")}(${nameEn})

## 概要

${c.element}属性のSSR召喚石。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | ${c.element} |
| 入手方法 | ${obtainClean} |

## ステータス

| レベル | HP | ATK |
| --- | --- | --- |
${statsRows.join("\n")}

## 召喚効果

- 効果: ${c.call_effect_raw.split("\n").join(" / ")}
- 出典: GameWith

## 加護効果(メイン編成時)

- 効果: ${mainGuard.split("\n").join(" / ")}
- 出典: GameWith

## サブ加護効果(サブ編成時)

${
  subGuard
    ? `- 効果: ${subGuard.split("\n").join(" / ")}\n- 出典: GameWith`
    : "- 加護効果と同一、または倍率のみ異なる想定(GameWith一覧には明記なし、要検証)。"
}

## 関連トピック

- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)

## 未確認・要検証事項

- サブ加護効果の正確な倍率はGameWith一覧に明記されていない場合、未検証。${verifyNote}${noCandidateNote}${missingFourTsuNote}${unverifiedMaxTierNote}
- gbf.wikiでさらに上位の上限解放段階(5★/6★等)が存在する場合、本ファイルはGameWithの標準的な表記(3★/4★)までの記載としており、それ以降は未反映。
`;

  fs.writeFileSync(path.join(OUT_DIR, fileName), body);
  generated.push({ fileName, name_jp: c.name, name_en: nameEn, status: r.status });
}

console.log("generated", generated.length, "files into", OUT_DIR);
fs.writeFileSync(path.join(SCRATCH, "generated_manifest.json"), JSON.stringify(generated, null, 2));
