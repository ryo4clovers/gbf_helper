import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { z } from "zod";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..", "..");
const knowledgeRoot = path.join(repositoryRoot, "knowledge");

const statusSchema = z.enum(["未着手", "下書き", "検証済み"]);
const dateSchema = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()]);
const nonEmptyString = z.string().trim().min(1);

const schemas = {
  characters: z
    .object({
      id: nonEmptyString,
      name_jp: nonEmptyString,
      name_en: nonEmptyString,
      rarity: z.enum(["SSR", "SR", "R"]),
      element: z.enum(["火", "水", "土", "風", "光", "闇"]),
      has_ex_ability: z.boolean(),
      status: statusSchema,
      last_updated: dateSchema,
      source: nonEmptyString,
    })
    .passthrough(),
  summons: z
    .object({
      id: nonEmptyString,
      name_jp: nonEmptyString,
      name_en: nonEmptyString,
      rarity: z.enum(["SSR", "SR", "R"]),
      element: z.enum(["火", "水", "土", "風", "光", "闇", "無属性"]),
      status: statusSchema,
      last_updated: dateSchema,
      source: nonEmptyString,
    })
    .passthrough(),
  jobs: z
    .object({
      id: nonEmptyString,
      name_jp: nonEmptyString,
      name_en: nonEmptyString,
      status: statusSchema,
      last_updated: dateSchema,
      source: nonEmptyString,
    })
    .passthrough(),
  weapons: z
    .object({
      id: nonEmptyString,
      name_jp: nonEmptyString,
      name_en: z.string(),
      weapon_id: nonEmptyString,
      element: z.enum(["火", "水", "土", "風", "光", "闇", "無属性"]),
      rarity: z.enum(["SSR", "SR", "R"]),
      weapon_type: nonEmptyString,
      series: z.string(),
      status: statusSchema,
      last_updated: dateSchema,
      source: nonEmptyString,
    })
    .passthrough(),
};

const errors = [];

function knowledgeFiles(category) {
  const directory = path.join(knowledgeRoot, category);
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".md") && name !== "README.md" && !name.startsWith("_"))
    .sort();
}

function validateFrontmatterCategory(category) {
  const files = knowledgeFiles(category);
  const ids = new Set();

  for (const filename of files) {
    const filePath = path.join(knowledgeRoot, category, filename);
    const expectedId = path.basename(filename, ".md");
    const { data } = matter(fs.readFileSync(filePath, "utf8"));
    const result = schemas[category].safeParse(data);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${path.relative(repositoryRoot, filePath)}: ${issue.path.join(".") || "frontmatter"} ${issue.message}`);
      }
      continue;
    }

    if (result.data.id !== expectedId) {
      errors.push(`${path.relative(repositoryRoot, filePath)}: id must be "${expectedId}"`);
    }
    if (ids.has(result.data.id)) {
      errors.push(`${category}: duplicate id "${result.data.id}"`);
    }
    ids.add(result.data.id);
  }

  validateReadmeIndex(category, files);
  console.log(`validated ${category}: ${files.length} files`);
}

function validateReadmeIndex(category, files) {
  const readmePath = path.join(knowledgeRoot, category, "README.md");
  const readme = fs.readFileSync(readmePath, "utf8");
  const indexed = [...readme.matchAll(/\]\(\.\/([^)]+\.md)\)/g)]
    .map((match) => match[1])
    .filter((name) => name !== "_template.md")
    .sort();
  const indexedSet = new Set(indexed);

  for (const filename of files) {
    if (!indexedSet.has(filename)) {
      errors.push(`${path.relative(repositoryRoot, readmePath)}: missing index entry for ${filename}`);
    }
  }
  for (const filename of indexedSet) {
    if (!files.includes(filename)) {
      errors.push(`${path.relative(repositoryRoot, readmePath)}: index points to missing file ${filename}`);
    }
  }
  if (indexed.length !== indexedSet.size) {
    errors.push(`${path.relative(repositoryRoot, readmePath)}: duplicate index entries found`);
  }
}

function validateMechanics() {
  const files = knowledgeFiles("mechanics");
  for (const filename of files) {
    const filePath = path.join(knowledgeRoot, "mechanics", filename);
    const raw = fs.readFileSync(filePath, "utf8");
    const status = raw.match(/^>\s*ステータス:\s*(.+)$/m)?.[1]?.trim();
    const lastUpdated = raw.match(/^>\s*最終更新:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1];
    const source = raw.match(/^>\s*出典:\s*(.+)$/m)?.[1]?.trim();
    if (!statusSchema.safeParse(status).success) errors.push(`knowledge/mechanics/${filename}: invalid or missing status`);
    if (!lastUpdated) errors.push(`knowledge/mechanics/${filename}: invalid or missing last updated date`);
    if (!source) errors.push(`knowledge/mechanics/${filename}: missing source`);
  }
  console.log(`validated mechanics: ${files.length} files`);
}

function validateAbilityJson() {
  const expectations = {
    "ability-effects.json": ["_meta", "abilities"],
    "free-slot-candidates.json": ["_meta", "abilities", "jobs"],
    "status-effects.json": ["_meta", "status_effects"],
  };

  for (const [filename, requiredKeys] of Object.entries(expectations)) {
    const filePath = path.join(knowledgeRoot, "abilities", filename);
    let value;
    try {
      value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      errors.push(`knowledge/abilities/${filename}: invalid JSON (${error.message})`);
      continue;
    }
    for (const key of requiredKeys) {
      if (!value[key] || typeof value[key] !== "object" || Array.isArray(value[key])) {
        errors.push(`knowledge/abilities/${filename}: ${key} must be an object`);
      }
    }
  }
  console.log(`validated abilities: ${Object.keys(expectations).length} JSON files`);
}

function validateWeaponWikiCatalog() {
  const relativePath = "knowledge/weapons/wiki-catalog.v1.json";
  const filePath = path.join(repositoryRoot, relativePath);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON (${error.message})`);
    return;
  }
  if (value.schemaVersion !== 1) errors.push(`${relativePath}: schemaVersion must be 1`);
  if (!value.source || value.source.rowCount !== value.weapons?.length) {
    errors.push(`${relativePath}: source.rowCount must match weapons length`);
  }
  if (!Array.isArray(value.weapons)) {
    errors.push(`${relativePath}: weapons must be an array`);
    return;
  }
  const wikiKeys = new Set();
  const weaponIds = new Set();
  for (const [index, weapon] of value.weapons.entries()) {
    const label = `${relativePath}: weapons[${index}]`;
    if (typeof weapon.wikiKey !== "string" || !weapon.wikiKey) errors.push(`${label}.wikiKey must be a non-empty string`);
    if (wikiKeys.has(weapon.wikiKey)) errors.push(`${label}: duplicate wikiKey ${weapon.wikiKey}`);
    wikiKeys.add(weapon.wikiKey);
    if (weapon.weaponId !== null) {
      if (typeof weapon.weaponId !== "string" || !/^\d{10}$/u.test(weapon.weaponId)) {
        errors.push(`${label}.weaponId must be a 10-digit string or null`);
      }
      if (weaponIds.has(weapon.weaponId)) errors.push(`${label}: duplicate weaponId ${weapon.weaponId}`);
      weaponIds.add(weapon.weaponId);
    }
    if (typeof weapon.nameEn !== "string" || !weapon.nameEn) errors.push(`${label}.nameEn must be a non-empty string`);
    if (!Array.isArray(weapon.statPoints) || !Array.isArray(weapon.skills) || !Array.isArray(weapon.chargeAttacks)) {
      errors.push(`${label}: statPoints, skills, and chargeAttacks must be arrays`);
    }
  }
  console.log(`validated weapon wiki catalog: ${value.weapons.length} rows (${weaponIds.size} master IDs)`);
}

function validateWeaponGameWithCatalog() {
  const relativePath = "knowledge/weapons/gamewith-catalog.v1.json";
  const filePath = path.join(repositoryRoot, relativePath);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON (${error.message})`);
    return;
  }
  if (value.schemaVersion !== 1) errors.push(`${relativePath}: schemaVersion must be 1`);
  if (!Array.isArray(value.weapons)) {
    errors.push(`${relativePath}: weapons must be an array`);
    return;
  }
  if (value.source?.rowCount !== value.weapons.length || value.summary?.total !== value.weapons.length) {
    errors.push(`${relativePath}: source.rowCount and summary.total must match weapons length`);
  }
  const articleIds = new Set();
  for (const [index, weapon] of value.weapons.entries()) {
    const label = `${relativePath}: weapons[${index}]`;
    if (typeof weapon.nameJp !== "string" || !weapon.nameJp) errors.push(`${label}.nameJp must be non-empty`);
    if (typeof weapon.articleId !== "string" || !/^\d+$/u.test(weapon.articleId)) {
      errors.push(`${label}.articleId must be a numeric string`);
    }
    articleIds.add(weapon.articleId);
    if (!weapon.wikiMatch || !["matched", "ambiguous", "unmatched"].includes(weapon.wikiMatch.status)) {
      errors.push(`${label}.wikiMatch.status is invalid`);
    }
    if (weapon.wikiMatch?.status === "matched" && !/^\d{10}$/u.test(weapon.wikiMatch.weaponId ?? "")) {
      errors.push(`${label}.wikiMatch.weaponId must be a 10-digit string when matched`);
    }
  }
  console.log(`validated weapon GameWith catalog: ${value.weapons.length} rows (${articleIds.size} articles)`);
}

for (const category of Object.keys(schemas)) validateFrontmatterCategory(category);
validateMechanics();
validateAbilityJson();
validateWeaponWikiCatalog();
validateWeaponGameWithCatalog();

if (errors.length > 0) {
  console.error(`\nknowledge validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("knowledge validation passed");
}
