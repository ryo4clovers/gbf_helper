export const CREW_SUPPORT_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: "airshipEnabled",
    name: "船（騎空艇）",
    effect: "全属性攻撃力10%UP",
  }),
  Object.freeze({
    key: "rainbowFurnaceEnabled",
    name: "炉（虹の星晶炉）",
    effect: "全属性攻撃力10%UP",
  }),
  Object.freeze({
    key: "copperGongEnabled",
    name: "出陣の銅鑼がね",
    effect: "バトル開始時に奥義ゲージ30%UP",
  }),
  Object.freeze({
    key: "potionMakerEnabled",
    name: "ポーションメーカー",
    effect: "バトル開始時にキュアポーション2個追加",
  }),
]);

export function defaultCrewSupportSettings() {
  return Object.fromEntries(CREW_SUPPORT_DEFINITIONS.map((definition) => [definition.key, true]));
}

export function normalizeCrewSupportSettings(settings) {
  const defaults = defaultCrewSupportSettings();
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return defaults;
  return Object.fromEntries(CREW_SUPPORT_DEFINITIONS.map((definition) => [
    definition.key,
    typeof settings[definition.key] === "boolean" ? settings[definition.key] : defaults[definition.key],
  ]));
}

export function calculateCrewSupportEffects(settings) {
  const normalized = normalizeCrewSupportSettings(settings);
  return {
    shipAttackPercent: normalized.airshipEnabled ? 10 : 0,
    furnaceAttackPercent: normalized.rainbowFurnaceEnabled ? 10 : 0,
    battleStartChargeGaugePercent: normalized.copperGongEnabled ? 30 : 0,
    curePotionCount: normalized.potionMakerEnabled ? 2 : 0,
  };
}
