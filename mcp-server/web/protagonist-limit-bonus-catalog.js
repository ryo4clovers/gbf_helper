const STANDARD_PERCENT_VALUES = Object.freeze([0, 1, 3, 5]);
const HIGH_PERCENT_VALUES = Object.freeze([0, 5, 10, 15]);

function definition(id, label, category, requiredRank, values = STANDARD_PERCENT_VALUES, unit = "%") {
  return Object.freeze({
    id: String(id),
    label,
    category,
    requiredRank,
    values,
    unit,
  });
}

const elementalReductionDefinitions = [
  [15, "火", 1], [16, "水", 1], [17, "土", 1], [18, "風", 1], [19, "光", 1], [20, "闇", 1],
  [75, "火", 220, " II"], [76, "水", 220, " II"], [77, "土", 220, " II"],
  [78, "風", 220, " II"], [79, "光", 220, " II"], [80, "闇", 220, " II"],
  [112, "火", 415, " III"], [113, "水", 415, " III"], [114, "土", 415, " III"],
  [115, "風", 415, " III"], [116, "光", 415, " III"], [117, "闇", 415, " III"],
].map(([id, element, rank, suffix = ""]) =>
  definition(id, `${element}属性軽減${suffix}`, "element-reduction", rank));

/**
 * Limit Bonus entries that can be entered and persisted but are not connected
 * to a calculator formula yet. Values come from knowledge/mechanics/limit-bonus.md.
 */
export const PROTAGONIST_OTHER_LIMIT_BONUS_DEFINITIONS = Object.freeze([
  definition(2, "防御力", "defense", 1),
  definition(4, "回復性能", "healing", 1),
  definition(7, "弱体耐性", "debuff", 1),
  ...elementalReductionDefinitions,
  definition(29, "防御力 II", "defense", 155),
  definition(59, "回避率", "defense", 176, Object.freeze([0, 1, 2, 3])),
  definition(81, "防御力 III", "defense", 225),
  definition(90, "回復性能 II", "healing", 280, HIGH_PERCENT_VALUES),
  definition(98, "防御力 IV", "defense", 315),
  definition(101, "回復性能 III", "healing", 340, HIGH_PERCENT_VALUES),
  definition(103, "HP II", "defense", 355, Object.freeze([0, 300, 600, 1000]), ""),
  definition(104, "弱体耐性 II", "debuff", 365),

  definition(5, "アビリティダメージ", "ability", 1),
  definition(6, "オーバードライブ抑制", "ability", 1),
  definition(21, "奥義ダメージ", "charge", 1),
  definition(32, "アビリティダメージ II", "ability", 160),
  definition(35, "奥義ダメージ II", "charge", 170),
  definition(37, "チェインバーストダメージUP", "charge", 175),
  definition(41, "奥義ダメージ III", "charge", 190),
  definition(74, "チェインバーストダメージUP II", "charge", 215),
  definition(91, "奥義ダメージ IV", "charge", 290, Object.freeze([0, 2, 4, 8])),

  definition(8, "弱体成功率", "debuff", 1),
  definition(92, "弱体成功率 II", "debuff", 300, Object.freeze([0, 2, 4, 8])),

  definition(36, "ダメージ上限UP", "damage-cap", 170, Object.freeze([0, 3, 6, 10])),
  definition(39, "ダメージ上限UP II", "damage-cap", 195),
  definition(84, "アビリティダメージ上限UP", "ability-cap", 230, Object.freeze([0, 3, 5, 10])),
  definition(85, "チェインバーストダメージ上限UP", "chain-cap", 240),
  definition(89, "アビリティダメージ上限UP II", "ability-cap", 275),
  definition(105, "チェインバーストダメージ上限UP II", "chain-cap", 375),
  definition(118, "通常攻撃ダメージ上限UP", "damage-cap", 425, Object.freeze([0, 1, 2, 3])),

  definition(87, "獲得EXP・獲得RANKポイント", "rewards", 255),
  definition(100, "獲得EXP・獲得RANKポイント II", "rewards", 330),
]);

export const PROTAGONIST_OTHER_LIMIT_BONUS_CATEGORIES = Object.freeze([
  Object.freeze({ key: "defense", label: "防御・HP", icon: "🛡️" }),
  Object.freeze({ key: "element-reduction", label: "属性軽減", icon: "🌈" }),
  Object.freeze({ key: "healing", label: "回復", icon: "💚" }),
  Object.freeze({ key: "ability", label: "アビリティ", icon: "✨" }),
  Object.freeze({ key: "charge", label: "奥義・チェイン", icon: "💥" }),
  Object.freeze({ key: "debuff", label: "弱体", icon: "🎯" }),
  Object.freeze({ key: "damage-cap", label: "ダメージ上限", icon: "⬆️" }),
  Object.freeze({ key: "ability-cap", label: "アビリティ上限", icon: "🔮" }),
  Object.freeze({ key: "chain-cap", label: "チェイン上限", icon: "⛓️" }),
  Object.freeze({ key: "rewards", label: "獲得量", icon: "📘" }),
]);

export const PROTAGONIST_OTHER_LIMIT_BONUS_IDS = new Set(
  PROTAGONIST_OTHER_LIMIT_BONUS_DEFINITIONS.map(({ id }) => id),
);
