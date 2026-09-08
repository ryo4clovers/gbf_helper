import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const draftRoot = path.resolve(root, "draft", "召喚石");
const knowledgeRoot = path.resolve(root, "knowledge", "summons");
const catalogPath = path.resolve(root, "mcp-server", "catalog", "summons.v1.json");
const captureRoot = path.resolve(root, "tools", "network-recorder", "captures", "summons");
const apply = process.argv.includes("--apply");
const today = "2026-09-09";

const elementNames = { "1": "火", "2": "水", "3": "土", "4": "風", "5": "光", "6": "闇" };
const rarityNames = { "2": "R", "3": "SR", "4": "SSR" };
const manualKnowledgeFiles = {
  "2040336000": "wind-ssr-rose-queen-summer.md",
  "2040388000": "dark-ssr-sariel-christmas.md",
};

function walkJson(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walkJson(target) : entry.name.endsWith(".json") ? [target] : [];
  });
}

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"))?.[1]?.replace(/["']$/, "") ?? "";
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/水着|浴衣|クリスマス|holiday|summer|yukata/g, "")
    .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]/g, "");
}

function seasonalKind(file) {
  if (file.includes(`${path.sep}水着シリーズ${path.sep}`)) return "summer";
  if (file.includes(`${path.sep}クリスマスシリーズ${path.sep}`)) return "christmas";
  return "normal";
}

function parseKnowledgeFiles() {
  return fs.readdirSync(knowledgeRoot)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => {
      const markdown = fs.readFileSync(path.join(knowledgeRoot, file), "utf8");
      return {
        file,
        markdown,
        nameJp: frontmatterValue(markdown, "name_jp"),
        nameEn: frontmatterValue(markdown, "name_en"),
        rarity: frontmatterValue(markdown, "rarity"),
        element: frontmatterValue(markdown, "element"),
      };
    });
}

function chooseKnowledgeFile(row, documents) {
  const manual = manualKnowledgeFiles[row.master.id];
  if (manual) return documents.find((document) => document.file === manual);
  const kind = seasonalKind(row.file);
  const candidates = documents.filter((document) => {
    if (document.rarity !== rarityNames[row.master.rarity] || document.element !== elementNames[row.master.attribute]) return false;
    if (kind === "summer" && !document.file.endsWith("-summer.md")) return false;
    if (kind === "christmas" && !document.file.endsWith("-christmas.md")) return false;
    if (kind === "normal" && /-(summer|christmas|yukata|halloween|valentine)\.md$/.test(document.file)) return false;
    return normalize(document.nameJp) === normalize(row.master.name)
      || normalize(document.nameEn) === normalize(row.master.name_en);
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

function richest(left, right) {
  const score = (row) => Number(row.param.evolution ?? 0) * 1000 + Number(row.param.level ?? 0);
  return score(right) > score(left) ? right : left;
}

function compactText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<[^>]+>/g, "")
    .replace(/\r?\n/g, " / ")
    .trim() || "記載なし";
}

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\([^)]*(Summer|Holiday|Christmas|Yukata)[^)]*\)/gi, "")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function displayName(row) {
  const kind = seasonalKind(row.file);
  if (kind === "summer" && !row.master.name.startsWith("水着")) return `水着${row.master.name}`;
  if (kind === "christmas" && !row.master.name.includes("クリスマス")) return `${row.master.name}(クリスマス)`;
  return row.master.name;
}

function newKnowledgeFile(row) {
  const element = Object.entries(elementNames).find(([, name]) => name === elementNames[row.master.attribute])?.[0];
  const elementSlug = { "1": "fire", "2": "water", "3": "earth", "4": "wind", "5": "light", "6": "dark" }[element];
  const raritySlug = rarityNames[row.master.rarity].toLowerCase();
  const kind = seasonalKind(row.file);
  const baseSlug = slug(row.master.name_en) || String(row.master.id);
  return `${elementSlug}-${raritySlug}-${baseSlug}-${kind}.md`;
}

function renderNewKnowledge(row, file) {
  const nameJp = displayName(row);
  const nameEn = row.master.name_en || row.master.name;
  const stats = levelStats(row.master)?.points ?? [];
  const statsRows = stats.map((point) => `| Lv${point.level}(${point.uncapLevel}凸) | ${point.hp} | ${point.attack} |`).join("\n");
  const yaml = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `---
id: "${file.replace(/\.md$/, "")}"
name_jp: "${yaml(nameJp)}"
name_en: "${yaml(nameEn)}"
rarity: ${rarityNames[row.master.rarity]}
element: "${elementNames[row.master.attribute]}"
obtain: "要検証（ユーザー提供の所持データで存在確認）"
status: 下書き
last_updated: ${today}
source: "ユーザー提供のゲーム内所持召喚石詳細レスポンス（確認日: ${today}）"
---

# ${nameJp}(${nameEn})

## 概要

${elementNames[row.master.attribute]}属性の${rarityNames[row.master.rarity]}召喚石。入手方法と未確認の上限解放段階は要検証。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | ${rarityNames[row.master.rarity]} |
| 属性 | ${elementNames[row.master.attribute]} |
| 入手方法 | 要検証 |
| マスターID | \`${row.master.id}\` |

## ステータス

| レベル | HP | ATK |
| --- | --- | --- |
${statsRows}

## 召喚効果

- 現在確認できた効果: ${compactText(row.special_skill?.comment)}
- 出典: ユーザー提供のゲーム内所持召喚石詳細レスポンス
- ステータス: 実機確認済み（Lv${row.param.level} / ${row.param.evolution}凸時点）

## 加護効果(メイン編成時)

- 現在確認できた効果: ${compactText(row.skill?.comment)}
- 出典: ユーザー提供のゲーム内所持召喚石詳細レスポンス
- ステータス: 実機確認済み（Lv${row.param.level} / ${row.param.evolution}凸時点）

## サブ加護効果(サブ編成時)

- 現在確認できた効果: ${compactText(row.sub_skill?.comment)}
- 出典: ユーザー提供のゲーム内所持召喚石詳細レスポンス
- ステータス: 実機確認済み（Lv${row.param.level} / ${row.param.evolution}凸時点）

## 実機所持データ確認

- 確認日: ${today}
- 確認段階: Lv${row.param.level} / ${row.param.evolution}凸
- 表示ステータス: HP ${row.param.hp} / ATK ${row.param.attack}
- 出典: ユーザー提供のゲーム内所持召喚石詳細レスポンス

## 関連トピック

- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)

## 未確認・要検証事項

- 入手方法。
- 実機で所持していない上限解放段階の召喚効果・加護効果・サブ加護効果。
- ステータス境界はマスターデータ由来。各中間Lvの成長式は未検証。
`;
}

function levelStats(master) {
  const points = [];
  const add = (level, uncapLevel, attack, hp) => {
    const numericAttack = Number(attack);
    const numericHp = Number(hp);
    if (numericAttack > 0 && numericHp > 0) points.push({ level, uncapLevel, attack: numericAttack, hp: numericHp });
  };
  add(1, 0, master.default_attack, master.default_hp);
  add(Number(master.max_level), Number(master.max_evolution_num), master.max_attack, master.max_hp);
  add(150, 4, master.max_attack_2, master.max_hp_2);
  add(200, 5, master.max_attack_3, master.max_hp_3);
  add(250, 6, master.max_attack_4, master.max_hp_4);
  const unique = [...new Map(points.map((point) => [point.level, point])).values()].sort((a, b) => a.level - b.level);
  return unique.length ? { maximumLevel: unique.at(-1).level, points: unique } : undefined;
}

function updateKnowledge(document, row) {
  let markdown = document.markdown;
  const masterIdRow = `| マスターID | \`${row.master.id}\` |`;
  if (!markdown.includes("| マスターID |")) {
    markdown = markdown.replace(/(\| 入手方法 \|[^\n]*\|)/, `$1\n${masterIdRow}`);
  }
  const marker = "## 実機所持データ確認";
  const block = `${marker}\n\n- 確認日: ${today}\n- 確認段階: Lv${row.param.level} / ${row.param.evolution}凸\n- 表示ステータス: HP ${row.param.hp} / ATK ${row.param.attack}\n- 召喚効果: ${compactText(row.special_skill?.comment)}\n- 加護効果: ${compactText(row.skill?.comment)}\n- サブ加護効果: ${compactText(row.sub_skill?.comment)}\n- 出典: ユーザー提供のゲーム内所持召喚石詳細レスポンス\n\n`;
  if (markdown.includes(marker)) {
    markdown = markdown.replace(/## 実機所持データ確認[\s\S]*?(?=## 関連トピック)/, block);
  } else {
    markdown = markdown.replace("## 関連トピック", `${block}## 関連トピック`);
  }
  markdown = markdown.replace(/^last_updated:.*$/m, `last_updated: ${today}`);
  return markdown;
}

function catalogEntry(row) {
  const mainAura = compactText(row.skill?.comment);
  const subAura = compactText(row.sub_skill?.comment);
  const auraDescription = subAura === "記載なし" ? mainAura : `${mainAura} / サブ加護: ${subAura}`;
  const stats = levelStats(row.master);
  return {
    summonId: String(row.master.id),
    name: displayName(row),
    elementCode: String(row.master.attribute),
    rarityCode: String(row.master.rarity),
    auraName: row.skill?.name || `${row.master.name}の加護`,
    auraDescription,
    auraEffects: [{ kind: "utility", description: `効果文は確認済み。数値計算への構造化は未対応: ${auraDescription}` }],
    verificationStatus: "下書き",
    supportSelectable: String(row.master.no_supporter_flag ?? "0") !== "1",
    source: "ユーザー提供のゲーム内所持召喚石詳細レスポンスでマスター情報と現在の効果文を確認",
    confirmedAt: today,
    ...(stats ? { levelStats: stats } : {}),
    selectionDefaults: {
      level: Number(row.param.level),
      uncapLevel: Number(row.param.evolution),
      plusMark: Number(row.param.quality ?? 0),
      attack: Number(row.param.attack),
      hp: Number(row.param.hp),
    },
  };
}

const files = walkJson(draftRoot);
const rows = files.map((file) => {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return { file, master: json.master, param: json.param, skill: json.skill, special_skill: json.special_skill, sub_skill: json.sub_skill };
});
const uniqueRows = [...rows.reduce((map, row) => map.set(String(row.master.id), map.has(String(row.master.id)) ? richest(map.get(String(row.master.id)), row) : row), new Map()).values()];
const documents = parseKnowledgeFiles();
const matches = uniqueRows.map((row) => ({ row, document: chooseKnowledgeFile(row, documents) }));
const unmatched = matches.filter((match) => !match.document);

console.log(JSON.stringify({ files: files.length, uniqueSummons: uniqueRows.length, matchedKnowledge: matches.length - unmatched.length, unmatched: unmatched.map(({ row }) => ({ id: row.master.id, name: row.master.name, series: path.basename(path.dirname(row.file)) })) }, null, 2));
if (!apply) process.exit(0);

const newDocuments = [];
for (const { row, document } of matches) {
  if (document) {
    fs.writeFileSync(path.join(knowledgeRoot, document.file), updateKnowledge(document, row));
    continue;
  }
  const file = newKnowledgeFile(row);
  const target = path.join(knowledgeRoot, file);
  if (fs.existsSync(target)) throw new Error(`生成先が既に存在しますす: ${file}`);
  fs.writeFileSync(target, renderNewKnowledge(row, file));
  newDocuments.push({ file, row });
}

if (newDocuments.length) {
  const readmePath = path.join(knowledgeRoot, "README.md");
  let readme = fs.readFileSync(readmePath, "utf8");
  const rows = newDocuments.map(({ file, row }) =>
    `| [${file}](./${file}) | ${displayName(row)} / ${row.master.name_en || row.master.name} | ${rarityNames[row.master.rarity]} | ${elementNames[row.master.attribute]} | 下書き |`,
  ).join("\n");
  readme = readme.replace("\n## 運用ルール", `\n${rows}\n\n## 運用ルール`);
  fs.writeFileSync(readmePath, readme);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const byId = new Map(catalog.summons.map((summon) => [summon.summonId, summon]));
for (const row of uniqueRows) {
  const entry = catalogEntry(row);
  const existing = byId.get(entry.summonId);
  byId.set(entry.summonId, existing
    ? { ...entry, ...existing, levelStats: entry.levelStats ?? existing.levelStats, selectionDefaults: entry.selectionDefaults }
    : entry);
}
catalog.summons = [...byId.values()].sort((left, right) => left.summonId.localeCompare(right.summonId));
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

fs.mkdirSync(captureRoot, { recursive: true });
for (const row of rows) {
  const suffix = path.basename(row.file).replace(/\.json$/i, "").replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龠]+/g, "-");
  const target = path.join(captureRoot, `${today}_summon-detail_${row.master.id}_${suffix}.json`);
  fs.copyFileSync(row.file, target);
}
for (const file of files) fs.rmSync(file);
console.log(`applied: knowledgeUpdated=${matches.length - unmatched.length}, knowledgeCreated=${newDocuments.length}, catalog=${uniqueRows.length}, captures=${rows.length}, removedDraft=${files.length}`);
