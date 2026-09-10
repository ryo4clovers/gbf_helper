export const MEMORIAL_ITEM_DEFINITIONS = [
  { id: "1001", name: "祝融の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", elementCode: "1", targetElementCode: "4", defaultLevel: 10, maxLevel: 10 },
  { id: "1002", name: "玄冥の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", elementCode: "2", targetElementCode: "1", defaultLevel: 10, maxLevel: 10 },
  { id: "1003", name: "蓐収の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", elementCode: "3", targetElementCode: "2", defaultLevel: 10, maxLevel: 10 },
  { id: "1004", name: "句芒の玲瓏佩", group: "四聖の玲瓏佩・龍心", kind: "four-saints", elementCode: "4", targetElementCode: "3", defaultLevel: 10, maxLevel: 10 },
  { id: "1005", name: "黄金の龍心", group: "四聖の玲瓏佩・龍心", kind: "four-saints", elementCode: "5", targetElementCode: "6", defaultLevel: 10, maxLevel: 10 },
  { id: "1006", name: "黒曜石の龍心", group: "四聖の玲瓏佩・龍心", kind: "four-saints", elementCode: "6", targetElementCode: "5", defaultLevel: 10, maxLevel: 10 },
  { id: "9009", name: "赫焔灯す菩薩の印章", group: "神滅の印章", kind: "extinction-crest", elementCode: "1", defaultLevel: 20, maxLevel: 20 },
  { id: "9008", name: "冥府座す獄帝の印章", group: "神滅の印章", kind: "extinction-crest", elementCode: "2", defaultLevel: 20, maxLevel: 20 },
  { id: "9007", name: "罪咎裁く善神の印章", group: "神滅の印章", kind: "extinction-crest", elementCode: "3", defaultLevel: 20, maxLevel: 20 },
  { id: "9006", name: "天翔ける射手の印章", group: "神滅の印章", kind: "extinction-crest", elementCode: "4", defaultLevel: 20, maxLevel: 20 },
  { id: "9010", name: "燦輝祝く煌后の印章", group: "神滅の印章", kind: "extinction-crest", elementCode: "5", defaultLevel: 20, maxLevel: 20 },
  { id: "9011", name: "暗翳禍つ悪鬼の印章", group: "神滅の印章", kind: "extinction-crest", elementCode: "6", defaultLevel: 15, maxLevel: 15 },
  { id: "29", name: "父からの手紙", group: "キャラクター効果（計算保留）", kind: "character-deferred" },
  { id: "9003", name: "十天光輝の楯", group: "キャラクター効果（計算保留）", kind: "character-deferred" },
  { id: "9016", name: "十二神将の御朱印帳", group: "キャラクター効果（計算保留）", kind: "character-deferred" },
  { id: "9013", name: "シグナム・へレディス", group: "固定・可変効果", kind: "all-element-attack", amountPercent: 3 },
  { id: "9014", name: "オプリメル・フラゴル", group: "固定・可変効果", kind: "damage-cap", amountPercent: 3 },
  { id: "9015", name: "シンボルム・アミキティアエ", group: "固定・可変効果", kind: "damage-dealt", defaultAmountPercent: 3.6, maxAmountPercent: 5 },
  { id: "9017", name: "三界の繋環", group: "固定・可変効果", kind: "chain-burst", amountPercent: 5 },
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
  };
  for (const definition of MEMORIAL_ITEM_DEFINITIONS) {
    const state = activeSetting(settings, definition);
    if (!state.enabled) continue;
    if (definition.kind === "four-saints" && definition.elementCode === protagonistElementCode) {
      if (state.level >= 1) result.elementAttackPercent += 5;
      if (state.level >= 5) result.elementAttackPercent += 5;
      if (state.level >= 7 && definition.targetElementCode === enemyElementCode) result.targetElementDamagePercent += 5;
      if (state.level >= 8) result.normalAttackDamageCapPercent += 5;
    }
    if (
      definition.kind === "extinction-crest" &&
      definition.elementCode === protagonistElementCode &&
      (settings?.includeExtinctionCrestInLocalResults ?? true)
    ) {
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
