export const ELEMENT_LABELS = Object.freeze({
  "0": "属性可変",
  "1": "火",
  "2": "水",
  "3": "土",
  "4": "風",
  "5": "光",
  "6": "闇",
});

export const WEAPON_KIND_LABELS = Object.freeze({
  "1": "剣",
  "2": "短剣",
  "3": "槍",
  "4": "斧",
  "5": "杖",
  "6": "銃",
  "7": "格闘",
  "8": "弓",
  "9": "楽器",
  "10": "刀",
});

export const RARITY_LABELS = Object.freeze({
  "1": "N",
  "2": "R",
  "3": "SR",
  "4": "SSR",
});

export const SERIES_LABELS = Object.freeze({
  "1": "セラフィック",
  "2": "リミテッド",
  "3": "終末の神器",
  "5": "プライマルシリーズ",
  "7": "レガリア",
  "8": "マグナ",
  "13": "オメガウェポン",
  "14": "バハムート",
  "19": "英雄武器",
  "26": "アストラル",
  "29": "アンセスタル",
  "30": "新世界の礎",
  "31": "エニアド",
  "33": "マリス",
  "34": "メナス",
  "37": "レヴァンス",
  "40": "ドラゴニック・オリジン",
  "42": "マグナ・リバース",
  "44": "破壊の標",
  "45": "禁禍武器",
});

export const EFFECT_KIND_LABELS = Object.freeze({
  "normal-attack-up": "通常攻刃",
  "normal-skill-boost": "通常スキル効果量UP",
  "critical-rate-up": "クリティカル確率UP",
  "double-attack-rate-up": "ダブルアタック確率UP",
  "triple-attack-rate-up": "トリプルアタック確率UP",
  "elemental-pursuit": "属性追撃",
});

export const WEAPON_HEADERS = Object.freeze([
  "weapon_id",
  "名前",
  "英語名",
  "属性",
  "武器種",
  "レアリティ",
  "シリーズ",
  "ステータス",
  "出典",
]);

export const WEAPON_SKILL_HEADERS = Object.freeze([
  "skill_id",
  "スキル名",
  "効果文",
  "効果種別",
  "属性",
  "SLv",
  "値(%)",
  "効果の確度",
  "効果の出典",
  "確認日",
  "スキル状態",
]);

function asCellValue(value) {
  return value ?? "";
}

export function displayCode(value, labels, fieldName) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const code = String(value);
  const label = labels[code];
  if (label === undefined) {
    throw new Error(`${fieldName}に未定義のコードがあります: ${code}`);
  }
  return label;
}

export function buildWeaponSheetValues(catalog) {
  if (!Array.isArray(catalog?.weapons)) {
    throw new Error("武器カタログの weapons が配列ではありません");
  }

  return [
    [...WEAPON_HEADERS],
    ...catalog.weapons.map((weapon) => [
      asCellValue(weapon.weaponId),
      asCellValue(weapon.name),
      asCellValue(weapon.nameEn),
      displayCode(weapon.elementCode, ELEMENT_LABELS, "elementCode"),
      displayCode(weapon.weaponKindCode, WEAPON_KIND_LABELS, "weaponKindCode"),
      displayCode(weapon.rarityCode, RARITY_LABELS, "rarityCode"),
      displayCode(weapon.seriesId, SERIES_LABELS, "seriesId"),
      asCellValue(weapon.verificationStatus),
      asCellValue(weapon.source),
    ]),
  ];
}

function buildSkillEffectRow(skill, effect = undefined) {
  return [
    asCellValue(skill.skillId),
    asCellValue(skill.name),
    asCellValue(skill.description),
    displayCode(effect?.kind, EFFECT_KIND_LABELS, "effect.kind"),
    displayCode(effect?.elementCode, ELEMENT_LABELS, "effect.elementCode"),
    asCellValue(effect?.skillLevel),
    asCellValue(effect?.amountPercent),
    asCellValue(effect?.verificationStatus ?? (effect ? skill.verificationStatus : undefined)),
    asCellValue(effect?.source ?? (effect ? skill.source : undefined)),
    asCellValue(effect?.confirmedAt ?? (effect ? skill.confirmedAt : undefined)),
    asCellValue(skill.verificationStatus),
  ];
}

export function buildWeaponSkillSheetValues(catalog) {
  if (!Array.isArray(catalog?.skills)) {
    throw new Error("武器スキルカタログの skills が配列ではありません");
  }

  const rows = catalog.skills.flatMap((skill) => {
    if (!Array.isArray(skill.effects) || skill.effects.length === 0) {
      return [buildSkillEffectRow(skill)];
    }
    return skill.effects.map((effect) => buildSkillEffectRow(skill, effect));
  });

  return [[...WEAPON_SKILL_HEADERS], ...rows];
}
