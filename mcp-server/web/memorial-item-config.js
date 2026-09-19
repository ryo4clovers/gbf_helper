export const MEMORIAL_ITEM_DEFINITIONS = [
  { id: "1001", name: "祝融の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", effect: "火属性キャラをLvに応じて強化", elementCode: "1", targetElementCode: "4", defaultLevel: 10, maxLevel: 10 },
  { id: "1002", name: "玄冥の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", effect: "水属性キャラをLvに応じて強化", elementCode: "2", targetElementCode: "1", defaultLevel: 10, maxLevel: 10 },
  { id: "1003", name: "蓐収の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", effect: "土属性キャラをLvに応じて強化", elementCode: "3", targetElementCode: "2", defaultLevel: 10, maxLevel: 10 },
  { id: "1004", name: "句芒の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", effect: "風属性キャラをLvに応じて強化", elementCode: "4", targetElementCode: "3", defaultLevel: 10, maxLevel: 10 },
  { id: "1005", name: "黄金の龍心", group: "四聖の玲瓏佩・龍心", kind: "four-saints", effect: "光属性キャラをLvに応じて強化", elementCode: "5", targetElementCode: "6", defaultLevel: 10, maxLevel: 10 },
  { id: "1006", name: "黒曜石の龍心", group: "四聖の玲瓏佩・龍心", kind: "four-saints", effect: "闇属性キャラをLvに応じて強化", elementCode: "6", targetElementCode: "5", defaultLevel: 10, maxLevel: 10 },
  { id: "9009", name: "赫焔灯す菩薩の印章", group: "神滅の印章", kind: "extinction-crest", effect: "火属性キャラの防御・連撃率などをLvに応じて強化", elementCode: "1", defaultLevel: 20, maxLevel: 20 },
  { id: "9008", name: "冥府座す獄帝の印章", group: "神滅の印章", kind: "extinction-crest", effect: "水属性キャラの防御・連撃率などをLvに応じて強化", elementCode: "2", defaultLevel: 20, maxLevel: 20 },
  { id: "9007", name: "罪咎裁く善神の印章", group: "神滅の印章", kind: "extinction-crest", effect: "土属性キャラの防御・連撃率などをLvに応じて強化", elementCode: "3", defaultLevel: 20, maxLevel: 20 },
  { id: "9006", name: "天翔ける射手の印章", group: "神滅の印章", kind: "extinction-crest", effect: "風属性キャラの防御・連撃率などをLvに応じて強化", elementCode: "4", defaultLevel: 20, maxLevel: 20 },
  { id: "9010", name: "燦輝祝く煌后の印章", group: "神滅の印章", kind: "extinction-crest", effect: "光属性キャラの防御・連撃率などをLvに応じて強化", elementCode: "5", defaultLevel: 20, maxLevel: 20 },
  { id: "9011", name: "暗翳禍つ悪鬼の印章", group: "神滅の印章", kind: "extinction-crest", effect: "闇属性キャラの防御・連撃率などをLvに応じて強化", elementCode: "6", defaultLevel: 15, maxLevel: 15 },
  { id: "29", name: "父からの手紙", group: "メインクエスト", kind: "character-deferred", effect: "ルリアなどメインクエスト加入キャラ6人のステータスUP" },
  { id: "9003", name: "十天光輝の楯", group: "その他", kind: "character-deferred", effect: "バトル開始時に十天衆のステータスと奥義ゲージUP" },
  { id: "9013", name: "シグナム・へレディス", group: "その他", kind: "all-element-attack", effect: "全属性攻撃力+3%", amountPercent: 3 },
  { id: "9014", name: "オプリメル・フラゴル", group: "その他", kind: "damage-cap", effect: "全属性キャラのダメージ上限+3%", amountPercent: 3 },
  { id: "9015", name: "シンボルム・アミキティアエ", group: "その他", kind: "damage-dealt", effect: "全属性キャラの与ダメージUP（上限5%）", defaultAmountPercent: 3.6, maxAmountPercent: 5 },
  { id: "9016", name: "十二神将の御朱印帳", group: "その他", kind: "character-deferred", effect: "バトル開始時に十二神将のステータスと奥義ゲージUP" },
  { id: "9017", name: "三界の繋環", group: "その他", kind: "chain-burst", effect: "チェインバースト性能+5%", amountPercent: 5 },
];

export function defaultMemorialItemSettings() {
  return {
    includeExtinctionCrestInLocalResults: true,
    items: Object.fromEntries(MEMORIAL_ITEM_DEFINITIONS.map((item) => [item.id, {
      enabled: true,
      ...(item.defaultLevel === undefined ? {} : { level: item.defaultLevel }),
      ...(item.defaultAmountPercent === undefined ? {} : { amountPercent: item.defaultAmountPercent }),
    }])),
  };
}

const ELEMENT_NAMES = { "1": "火", "2": "水", "3": "土", "4": "風", "5": "光", "6": "闇" };
const ADVANTAGE_TARGETS = { "1": "4", "2": "1", "3": "2", "4": "3", "5": "6", "6": "5" };

export function describeMemorialItemEffect(definition, savedState) {
  const state = activeSetting({ items: { [definition.id]: savedState } }, definition);
  if (definition.kind === "four-saints") {
    const effects = [];
    if (state.level >= 1) effects.push(`${ELEMENT_NAMES[definition.elementCode]}属性攻撃+${state.level >= 5 ? 10 : 5}%`);
    if (state.level >= 2) effects.push(`防御+${state.level >= 6 ? 10 : 5}%`);
    if (state.level >= 3) effects.push("アビリティダメージ+5%");
    if (state.level >= 4) effects.push("奥義ダメージ+5%");
    if (state.level >= 7) effects.push(`対${ELEMENT_NAMES[definition.targetElementCode]}属性与ダメージ+5%`);
    if (state.level >= 8) effects.push("通常攻撃ダメージ上限+5%");
    if (state.level >= 9) effects.push("アビリティダメージ上限+5%");
    if (state.level >= 10) effects.push("奥義ダメージ上限+5%");
    return effects.length === 0 ? "Lv0：効果なし" : `Lv${state.level}：${effects.join("、")}`;
  }
  if (definition.kind === "extinction-crest") {
    const count = (thresholds) => thresholds.filter(([level]) => state.level >= level).reduce((sum, [, amount]) => sum + amount, 0);
    const effects = [
      [`${ELEMENT_NAMES[ADVANTAGE_TARGETS[definition.elementCode]]}属性ダメージ軽減`, count([[1, 5], [20, 5]])],
      ["防御", count([[2, 3], [6, 3], [11, 3], [17, 3]])],
      ["DA率", count([[3, 3], [13, 3]])],
      ["回復上限", count([[4, 3], [8, 3], [12, 3], [18, 3]])],
      ["弱体耐性", count([[5, 3], [9, 3], [14, 3], [16, 1]])],
      ["TA率", count([[7, 3], [15, 2], [19, 2]])],
      ["弱体成功率", count([[10, 5]])],
    ].filter(([, amount]) => amount > 0).map(([name, amount]) => `${name}+${amount}%`);
    return effects.length === 0 ? "Lv0：効果なし" : `Lv${state.level}：${effects.join("、")}`;
  }
  return definition.effect;
}

function activeSetting(settings, definition) {
  const saved = settings?.items?.[definition.id];
  return {
    enabled: saved?.enabled ?? true,
    level: Math.min(definition.maxLevel ?? Infinity, Math.max(0, Number(saved?.level ?? definition.defaultLevel ?? 0))),
    amountPercent: Math.min(definition.maxAmountPercent ?? Infinity, Math.max(0, Number(saved?.amountPercent ?? definition.defaultAmountPercent ?? definition.amountPercent ?? 0))),
  };
}

export function calculateMemorialItemModifiers(settings, protagonistElementCode, enemyElementCode) {
  const result = {
    allElementAttackPercent: 0,
    elementAttackPercent: 0,
    damageDealtPercent: 0,
    targetElementDamagePercent: 0,
    damageCapPercent: 0,
    normalAttackDamageCapPercent: 0,
    extinctionCrestDoubleAttackRatePercent: 0,
    extinctionCrestTripleAttackRatePercent: 0,
    chainBurstPerformancePercent: 0,
    abilityDamagePercent: 0,
    defensePercent: 0,
    incomingElementalDamageReductionPercents: [],
  };
  for (const definition of MEMORIAL_ITEM_DEFINITIONS) {
    const state = activeSetting(settings, definition);
    if (!state.enabled) continue;
    if (definition.kind === "four-saints" && definition.elementCode === protagonistElementCode) {
      if (state.level >= 1) result.elementAttackPercent += 5;
      if (state.level >= 5) result.elementAttackPercent += 5;
      if (state.level >= 7 && definition.targetElementCode === enemyElementCode) result.targetElementDamagePercent += 5;
      if (state.level >= 3) result.abilityDamagePercent += 5;
      if (state.level >= 8) result.normalAttackDamageCapPercent += 5;
      if (state.level >= 2) result.defensePercent += 5;
      if (state.level >= 6) result.defensePercent += 5;
    }
    if (
      definition.kind === "extinction-crest" &&
      definition.elementCode === protagonistElementCode &&
      (settings?.includeExtinctionCrestInLocalResults ?? true)
    ) {
      if (state.level >= 2) result.defensePercent += 3;
      if (state.level >= 6) result.defensePercent += 3;
      if (state.level >= 11) result.defensePercent += 3;
      if (state.level >= 17) result.defensePercent += 3;
      if (ADVANTAGE_TARGETS[definition.elementCode] === enemyElementCode) {
        if (state.level >= 1) result.incomingElementalDamageReductionPercents.push(5);
        if (state.level >= 20) result.incomingElementalDamageReductionPercents.push(5);
      }
      if (state.level >= 3) result.extinctionCrestDoubleAttackRatePercent += 3;
      if (state.level >= 13) result.extinctionCrestDoubleAttackRatePercent += 3;
      if (state.level >= 7) result.extinctionCrestTripleAttackRatePercent += 3;
      if (state.level >= 15) result.extinctionCrestTripleAttackRatePercent += 2;
      if (state.level >= 19) result.extinctionCrestTripleAttackRatePercent += 2;
    }
    if (definition.kind === "all-element-attack") result.allElementAttackPercent += definition.amountPercent;
    if (definition.kind === "damage-cap") result.damageCapPercent += definition.amountPercent;
    if (definition.kind === "damage-dealt") result.damageDealtPercent += state.amountPercent;
    if (definition.kind === "chain-burst") result.chainBurstPerformancePercent += definition.amountPercent;
  }
  return result;
}
