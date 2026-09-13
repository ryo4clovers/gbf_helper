import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const catalogPath = path.join(repositoryRoot, "mcp-server/catalog/weapon-skills.v1.json");

const links = new Map();

function link(skillId, elementCode, field, tableId, boostGroup = "normal") {
  const current = links.get(skillId) ?? {};
  if (current[field] !== undefined) throw new Error(`duplicate ${field} mapping for ${skillId}`);
  current[field] = { tableId, elementCode, boostGroup };
  links.set(skillId, current);
}

function linkMany(entries, field, tableId, boostGroup = "normal") {
  for (const [skillId, elementCode] of entries) link(skillId, elementCode, field, tableId, boostGroup);
}

const elements = {
  fire: "1",
  water: "2",
  earth: "3",
  wind: "4",
  light: "5",
  dark: "6",
};

linkMany([
  ["74", elements.fire], ["75", elements.water], ["76", elements.earth],
  ["77", elements.wind], ["78", elements.light], ["79", elements.dark],
  ["845", elements.fire], ["846", elements.water], ["847", elements.earth],
  ["848", elements.wind], ["849", elements.light], ["850", elements.dark],
  ["1035", elements.fire], ["1037", elements.earth],
  ["1102", elements.wind], ["1104", elements.dark],
  ["2480", elements.fire], ["2481", elements.water],
  ["2484", elements.light], ["2485", elements.dark],
], "criticalRateAmountTable", "critical-small");
linkMany([
  ["80", elements.fire], ["81", elements.water], ["82", elements.earth],
  ["83", elements.wind], ["84", elements.light], ["85", elements.dark],
  ["322", elements.fire], ["323", elements.water], ["324", elements.earth],
  ["325", elements.wind], ["326", elements.light], ["327", elements.dark],
  ["369", elements.fire], ["370", elements.water], ["371", elements.earth],
  ["373", elements.light], ["2572", elements.earth],
], "criticalRateAmountTable", "critical-medium");
linkMany([
  ["86", elements.fire], ["87", elements.water], ["88", elements.earth],
  ["89", elements.wind], ["90", elements.light], ["91", elements.dark],
  ["1417", elements.water],
], "criticalRateAmountTable", "critical-large");
linkMany([
  ["1413", elements.wind], ["1422", elements.fire], ["1426", elements.light],
], "criticalRateAmountTable", "critical-ii");

linkMany([
  ["293", elements.water], ["934", elements.earth], ["939", elements.wind],
  ["1575", elements.light],
], "criticalRateAmountTable", "critical-large", "magna");
linkMany([
  ["942", elements.light], ["1571", elements.water], ["2409", elements.dark],
  ["2430", elements.water], ["2461", elements.earth],
], "criticalRateAmountTable", "critical-small", "magna");
linkMany([
  ["945", elements.light], ["947", elements.dark], ["1574", elements.wind],
  ["2389", elements.dark],
], "criticalRateAmountTable", "critical-medium", "magna");

linkMany([
  ["46", elements.fire], ["48", elements.earth], ["50", elements.light],
  ["51", elements.dark], ["1102", elements.wind], ["1104", elements.dark],
], "doubleAttackRateAmountTable", "double-attack-small");
linkMany([
  ["52", elements.fire], ["53", elements.water], ["54", elements.earth],
  ["55", elements.wind], ["57", elements.dark],
  ["369", elements.fire], ["370", elements.water], ["371", elements.earth],
  ["373", elements.light], ["771", elements.fire], ["772", elements.water],
  ["773", elements.earth], ["774", elements.wind], ["775", elements.light],
  ["776", elements.dark],
], "doubleAttackRateAmountTable", "multiattack-medium");
linkMany([
  ["58", elements.fire], ["61", elements.wind], ["62", elements.light],
], "doubleAttackRateAmountTable", "multiattack-large");

const normalThreehandSmall = [
  ["632", elements.fire], ["633", elements.water], ["635", elements.wind],
  ["636", elements.light], ["637", elements.dark],
];
const normalThreehandMedium = [
  ["1261", elements.water], ["1263", elements.wind],
  ["1264", elements.light], ["1265", elements.dark],
];
const normalThreehandLarge = [
  ["396", elements.fire], ["399", elements.wind], ["400", elements.light],
  ["401", elements.dark], ["510", elements.fire], ["511", elements.water],
  ["512", elements.earth], ["513", elements.wind], ["514", elements.light],
];
for (const field of ["doubleAttackRateAmountTable", "tripleAttackRateAmountTable"]) {
  linkMany(normalThreehandSmall, field, "multiattack-small");
  linkMany(normalThreehandMedium, field, "multiattack-medium");
  linkMany(normalThreehandLarge, field, "multiattack-large");
}

linkMany([
  ["867", elements.fire], ["869", elements.earth], ["870", elements.wind],
  ["871", elements.light], ["872", elements.dark],
], "tripleAttackRateAmountTable", "fandango-small");
linkMany([
  ["2480", elements.fire], ["2481", elements.water],
  ["2484", elements.light], ["2485", elements.dark],
], "tripleAttackRateAmountTable", "multiattack-small");
linkMany([
  ["1506", elements.fire], ["1507", elements.water], ["1508", elements.earth],
  ["1509", elements.wind], ["1510", elements.light], ["1511", elements.dark],
], "tripleAttackRateAmountTable", "fandango-medium");
linkMany([["2915", elements.water]], "tripleAttackRateAmountTable", "fandango-large");

linkMany([
  ["928", elements.fire], ["936", elements.wind], ["947", elements.dark],
  ["1574", elements.wind], ["2461", elements.earth],
], "doubleAttackRateAmountTable", "multiattack-medium", "magna");
linkMany([["2315", elements.light]], "doubleAttackRateAmountTable", "multiattack-small", "magna");
linkMany([
  ["2315", elements.light], ["2430", elements.water],
], "tripleAttackRateAmountTable", "multiattack-small", "magna");
linkMany([
  ["2436", elements.water], ["2455", elements.earth],
], "tripleAttackRateAmountTable", "multiattack-medium", "magna");
linkMany([
  ["1225", elements.earth], ["2309", elements.light],
], "tripleAttackRateAmountTable", "multiattack-large", "magna");
linkMany([["931", elements.water]], "tripleAttackRateAmountTable", "fandango-small", "magna");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const byId = new Map(catalog.skills.map((skill) => [skill.skillId, skill]));
for (const skill of catalog.skills) {
  delete skill.criticalRateAmountTable;
  delete skill.doubleAttackRateAmountTable;
  delete skill.tripleAttackRateAmountTable;
}
for (const [skillId, assignments] of links) {
  const skill = byId.get(skillId);
  if (skill === undefined) throw new Error(`unknown collected skill_id ${skillId}`);
  Object.assign(skill, assignments);
  if (skill.unsupportedEffects !== undefined) {
    const linkedKinds = new Set([
      ...(assignments.criticalRateAmountTable === undefined ? [] : ["クリティカル確率上昇"]),
      ...(assignments.doubleAttackRateAmountTable === undefined ? [] : ["ダブルアタック確率上昇"]),
      ...(assignments.tripleAttackRateAmountTable === undefined ? [] : ["トリプルアタック確率上昇"]),
    ]);
    skill.unsupportedEffects = skill.unsupportedEffects.filter(
      (effect) => ![...linkedKinds].some((kind) => effect.includes(kind)),
    );
    if (skill.unsupportedEffects.length === 0) delete skill.unsupportedEffects;
  }
  if (Object.values(assignments).some((assignment) => assignment.boostGroup === "magna")) {
    skill.unsupportedEffects ??= [];
    if (!skill.unsupportedEffects.includes("方陣スキル加護")) {
      skill.unsupportedEffects.push("方陣スキル加護");
    }
  }
}

await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

const counts = [...links.values()].reduce((result, assignments) => {
  for (const field of Object.keys(assignments)) result[field] = (result[field] ?? 0) + 1;
  return result;
}, {});
console.log(JSON.stringify({ linkedSkills: links.size, assignments: counts }, null, 2));
