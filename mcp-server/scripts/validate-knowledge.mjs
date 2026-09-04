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

for (const category of Object.keys(schemas)) validateFrontmatterCategory(category);
validateMechanics();
validateAbilityJson();

if (errors.length > 0) {
  console.error(`\nknowledge validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("knowledge validation passed");
}
