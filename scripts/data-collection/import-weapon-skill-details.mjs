import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const wikiCatalogPath = path.join(repositoryRoot, "knowledge/weapons/wiki-catalog.v1.json");
const weaponCatalogPath = path.join(repositoryRoot, "mcp-server/catalog/weapons.v1.json");
const skillCatalogPath = path.join(repositoryRoot, "mcp-server/catalog/weapon-skills.v1.json");
const skillKeys = ["skill1", "skill2", "skill3", "skill4"];

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/giu, "/")
    .replace(/<[^>]+>/gu, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function observedSkills(row) {
  return skillKeys.flatMap((sourceKey) => {
    const skill = row[sourceKey];
    if (!skill?.skill_id) return [];
    return [{
      sourceKey,
      skillId: String(skill.skill_id),
      name: normalizeText(skill.name),
      description: normalizeText(skill.comment),
    }];
  });
}

function relevantWeaponSnapshot(row) {
  return JSON.stringify({
    weaponId: String(row.master?.id ?? ""),
    name: normalizeText(row.master?.name),
    elementCode: String(row.master?.attribute ?? ""),
    weaponKindCode: String(row.master?.kind ?? ""),
    rarityCode: String(row.master?.rarity ?? ""),
    skills: observedSkills(row),
  });
}

function appendSource(source, addition) {
  if (!source) return addition;
  if (source.includes(addition)) return source;
  return `${source} ${addition}`;
}

function wikiListedSkills(entry) {
  return (entry?.skills ?? []).flatMap((skill) => {
    const stage = skill.upgraded?.name ? skill.upgraded : skill.initial;
    if (!stage?.name) return [];
    return [{
      sourceKey: `skill${skill.slot}`,
      name: stage.name,
      description: stage.description ?? "効果量・計算枠は要検証",
    }];
  });
}

function newWeaponFromWiki(row, wiki, date) {
  const points = wiki?.statPoints ?? [];
  const lastPoint = points.at(-1);
  const listedSkills = wikiListedSkills(wiki);
  return {
    weaponId: String(row.master.id),
    name: normalizeText(row.master.name),
    ...(wiki?.nameEn ? { nameEn: wiki.nameEn } : {}),
    elementCode: String(row.master.attribute),
    weaponKindCode: String(row.master.kind),
    rarityCode: String(row.master.rarity),
    ...(lastPoint ? {
      selectionDefaults: {
        level: lastPoint.level,
        ...(wiki?.uncaps?.maximum !== null && wiki?.uncaps?.maximum !== undefined
          ? { uncapLevel: wiki.uncaps.maximum }
          : {}),
        attack: lastPoint.attack,
        hp: lastPoint.hp,
      },
    } : {}),
    ...(points.length >= 2 ? { levelStats: { maximumLevel: lastPoint.level, points } } : {}),
    ...(wiki?.uncaps ? {
      uncaps: {
        ...wiki.uncaps,
        verificationStatus: "下書き",
        source: `gbf.wiki Cargo weaponsテーブル（${wikiCatalog.source.retrievedAt}取得）の上限解放範囲`,
      },
    } : {}),
    skillSlots: [],
    ...(listedSkills.length > 0 ? { listedSkills } : {}),
    verificationStatus: "下書き",
    source: `ゲーム内武器詳細レスポンス（${date}）で武器ID・名称・属性・スキルID/文を確認。武器種・上限解放境界ステータス等は既存の公開Wiki由来データのため要検証`,
    confirmedAt: date,
  };
}

const inputArgument = argumentValue("--input-dir");
if (!inputArgument) {
  console.error("usage: node scripts/data-collection/import-weapon-skill-details.mjs --input-dir <dir> [--date YYYY-MM-DD] [--apply]");
  process.exit(1);
}

const inputDirectory = path.resolve(repositoryRoot, inputArgument);
const date = argumentValue("--date") ?? new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const apply = process.argv.includes("--apply");
const files = (await readdir(inputDirectory)).filter((file) => file.endsWith(".json")).sort();
const rows = await Promise.all(
  files.map(async (file) => ({
    file,
    row: JSON.parse(await readFile(path.join(inputDirectory, file), "utf8")),
  })),
);

const uniqueRows = new Map();
const duplicateFiles = [];
for (const entry of rows) {
  const weaponId = String(entry.row.master?.id ?? "");
  if (!/^\d{10}$/u.test(weaponId)) throw new Error(`${entry.file}: invalid master.id`);
  const current = uniqueRows.get(weaponId);
  if (!current) {
    uniqueRows.set(weaponId, entry);
    continue;
  }
  if (relevantWeaponSnapshot(current.row) !== relevantWeaponSnapshot(entry.row)) {
    throw new Error(`${entry.file}: duplicate weapon ${weaponId} has different metadata or skills`);
  }
  duplicateFiles.push(entry.file);
}

const weaponCatalog = JSON.parse(await readFile(weaponCatalogPath, "utf8"));
const skillCatalog = JSON.parse(await readFile(skillCatalogPath, "utf8"));
const wikiCatalog = JSON.parse(await readFile(wikiCatalogPath, "utf8"));
const weaponsById = new Map(weaponCatalog.weapons.map((weapon) => [weapon.weaponId, weapon]));
const skillsById = new Map(skillCatalog.skills.map((skill) => [skill.skillId, skill]));
const wikiWeaponsById = new Map(
  wikiCatalog.weapons.filter((weapon) => weapon.weaponId).map((weapon) => [weapon.weaponId, weapon]),
);
const report = {
  files: files.length,
  duplicateFiles: duplicateFiles.length,
  uniqueWeapons: uniqueRows.size,
  addedWeapons: 0,
  updatedWeapons: 0,
  uniqueSkills: 0,
  addedSkills: 0,
  updatedSkills: 0,
  nameConflicts: [],
  weaponConflicts: [],
};
const observedSkillIds = new Set();
const addedSkillIds = new Set();
const updatedSkillIds = new Set();

for (const [weaponId, { file, row }] of uniqueRows) {
  const observed = {
    name: normalizeText(row.master?.name),
    elementCode: String(row.master?.attribute ?? ""),
    weaponKindCode: String(row.master?.kind ?? ""),
    rarityCode: String(row.master?.rarity ?? ""),
  };
  let weapon = weaponsById.get(weaponId);
  const weaponAlreadyExisted = weapon !== undefined;
  if (!weapon) {
    const wikiWeapon = wikiWeaponsById.get(weaponId);
    if (!wikiWeapon) {
      throw new Error(`${file}: weapon ${weaponId} is missing from weapons.v1.json and wiki-catalog.v1.json`);
    }
    weapon = newWeaponFromWiki(row, wikiWeapon, date);
    weaponsById.set(weaponId, weapon);
    report.addedWeapons += 1;
  }
  for (const key of Object.keys(observed)) {
    if (String(weapon[key]) !== observed[key]) {
      report.weaponConflicts.push({ file, weaponId, field: key, catalog: weapon[key], observed: observed[key] });
    }
  }

  const skills = observedSkills(row);
  weapon.skillSlots = skills.map(({ sourceKey, skillId }) => ({ sourceKey, skillId }));
  const detailSource = `ゲーム内武器詳細レスポンス（${date}）で武器ID・名称・属性・スキルID/文を確認。`;
  weapon.source = weapon.verificationStatus === "検証済み"
    ? appendSource(weapon.source, detailSource)
    : `${detailSource}武器種・上限解放境界ステータス等は既存の公開Wiki由来データのため要検証`;
  weapon.confirmedAt = date;
  if (weaponAlreadyExisted) report.updatedWeapons += 1;

  for (const observedSkill of skills) {
    observedSkillIds.add(observedSkill.skillId);
    const current = skillsById.get(observedSkill.skillId);
    if (!current) {
      skillsById.set(observedSkill.skillId, {
        skillId: observedSkill.skillId,
        name: observedSkill.name,
        description: observedSkill.description,
        effects: [],
        verificationStatus: "下書き",
        source: `ユーザー提供のゲーム内武器詳細レスポンス（${date}）。skill_id・名称・効果文を実機確認、効果量・計算枠は未検証`,
        confirmedAt: date,
      });
      addedSkillIds.add(observedSkill.skillId);
      continue;
    }
    if (current.name !== observedSkill.name) {
      report.nameConflicts.push({
        skillId: observedSkill.skillId,
        catalog: current.name,
        observed: observedSkill.name,
        file,
      });
      continue;
    }
    current.description = observedSkill.description;
    const detailSourceAddition = `武器詳細レスポンスで名称・効果文を再確認（${date}）。`;
    current.source = current.verificationStatus === "検証済み"
      ? appendSource(current.source, detailSourceAddition)
      : `ユーザー提供のゲーム内武器詳細レスポンス（${date}）。skill_id・名称・効果文を実機確認、効果量・計算枠は未検証`;
    current.confirmedAt = date;
    if (!addedSkillIds.has(observedSkill.skillId)) updatedSkillIds.add(observedSkill.skillId);
  }
}

report.uniqueSkills = observedSkillIds.size;
report.addedSkills = addedSkillIds.size;
report.updatedSkills = updatedSkillIds.size;
if (report.weaponConflicts.length > 0 || report.nameConflicts.length > 0) {
  console.error(JSON.stringify({ ...report, apply: false }, null, 2));
  process.exit(1);
}

if (apply) {
  weaponCatalog.weapons = [...weaponsById.values()].sort((left, right) => left.weaponId.localeCompare(right.weaponId));
  skillCatalog.skills = [...skillsById.values()].sort((left, right) => Number(left.skillId) - Number(right.skillId));
  await writeFile(weaponCatalogPath, `${JSON.stringify(weaponCatalog, null, 2)}\n`, "utf8");
  await writeFile(skillCatalogPath, `${JSON.stringify(skillCatalog, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({ ...report, apply }, null, 2));
