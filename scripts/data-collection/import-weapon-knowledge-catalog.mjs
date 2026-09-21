import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const KNOWLEDGE_DIR = join(ROOT, "knowledge", "weapons");
const WEAPONS_CATALOG = join(ROOT, "mcp-server", "catalog", "weapons.v1.json");
const SKILLS_CATALOG = join(ROOT, "mcp-server", "catalog", "weapon-skills.v1.json");
const APPLY = process.argv.includes("--apply");
const SKILL_LEVEL_CAPS_ONLY = process.argv.includes("--skill-level-caps-only");
const wikiListIndex = process.argv.indexOf("--wiki-list");
const wikiListPath = wikiListIndex >= 0 ? resolve(process.argv[wikiListIndex + 1]) : undefined;
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const ELEMENT_CODES = new Map([
  ["火", "1"],
  ["水", "2"],
  ["土", "3"],
  ["風", "4"],
  ["光", "5"],
  ["闇", "6"],
]);
const WEAPON_KIND_CODES = new Map([
  ["剣", "1"],
  ["短剣", "2"],
  ["槍", "3"],
  ["斧", "4"],
  ["杖", "5"],
  ["銃", "6"],
  ["格闘", "7"],
  ["弓", "8"],
  ["楽器", "9"],
  ["刀", "10"],
]);
const RARITY_CODES = new Map([
  ["N", "1"],
  ["R", "2"],
  ["SR", "3"],
  ["SSR", "4"],
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function frontmatter(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";
  const values = new Map();
  for (const line of block.split(/\r?\n/u)) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    }
    values.set(match[1], value);
  }
  return values;
}

function parseWikiList(text) {
  const entries = new Map();
  const pattern = /Weapon_m_(\d{10})\.jpg[^\n]*?\]\(http:\/\/gbf\.wiki\/([^ )]+) "([^"]+)"\)\[\3\][\s\S]*?Icon_Element_([A-Za-z]+)[\s\S]*?Label_Weapon_([A-Za-z]+)\.png[^\n]*?\)(\d+) (\d+)!/gu;
  for (const match of text.matchAll(pattern)) {
    entries.set(match[1], {
      weaponId: match[1],
      slug: match[2],
      nameEn: match[3],
      maximumAttack: Number(match[6]),
      maximumHp: Number(match[7]),
    });
  }
  return entries;
}

function plainText(value) {
  return value
    .replace(/<!--.*?-->/gu, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/gu, "$1")
    .replace(/[`*]/gu, "")
    .trim();
}

function parseSkills(text) {
  const headings = [...text.matchAll(/^### スキル([1-4]):\s*(.+)$/gmu)];
  return headings.flatMap((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? text.indexOf("\n## ", start);
    const section = text.slice(start, end < 0 ? text.length : end);
    const skillId = section.match(/^- skill_id:\s*`?([^`\s]+)`?/mu)?.[1];
    if (!skillId || /^(?:要検証|なし|null)$/iu.test(skillId)) return [];
    const description = section.match(/^- 効果(?:\([^)]*\))?:\s*(.+)$/mu)?.[1]
      ?? section.match(/^- 効果:\s*(.+)$/mu)?.[1]
      ?? "効果量・計算枠は要検証";
    return [{
      sourceKey: `skill${heading[1]}`,
      skillId,
      name: plainText(heading[2]),
      description: plainText(description),
    }];
  });
}

function parseSelectionDefaults(text) {
  const uncap = text.match(/\| 上限解放段階 \|\s*(\d+)/u)?.[1];
  const skillLevel = text.match(/\| スキルレベル上限 \|\s*(\d+)/u)?.[1];
  const maximumLevel = Number(text.match(/\| 最大レベル \|[^\d]*(\d+)/u)?.[1]);
  const maximumPoint = maximumLevel
    ? [...text.matchAll(/^\|[^\n|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gmu)]
      .map((match) => ({ level: Number(match[1]), hp: Number(match[2]), attack: Number(match[3]) }))
      .find(({ level }) => level === maximumLevel)
    : undefined;
  if (!uncap && !skillLevel && !maximumPoint) return undefined;
  return {
    ...(maximumPoint ? maximumPoint : {}),
    ...(uncap ? { uncapLevel: Number(uncap) } : {}),
    ...(skillLevel ? { skillLevel: Number(skillLevel) } : {}),
  };
}

function parseSkillLevelCap(text, file, status) {
  const maximum = Number(text.match(/\| スキルレベル上限 \|\s*(\d+)/u)?.[1]);
  if (!Number.isInteger(maximum) || maximum < 1) return undefined;
  return {
    maximum,
    verificationStatus: status === "検証済み" ? "検証済み" : "下書き",
    source: `knowledge/${file}「スキルレベル上限」`,
  };
}

function parseLevelStats(text) {
  const maximumLevel = Number(text.match(/\| 最大レベル \|[^\d]*(\d+)/u)?.[1]);
  if (!maximumLevel) return undefined;
  const points = [];
  for (const match of text.matchAll(/^\|[^\n|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gmu)) {
    const point = { level: Number(match[1]), hp: Number(match[2]), attack: Number(match[3]) };
    if (!points.some(({ level }) => level === point.level)) points.push(point);
  }
  points.sort((left, right) => left.level - right.level);
  if (points.length < 2 || points.at(-1)?.level !== maximumLevel) return undefined;
  return { maximumLevel, points };
}

function maximumStatsComparison(text, wiki) {
  const maximumLevel = Number(text.match(/\| 最大レベル \|[^\d]*(\d+)/u)?.[1]);
  if (!maximumLevel) return "unavailable";
  const rowPattern = /^\|[^\n|]*\|\s*(\d+)\s*\|\s*(\d+)(?:〜\d+)?\s*\|\s*(\d+)(?:〜\d+)?\s*\|/gmu;
  const point = [...text.matchAll(rowPattern)]
    .map((match) => ({ level: Number(match[1]), hp: Number(match[2]), attack: Number(match[3]) }))
    .find(({ level }) => level === maximumLevel);
  if (!point) return "unavailable";
  return point.hp === wiki.maximumHp && point.attack === wiki.maximumAttack ? "matched" : "different";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function updateWikiFrontmatter(text, wiki) {
  let result = text;
  const values = frontmatter(result);
  if (!values.get("name_en")) {
    result = result.replace(/^name_en:\s*""$/mu, `name_en: ${JSON.stringify(wiki.nameEn)}`);
  }
  const source = String(frontmatter(result).get("source") ?? "");
  const wikiUrl = `https://gbf.wiki/${wiki.slug}`;
  const comparison = maximumStatsComparison(result, wiki);
  const comparisonNote = comparison === "matched"
    ? "最終HP/ATKの一致を確認"
    : comparison === "different"
      ? "同IDの一覧値と実機値に差異あり。強化形態等を要検証"
      : "ID・英語名を照合。最終HP/ATKは要検証";
  const addition = `gbf.wiki「${wiki.nameEn}」(${wikiUrl}、${TODAY}参照。${comparisonNote})`;
  const existingWikiNote = new RegExp(`gbf\\.wiki「[^」]+」\\(${escapeRegExp(wikiUrl)}、\\d{4}-\\d{2}-\\d{2}参照\\。[^)]*\\)`);
  const nextSource = existingWikiNote.test(source)
    ? source.replace(existingWikiNote, addition)
    : source
      ? `${source} ${addition}`
      : addition;
  result = result.replace(/^source:\s*.*$/mu, `source: ${JSON.stringify(nextSource)}`);
  result = result.replace(/^last_updated:\s*\d{4}-\d{2}-\d{2}$/mu, `last_updated: ${TODAY}`);
  return { text: result, comparison };
}

const wikiEntries = wikiListPath ? parseWikiList(readFileSync(wikiListPath, "utf8")) : new Map();
const weaponCatalog = readJson(WEAPONS_CATALOG);
const skillCatalog = readJson(SKILLS_CATALOG);
const weaponsById = new Map(weaponCatalog.weapons.map((weapon) => [weapon.weaponId, weapon]));
const skillsById = new Map(skillCatalog.skills.map((skill) => [skill.skillId, skill]));
const report = {
  knowledgeFiles: 0,
  wikiListEntries: wikiEntries.size,
  wikiMatches: 0,
  wikiNamesAdded: 0,
  wikiStatsMatched: 0,
  wikiStatsDifferent: [],
  wikiStatsUnavailable: 0,
  weaponsAdded: 0,
  skillsAdded: 0,
  missingMetadata: [],
  skillConflicts: [],
};

for (const file of readdirSync(KNOWLEDGE_DIR).filter((name) => name.endsWith(".md") && !["README.md", "_template.md"].includes(name))) {
  const path = join(KNOWLEDGE_DIR, file);
  let text = readFileSync(path, "utf8");
  let values = frontmatter(text);
  report.knowledgeFiles += 1;
  const weaponId = String(values.get("weapon_id") ?? "");
  const wiki = wikiEntries.get(weaponId);
  let wikiComparison;
  if (wiki) {
    report.wikiMatches += 1;
    if (!values.get("name_en")) report.wikiNamesAdded += 1;
    const updated = updateWikiFrontmatter(text, wiki);
    wikiComparison = updated.comparison;
    if (updated.comparison === "matched") report.wikiStatsMatched += 1;
    if (updated.comparison === "different") report.wikiStatsDifferent.push(file);
    if (updated.comparison === "unavailable") report.wikiStatsUnavailable += 1;
    if (APPLY && updated.text !== text) writeFileSync(path, updated.text, "utf8");
    text = updated.text;
    values = frontmatter(text);
  }

  const name = String(values.get("name_jp") ?? "");
  const elementCode = ELEMENT_CODES.get(String(values.get("element") ?? ""));
  const weaponKindCode = WEAPON_KIND_CODES.get(String(values.get("weapon_type") ?? ""));
  const rarityCode = RARITY_CODES.get(String(values.get("rarity") ?? ""));
  if (!weaponId || !name || !elementCode || !weaponKindCode || !rarityCode) {
    report.missingMetadata.push(basename(path));
    continue;
  }

  const skillLevelCap = parseSkillLevelCap(text, file, values.get("status"));
  if (SKILL_LEVEL_CAPS_ONLY) {
    const current = weaponsById.get(weaponId);
    if (current && skillLevelCap) current.skillLevelCap = skillLevelCap;
    continue;
  }

  const parsedSkills = parseSkills(text);
  for (const parsed of parsedSkills) {
    const current = skillsById.get(parsed.skillId);
    if (!current) {
      skillsById.set(parsed.skillId, {
        skillId: parsed.skillId,
        name: parsed.name,
        description: parsed.description,
        effects: [],
        verificationStatus: "下書き",
        source: wiki
          ? `knowledge/${file}およびgbf.wiki (${TODAY}照合)。効果量・計算枠は未検証`
          : `knowledge/${file}。効果量・計算枠は未検証`,
      });
      report.skillsAdded += 1;
    } else if (current.name !== parsed.name && current.description !== parsed.description) {
      report.skillConflicts.push({ skillId: parsed.skillId, existing: current.name, incoming: parsed.name, file });
    }
    if (current?.verificationStatus === "下書き" && current.source.startsWith("knowledge/")) {
      current.source = current.source.replace(/\d{4}-\d{2}-\d{2}(?=照合)/u, TODAY);
    }
  }

  if (!weaponsById.has(weaponId)) {
    const seriesId = text.match(/`series_id`\s*=\s*(\d+)/u)?.[1];
    const levelStats = parseLevelStats(text);
    weaponsById.set(weaponId, {
      weaponId,
      name,
      elementCode,
      weaponKindCode,
      rarityCode,
      ...(seriesId ? { seriesId } : {}),
      ...(parseSelectionDefaults(text) ? { selectionDefaults: parseSelectionDefaults(text) } : {}),
      ...(levelStats ? { levelStats } : {}),
      ...(skillLevelCap ? { skillLevelCap } : {}),
      skillSlots: parsedSkills.map(({ sourceKey, skillId }) => ({ sourceKey, skillId })),
      verificationStatus: "下書き",
      source: wiki
        ? `実機由来knowledge/${file}とgbf.wiki「${wiki.nameEn}」を${TODAY}に${wikiComparison === "matched" ? "ID・最終HP/ATKの一致確認" : "ID照合（一覧値と実機値の差異は要検証）"}。効果量は未検証`
        : `実機由来knowledge/${file}。効果量は未検証`,
    });
    report.weaponsAdded += 1;
  } else {
    const current = weaponsById.get(weaponId);
    if (current && skillLevelCap) current.skillLevelCap = skillLevelCap;
    if (current?.verificationStatus === "下書き" && current.source.startsWith("実機由来knowledge/")) {
      current.selectionDefaults = parseSelectionDefaults(text);
      current.levelStats = parseLevelStats(text);
      current.source = wiki
        ? `実機由来knowledge/${file}とgbf.wiki「${wiki.nameEn}」を${TODAY}に${wikiComparison === "matched" ? "ID・最終HP/ATKの一致確認" : "ID照合（一覧値と実機値の差異は要検証）"}。効果量は未検証`
        : `実機由来knowledge/${file}。効果量は未検証`;
    }
  }
}

if (APPLY) {
  weaponCatalog.weapons = [...weaponsById.values()].sort((left, right) => left.weaponId.localeCompare(right.weaponId));
  skillCatalog.skills = [...skillsById.values()].sort((left, right) => Number(left.skillId) - Number(right.skillId));
  writeFileSync(WEAPONS_CATALOG, `${JSON.stringify(weaponCatalog, null, 2)}\n`, "utf8");
  writeFileSync(SKILLS_CATALOG, `${JSON.stringify(skillCatalog, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  ...report,
  apply: APPLY,
  skillLevelCapsOnly: SKILL_LEVEL_CAPS_ONLY,
  totalWeapons: weaponsById.size,
  totalSkills: skillsById.size,
}, null, 2));
