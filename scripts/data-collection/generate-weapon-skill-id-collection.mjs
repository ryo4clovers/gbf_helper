import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const catalogPath = path.join(repositoryRoot, "mcp-server/catalog/weapon-skills.v1.json");
const normalAttackCollectionPath = path.join(
  repositoryRoot,
  "knowledge/mechanics/weapon-skill-id-collection.md",
);
const outputPath = path.join(
  repositoryRoot,
  "knowledge/mechanics/weapon-skill-id-other-collection.md",
);

const attributeRules = [
  {
    code: "1",
    label: "火",
    displayPatterns: [
      "火の～", "業火の～", "紅蓮の～", "機炎方陣～", "～ファイア", "焔の～",
      "スカーレット～", "レッド～", "～の炎刃", "～の炎壁", "○○の赤の結界", "神火の～",
    ],
    simplePrefixes: ["火の", "業火の", "紅蓮の", "焔の", "神火の"],
    seriesPrefixes: ["スカーレット", "レッド"],
    omegaPrefix: "機炎方陣",
    suffix: "ファイア",
    blade: "炎刃",
    wall: "炎壁",
    barrier: "赤の結界",
  },
  {
    code: "2",
    label: "水",
    displayPatterns: [
      "水の～", "渦潮の～", "霧氷の～", "海神方陣～", "～ウォータ", "雪の～",
      "コバルト～", "ブルー～", "～の氷刃", "～の氷壁", "○○の青の結界", "神水の～",
    ],
    simplePrefixes: ["水の", "渦潮の", "霧氷の", "雪の", "神水の"],
    seriesPrefixes: ["コバルト", "ブルー"],
    omegaPrefix: "海神方陣",
    suffix: "ウォータ",
    blade: "氷刃",
    wall: "氷壁",
    barrier: "青の結界",
  },
  {
    code: "3",
    label: "土",
    displayPatterns: [
      "土の～", "大地の～", "地裂の～", "創樹方陣～", "～アース", "界の～",
      "アンバー～", "イエロー～", "～の地刃", "～の岩壁", "○○の黄の結界", "神土の～",
    ],
    simplePrefixes: ["土の", "大地の", "地裂の", "界の", "神土の"],
    seriesPrefixes: ["アンバー", "イエロー"],
    omegaPrefix: "創樹方陣",
    suffix: "アース",
    blade: "地刃",
    wall: "岩壁",
    barrier: "黄の結界",
  },
  {
    code: "4",
    label: "風",
    displayPatterns: [
      "風の～", "竜巻の～", "乱気の～", "嵐竜方陣～", "～ウィンド", "凪の～",
      "ジェイド～", "グリーン～", "～の風刃", "～の風壁", "○○の緑の結界", "神風の～",
    ],
    simplePrefixes: ["風の", "竜巻の", "乱気の", "凪の", "神風の"],
    seriesPrefixes: ["ジェイド", "グリーン"],
    omegaPrefix: "嵐竜方陣",
    suffix: "ウィンド",
    blade: "風刃",
    wall: "風壁",
    barrier: "緑の結界",
  },
  {
    code: "5",
    label: "光",
    displayPatterns: [
      "光の～", "雷電の～", "天光の～", "騎解方陣～", "～ライト", "煌の～",
      "ゴールデン～", "ライト～", "～の光刃", "～の光壁", "○○の白の結界", "神光の～",
    ],
    simplePrefixes: ["光の", "雷電の", "天光の", "煌の", "神光の"],
    seriesPrefixes: ["ゴールデン", "ライト"],
    omegaPrefix: "騎解方陣",
    suffix: "ライト",
    blade: "光刃",
    wall: "光壁",
    barrier: "白の結界",
  },
  {
    code: "6",
    label: "闇",
    displayPatterns: [
      "闇の～", "憎悪の～", "奈落の～", "黒霧方陣～", "～ダーク", "煉の～",
      "グラファイト～", "パープル～", "～の闇刃", "～の雲壁", "○○の黒の結界", "神闇の～",
    ],
    simplePrefixes: ["闇の", "憎悪の", "奈落の", "煉の", "神闇の"],
    seriesPrefixes: ["グラファイト", "パープル"],
    omegaPrefix: "黒霧方陣",
    suffix: "ダーク",
    blade: "闇刃",
    wall: "雲壁",
    barrier: "黒の結界",
  },
];

function stripSeparator(value) {
  return value.replace(/^[・:\s]+/u, "").replace(/[・:\s]+$/u, "");
}

function classifyByName(name) {
  for (const rule of attributeRules) {
    for (const prefix of rule.simplePrefixes) {
      if (name.startsWith(prefix)) {
        return { code: rule.code, family: stripSeparator(name.slice(prefix.length)) };
      }
    }
    if (name.startsWith(rule.omegaPrefix)) {
      const rest = stripSeparator(name.slice(rule.omegaPrefix.length));
      return { code: rule.code, family: `方陣・${rest}` };
    }
    for (const prefix of rule.seriesPrefixes) {
      if (name.startsWith(prefix)) {
        return { code: rule.code, family: stripSeparator(name.slice(prefix.length)) };
      }
    }
    if (name.endsWith(rule.suffix)) {
      return { code: rule.code, family: stripSeparator(name.slice(0, -rule.suffix.length)) };
    }
    if (name.includes(rule.blade)) {
      return { code: rule.code, family: name.replace(rule.blade, "属性刃") };
    }
    if (name.includes(rule.wall)) {
      return { code: rule.code, family: name.replace(rule.wall, "属性壁") };
    }
    if (name.includes(rule.barrier)) {
      return { code: rule.code, family: name.replace(rule.barrier, "属性の結界") };
    }
  }
  return null;
}

function classifyByDescription(description) {
  const matches = attributeRules.filter((rule) => description.includes(`${rule.label}属性`));
  return matches.length === 1 ? { code: matches[0].code, family: null } : null;
}

function statusMark(skill) {
  return skill.confirmedAt || /ゲーム内|実機/u.test(skill.source ?? "") ? "✅" : "△";
}

function escapeCell(value) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function parseDateArgument() {
  const index = process.argv.indexOf("--date");
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return new Date().toISOString().slice(0, 10);
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const normalAttackCollection = await readFile(normalAttackCollectionPath, "utf8");
const normalAttackSkillIds = new Set(
  [...normalAttackCollection
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .join("\n")
    .matchAll(/`(\d+)`/gu)].map((match) => match[1]),
);
const nonAttackSkills = catalog.skills.filter(
  (skill) => !normalAttackSkillIds.has(skill.skillId),
);
const grouped = new Map();
const unclassified = [];

for (const skill of nonAttackSkills) {
  const nameMatch = classifyByName(skill.name);
  const descriptionMatch = nameMatch ? null : classifyByDescription(skill.description ?? "");
  const classification = nameMatch ?? descriptionMatch;
  if (!classification) {
    unclassified.push(skill);
    continue;
  }
  const family = classification.family || skill.name;
  if (!grouped.has(family)) grouped.set(family, new Map());
  const columns = grouped.get(family);
  if (!columns.has(classification.code)) columns.set(classification.code, []);
  columns.get(classification.code).push(skill);
}

const rows = [...grouped.entries()].sort((left, right) => {
  const minimumId = (entry) => Math.min(...[...entry[1].values()].flat().map((skill) => Number(skill.skillId)));
  return minimumId(left) - minimumId(right) || left[0].localeCompare(right[0], "ja");
});
for (const [, columns] of rows) {
  for (const skills of columns.values()) {
    skills.sort((left, right) => Number(left.skillId) - Number(right.skillId));
  }
}
unclassified.sort((left, right) => Number(left.skillId) - Number(right.skillId));

const date = parseDateArgument();
const directlyConfirmed = nonAttackSkills.filter((skill) => statusMark(skill) === "✅").length;
const lines = [
  "# 属性別 weapon skill_id 収集状況（通常攻刃系以外）",
  "",
  "> ステータス: 下書き",
  `> 最終更新: ${date}`,
  "> 出典: ユーザー共有の属性別命名規則、計算用武器スキルカタログ、既存の実機由来武器ナレッジ",
  "",
  "## 対象と凡例",
  "",
  "既存の[通常攻刃系 weapon skill_id 収集状況](./weapon-skill-id-collection.md)に掲載済みのIDは除外し、それ以外のカタログ登録済みスキルを対象とする。方陣・EX・特殊条件など、既存表が対象外としている攻撃力上昇スキルは本表に残す。",
  "",
  "- `✅`: ゲーム内レスポンスまたは実機由来資料で skill_id・名称・効果文を確認。効果量の検証済みを意味しない。",
  "- `△`: 既存ナレッジまたは公開Wiki由来。今回の収集原本では未確認。",
  "- `—`: 現在のカタログに該当するスキルがない。番号は推定しない。",
  `- 対象 ${nonAttackSkills.length}件のうち、属性分類 ${nonAttackSkills.length - unclassified.length}件、属性横断・属性判定外 ${unclassified.length}件、実機由来 ${directlyConfirmed}件。`,
  "",
  "## 属性判定に使う命名規則",
  "",
  "名称による判定を優先し、名称だけで判定できない場合に限り、効果文に明記された単一属性を補助的に使う。接頭辞・接尾辞は分類の手掛かりであり、未収集IDを推定する根拠にはしない。",
  "",
  "| 属性 | 名称パターン |",
  "| --- | --- |",
  ...attributeRules.map(
    (rule) => `| ${rule.label} | ${rule.displayPatterns.map((pattern) => `\`${pattern}\``).join(" / ")} |`,
  ),
  "",
  "## 属性別一覧",
  "",
  "同じ系列名へ正規化できたスキルを1行へまとめる。セルにはゲーム内名称と skill_id を併記する。",
  "",
  "| 系列 | 火 | 水 | 土 | 風 | 光 | 闇 |",
  "| --- | --- | --- | --- | --- | --- | --- |",
];

for (const [family, columns] of rows) {
  const cells = attributeRules.map((rule) => {
    const skills = columns.get(rule.code) ?? [];
    if (skills.length === 0) return "—";
    return skills
      .map((skill) => `${statusMark(skill)} ${escapeCell(skill.name)} \`${skill.skillId}\``)
      .join("<br>");
  });
  lines.push(`| ${escapeCell(family)} | ${cells.join(" | ")} |`);
}

lines.push(
  "",
  "## 属性横断・属性判定外",
  "",
  "名称規則にも効果文の単一属性にも一致しないスキル。無属性・全属性・自属性・主人公専用・選択式などを含むため、属性を推定せず別表に保持する。",
  "",
  "| skill_id | 名称 | 収集状況 |",
  "| ---: | --- | --- |",
  ...unclassified.map(
    (skill) => `| \`${skill.skillId}\` | ${escapeCell(skill.name)} | ${statusMark(skill)} |`,
  ),
  "",
  "## 更新方法",
  "",
  "```powershell",
  `node scripts/data-collection/generate-weapon-skill-id-collection.mjs --date ${date}`,
  "```",
  "",
  "新しい命名系列を確認した場合は、推定で既存系列へ寄せず、生成スクリプトの規則と本ファイルの出典を同時に更新する。",
  "",
  "## 未確認・要検証事項",
  "",
  "- `△`の実機武器詳細レスポンスによる再確認。",
  "- 属性横断・属性判定外にあるスキルのうち、属性固有だが名称・効果文だけでは判定できないものの整理。",
  "- 各スキルの効果量、SLv曲線、発動条件、計算枠、重複規則。",
  "",
);

await writeFile(outputPath, lines.join("\n"), "utf8");
console.log(`generated ${path.relative(repositoryRoot, outputPath)} (${rows.length} rows)`);
