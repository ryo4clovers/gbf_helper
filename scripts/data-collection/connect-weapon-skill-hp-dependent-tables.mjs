import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const skillCatalogPath = path.join(repositoryRoot, "mcp-server/catalog/weapon-skills.v1.json");
const weaponCatalogPath = path.join(repositoryRoot, "mcp-server/catalog/weapons.v1.json");
const tablePath = path.join(
  repositoryRoot,
  "mcp-server/catalog/weapon-skill-hp-dependent-attack-tables.v1.json",
);

const source = "GameWith・神ゲー攻略の効果量表とHP依存式（2026-09-13閲覧）。二次情報のため要検証";
const skillLevelCoefficient = (level) => level <= 15 ? level : 15 + (level - 15) * 0.4;
const staminaValues = (coefficient, maximumSkillLevel = 20) => Array.from({ length: maximumSkillLevel }, (_, index) => {
  const skillLevel = index + 1;
  return {
    skillLevel,
    amountPercent: Math.round(((2.1 + (100 / (coefficient - skillLevelCoefficient(skillLevel))) ** 2.9) + Number.EPSILON) * 100) / 100,
  };
});

const tables = {
  schemaVersion: 1,
  tables: [
    {
      tableId: "normal-stamina-small",
      hpDependentCurve: { kind: "stamina", coefficient: 80 },
      values: staminaValues(80, 15),
      verificationStatus: "下書き",
      source: `${source}。小の係数80は掲載されたHP100%値から逆算`,
    },
    {
      tableId: "normal-stamina-medium",
      hpDependentCurve: { kind: "stamina", coefficient: 65 },
      values: staminaValues(65),
      verificationStatus: "下書き",
      source,
    },
    {
      tableId: "normal-stamina-large",
      hpDependentCurve: { kind: "stamina", coefficient: 56.4 },
      values: staminaValues(56.4),
      verificationStatus: "下書き",
      source,
    },
    {
      tableId: "normal-enmity-small",
      hpDependentCurve: { kind: "enmity" },
      values: [0.5, 1.1, 1.7, 2.3, 2.9, 3.5, 4.09, 4.7, 5.3, 6, 6.2, 6.4, 6.6, 6.8, 7]
        .map((amountPercent, index) => ({ skillLevel: index + 1, amountPercent })),
      verificationStatus: "下書き",
      source,
    },
    {
      tableId: "normal-enmity-medium",
      hpDependentCurve: { kind: "enmity" },
      values: [0.7, 1.46, 2.26, 3.06, 3.86, 4.66, 5.46, 6.26, 7.06, 8, 8.4, 8.79, 9.2, 9.6, 10]
        .map((amountPercent, index) => ({ skillLevel: index + 1, amountPercent })),
      verificationStatus: "下書き",
      source,
    },
    {
      tableId: "normal-enmity-large",
      hpDependentCurve: { kind: "enmity" },
      values: [
        ...[0.83, 1.83, 2.83, 3.83, 4.83, 5.83, 6.83, 7.83, 8.83, 10, 10.5, 11, 11.5, 12, 12.5]
          .map((amountPercent, index) => ({ skillLevel: index + 1, amountPercent })),
        { skillLevel: 20, amountPercent: 13.5 },
      ],
      verificationStatus: "下書き",
      source,
    },
  ],
};

const elements = { fire: "1", water: "2", earth: "3", wind: "4", light: "5", dark: "6" };
const links = new Map();
function linkMany(entries, field, tableId) {
  for (const [skillId, elementCode] of entries) {
    const current = links.get(skillId) ?? {};
    current[field] = { tableId, elementCode };
    links.set(skillId, current);
  }
}

linkMany([
  ["1296", elements.fire], ["1297", elements.water], ["1298", elements.earth],
  ["1299", elements.wind], ["1300", elements.light], ["1301", elements.dark],
], "normalStaminaAmountTable", "normal-stamina-small");
linkMany([
  ["914", elements.fire], ["915", elements.water], ["916", elements.earth],
  ["917", elements.wind], ["918", elements.light], ["919", elements.dark],
], "normalStaminaAmountTable", "normal-stamina-medium");
linkMany([
  ["502", elements.fire], ["503", elements.water],
  ["506", elements.light], ["507", elements.dark],
], "normalStaminaAmountTable", "normal-stamina-large");

linkMany([
  ["118", elements.fire], ["119", elements.water], ["120", elements.earth],
  ["121", elements.wind], ["122", elements.light], ["123", elements.dark],
], "normalEnmityAmountTable", "normal-enmity-small");
linkMany([
  ["124", elements.fire], ["125", elements.water], ["129", elements.dark],
], "normalEnmityAmountTable", "normal-enmity-medium");
linkMany([
  ["130", elements.fire], ["131", elements.water], ["132", elements.earth],
  ["133", elements.wind], ["134", elements.light], ["135", elements.dark],
], "normalEnmityAmountTable", "normal-enmity-large");

const skillCatalog = JSON.parse(await readFile(skillCatalogPath, "utf8"));
const skillsById = new Map(skillCatalog.skills.map((skill) => [skill.skillId, skill]));
for (const skill of skillCatalog.skills) {
  delete skill.normalStaminaAmountTable;
  delete skill.normalEnmityAmountTable;
}
for (const [skillId, assignments] of links) {
  const skill = skillsById.get(skillId);
  if (skill === undefined) throw new Error(`unknown collected skill_id ${skillId}`);
  Object.assign(skill, assignments);
  if (skill.unsupportedEffects !== undefined) {
    skill.unsupportedEffects = skill.unsupportedEffects.filter(
      (effect) => !effect.includes("渾身") && !effect.includes("背水"),
    );
    if (skill.unsupportedEffects.length === 0) delete skill.unsupportedEffects;
  }
}

const weaponCatalog = JSON.parse(await readFile(weaponCatalogPath, "utf8"));
const froga = weaponCatalog.weapons.find((weapon) => weapon.weaponId === "1040024600");
if (froga !== undefined && froga.name === "列剣フロガ") froga.name = "烈剣フロガ";

await Promise.all([
  writeFile(tablePath, `${JSON.stringify(tables, null, 2)}\n`, "utf8"),
  writeFile(skillCatalogPath, `${JSON.stringify(skillCatalog, null, 2)}\n`, "utf8"),
  writeFile(weaponCatalogPath, `${JSON.stringify(weaponCatalog, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({ linkedSkills: links.size, tables: tables.tables.length }, null, 2));
