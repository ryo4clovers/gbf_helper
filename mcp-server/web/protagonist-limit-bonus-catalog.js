const STANDARD_PERCENT_VALUES = Object.freeze([0, 1, 3, 5]);
const HIGH_PERCENT_VALUES = Object.freeze([0, 5, 10, 15]);

function definition(id, label, category, requiredRank, values = STANDARD_PERCENT_VALUES, unit = "%", connected = false) {
  return Object.freeze({
    id: String(id),
    label,
    category,
    requiredRank,
    values,
    unit,
    connected,
  });
}

const elementalReductionDefinitions = [
  [15, "火", 1], [16, "水", 1], [17, "土", 1], [18, "風", 1], [19, "光", 1], [20, "闇", 1],
  [75, "火", 220, " II"], [76, "水", 220, " II"], [77, "土", 220, " II"],
  [78, "風", 220, " II"], [79, "光", 220, " II"], [80, "闇", 220, " II"],
  [112, "火", 415, " III"], [113, "水", 415, " III"], [114, "土", 415, " III"],
  [115, "風", 415, " III"], [116, "光", 415, " III"], [117, "闇", 415, " III"],
].map(([id, element, rank, suffix = ""]) =>
  definition(id, `${element}属性軽減${suffix}`, "element-reduction", rank, STANDARD_PERCENT_VALUES, "%", true));

/**
 * Limit Bonus entries outside the primary displayed-stat groups. `connected`
 * identifies entries already used by a local calculator formula.
 */
export const PROTAGONIST_OTHER_LIMIT_BONUS_DEFINITIONS = Object.freeze([
  definition(2, "防御力", "defense-evasion", 1, STANDARD_PERCENT_VALUES, "%", true),
  definition(4, "回復性能", "healing", 1),
  definition(7, "弱体耐性", "debuff", 1),
  ...elementalReductionDefinitions,
  definition(29, "防御力 II", "defense-evasion", 155, STANDARD_PERCENT_VALUES, "%", true),
  definition(59, "回避率", "defense-evasion", 176, Object.freeze([0, 1, 2, 3])),
  definition(81, "防御力 III", "defense-evasion", 225, STANDARD_PERCENT_VALUES, "%", true),
  definition(90, "回復性能 II", "healing", 280, HIGH_PERCENT_VALUES),
  definition(98, "防御力 IV", "defense-evasion", 315, STANDARD_PERCENT_VALUES, "%", true),
  definition(101, "回復性能 III", "healing", 340, HIGH_PERCENT_VALUES),
  definition(104, "弱体耐性 II", "debuff", 365),

  definition(5, "アビリティダメージ", "damage-multiplier", 1),
  definition(6, "オーバードライブ抑制", "special", 1),
  definition(21, "奥義ダメージ", "damage-multiplier", 1),
  definition(32, "アビリティダメージ II", "damage-multiplier", 160),
  definition(35, "奥義ダメージ II", "damage-multiplier", 170),
  definition(37, "チェインバーストダメージUP", "damage-multiplier", 175),
  definition(41, "奥義ダメージ III", "damage-multiplier", 190),
  definition(74, "チェインバーストダメージUP II", "damage-multiplier", 215),
  definition(91, "奥義ダメージ IV", "damage-multiplier", 290, Object.freeze([0, 2, 4, 8])),

  definition(8, "弱体成功率", "debuff", 1),
  definition(92, "弱体成功率 II", "debuff", 300, Object.freeze([0, 2, 4, 8])),

  definition(36, "ダメージ上限UP", "damage-cap", 170, Object.freeze([0, 3, 6, 10])),
  definition(39, "ダメージ上限UP II", "damage-cap", 195),
  definition(84, "アビリティダメージ上限UP", "damage-cap", 230, Object.freeze([0, 3, 5, 10])),
  definition(85, "チェインバーストダメージ上限UP", "damage-cap", 240),
  definition(89, "アビリティダメージ上限UP II", "damage-cap", 275),
  definition(105, "チェインバーストダメージ上限UP II", "damage-cap", 375),
  definition(118, "通常攻撃ダメージ上限UP", "damage-cap", 425, Object.freeze([0, 1, 2, 3])),

  definition(87, "獲得EXP・獲得RANKポイント", "rewards", 255),
  definition(100, "獲得EXP・獲得RANKポイント II", "rewards", 330),
]);

export const PROTAGONIST_OTHER_LIMIT_BONUS_CATEGORIES = Object.freeze([
  Object.freeze({ key: "defense-evasion", label: "防御・回避", icon: "🛡️" }),
  Object.freeze({ key: "element-reduction", label: "属性軽減", icon: "🌈" }),
  Object.freeze({ key: "healing", label: "回復", icon: "💚" }),
  Object.freeze({ key: "damage-multiplier", label: "ダメージ倍率", icon: "💥" }),
  Object.freeze({ key: "debuff", label: "弱体", icon: "🎯" }),
  Object.freeze({ key: "special", label: "特殊", icon: "⚙️" }),
  Object.freeze({ key: "damage-cap", label: "ダメージ上限", icon: "⬆️" }),
]);

export const PROTAGONIST_OTHER_LIMIT_BONUS_IDS = new Set(
  [...PROTAGONIST_OTHER_LIMIT_BONUS_DEFINITIONS.map(({ id }) => id), "103"],
);
