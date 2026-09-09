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

export const WIKI_SERIES_LABELS = Object.freeze({
  ancestral: "アンセスタルシリーズ",
  astral: "アストラルウェポン",
  bahamut: "バハムートウェポン",
  beast: "四象武器",
  ccw: "英雄武器",
  celestial: "極星器",
  collab: "コラボ武器",
  cosmos: "コスモス武器",
  "dark opus": "終末の神器",
  destroyer: "破壊の標",
  draconic: "ドラゴニックウェポン",
  draconicprovenance: "ドラゴニック・オリジン",
  ennead: "エニアドシリーズ",
  epic: "エピックウェポン",
  exo: "神滅戦武器",
  grand: "リミテッドシリーズ",
  hollowsky: "虚空武器",
  illustrious: "ルミナスシリーズ",
  malice: "マリスシリーズ",
  menace: "メナスシリーズ",
  militis: "ミーレスシリーズ",
  newworld: "新世界の礎",
  odious: "禁禍武器",
  "olden primal": "オールド・プライマルシリーズ",
  omega: "マグナシリーズ",
  "omega rebirth": "マグナ・リバース",
  primal: "プライマルシリーズ",
  proven: "ブレイブグラウンド武器",
  regalia: "レガリアシリーズ",
  relic: "依代武器",
  replica: "レプリカ",
  revans: "レヴァンスシリーズ",
  revenant: "天星器",
  rose: "ローズクリスタル武器",
  rusted: "朽ち果てた武器",
  sephira: "セフィラ武器",
  seraphic: "セラフィックウェポン",
  splendor: "十天光輝の武器",
  superlative: "スペリオルシリーズ",
  ultima: "オメガウェポン",
  upgrader: "強化素材",
  vintage: "ヴィンテージシリーズ",
  vyrmament: "ぐらぶるっ！武器",
  world: "ワールドシリーズ",
  xeno: "六道武器",
});

export const EFFECT_KIND_LABELS = Object.freeze({
  "normal-attack-up": "通常攻刃",
  "normal-skill-boost": "通常スキル効果量UP",
  "critical-rate-up": "クリティカル確率UP",
  "double-attack-rate-up": "ダブルアタック確率UP",
  "triple-attack-rate-up": "トリプルアタック確率UP",
  "elemental-pursuit": "属性追撃",
});

export const WEAPON_STAT_LEVELS = Object.freeze([1, 100, 150, 200, 250]);
export const WEAPON_SKILL_SLOT_COUNT = 4;

export const WEAPON_HEADERS = Object.freeze([
  "weapon_id",
  "武器名",
  "英語名",
  "属性",
  "レア",
  "武器種",
  "シリーズ",
  "最大Lv",
  "最大上限解放",
  "最大Lv HP",
  "最大Lv 攻撃",
  ...WEAPON_STAT_LEVELS.flatMap((level) => [`Lv${level} HP`, `Lv${level} 攻撃`]),
  "奥義名",
  "奥義効果",
  ...Array.from({ length: WEAPON_SKILL_SLOT_COUNT }, (_, index) => [
    `スキル${index + 1} skill_id`,
    `スキル${index + 1}名`,
  ]).flat(),
  "検証状態",
  "確認日",
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

function wikiEntriesByWeaponId(wikiCatalog) {
  return new Map(
    (wikiCatalog?.weapons ?? [])
      .filter((entry) => entry.weaponId)
      .map((entry) => [entry.weaponId, entry]),
  );
}

function skillsById(skillCatalog) {
  return new Map((skillCatalog?.skills ?? []).map((skill) => [String(skill.skillId), skill]));
}

function japaneseChargeAttacksByWeaponId(entries) {
  return new Map(
    (entries ?? [])
      .filter((entry) => entry?.weaponId)
      .map((entry) => [String(entry.weaponId), entry]),
  );
}

function findStatPoint(weapon, level) {
  return weapon.levelStats?.points?.find((point) => point.level === level);
}

function maximumStatPoint(weapon) {
  const maximumLevel = weapon.levelStats?.maximumLevel ?? weapon.selectionDefaults?.level;
  return findStatPoint(weapon, maximumLevel) ?? (
    weapon.selectionDefaults?.level === maximumLevel
      ? weapon.selectionDefaults
      : undefined
  );
}

function finalSkillStage(skill) {
  return { ...(skill?.initial ?? {}), ...(skill?.upgraded ?? {}) };
}

function cleanWikiText(value) {
  if (!value) return "";
  return String(value)
    .replace(/<br\s*\/?\s*>/giu, " / ")
    .replace(/<[^>]+>/gu, "")
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/gu, "$1")
    .replace(/&nbsp;/gu, " ")
    .replace(/'''?/gu, "")
    .replace(/[\u007f]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function seriesLabel(weapon, wikiEntry) {
  if (weapon.seriesId) return displayCode(weapon.seriesId, SERIES_LABELS, "seriesId");
  return displayCode(wikiEntry?.series, WIKI_SERIES_LABELS, "wiki.series");
}

function uncapLabel(weapon, wikiEntry) {
  const maximum = wikiEntry?.uncaps?.maximum ?? weapon.selectionDefaults?.uncapLevel;
  return maximum === undefined || maximum === null || maximum === "" ? "" : `${maximum}凸`;
}

function skillCells(weapon, wikiEntry, skillIndex) {
  return Array.from({ length: WEAPON_SKILL_SLOT_COUNT }, (_, offset) => {
    const slot = offset + 1;
    const sourceKey = `skill${slot}`;
    const structuredSlot = weapon.skillSlots?.find((skill) => skill.sourceKey === sourceKey);
    const listedSkill = weapon.listedSkills?.find((skill) => skill.sourceKey === sourceKey);
    const wikiSkill = wikiEntry?.skills?.find((skill) => skill.slot === slot);
    const skillId = structuredSlot?.skillId ? String(structuredSlot.skillId) : "";
    const name = skillIndex.get(skillId)?.name
      ?? listedSkill?.name
      ?? finalSkillStage(wikiSkill).name
      ?? "";
    return [skillId, cleanWikiText(name)];
  }).flat();
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

export function parseJapaneseChargeAttackKnowledge(markdown) {
  const weaponId = markdown.match(/^weapon_id:\s*["']?([^"'\r\n]+)["']?\s*$/mu)?.[1]?.trim();
  const section = markdown.match(
    /^## 奥義\(チャージアタック\)\s*$([\s\S]*?)(?=^##\s|$(?![\s\S]))/mu,
  )?.[1];
  const rawName = section?.match(/^- 名称:\s*(.+)$/mu)?.[1]?.trim();
  const description = section?.match(/^- 効果(?:\([^\r\n)]*\))?:\s*(.+)$/mu)?.[1]?.trim();
  if (!weaponId || !rawName || !description) return undefined;

  const name = rawName.replace(/\([^\r\n()]*(?:段階|=)[^\r\n()]*\)\s*$/u, "").trim();
  return { weaponId, name, description };
}

export function buildWeaponSheetValues(
  catalog,
  { wikiCatalog, skillCatalog, japaneseChargeAttacks = [] } = {},
) {
  if (!Array.isArray(catalog?.weapons)) {
    throw new Error("武器カタログの weapons が配列ではありません");
  }

  const wikiIndex = wikiEntriesByWeaponId(wikiCatalog);
  const skillIndex = skillsById(skillCatalog);
  const japaneseChargeAttackIndex = japaneseChargeAttacksByWeaponId(japaneseChargeAttacks);

  return [
    [...WEAPON_HEADERS],
    ...catalog.weapons.map((weapon) => {
      const wikiEntry = wikiIndex.get(weapon.weaponId);
      const maximumLevel = weapon.levelStats?.maximumLevel ?? weapon.selectionDefaults?.level;
      const maximumPoint = maximumStatPoint(weapon);
      const japaneseChargeAttack = japaneseChargeAttackIndex.get(weapon.weaponId);
      return [
        asCellValue(weapon.weaponId),
        asCellValue(weapon.name),
        asCellValue(weapon.nameEn),
        displayCode(weapon.elementCode, ELEMENT_LABELS, "elementCode"),
        displayCode(weapon.rarityCode, RARITY_LABELS, "rarityCode"),
        displayCode(weapon.weaponKindCode, WEAPON_KIND_LABELS, "weaponKindCode"),
        seriesLabel(weapon, wikiEntry),
        asCellValue(maximumLevel),
        uncapLabel(weapon, wikiEntry),
        asCellValue(maximumPoint?.hp),
        asCellValue(maximumPoint?.attack),
        ...WEAPON_STAT_LEVELS.flatMap((level) => {
          const point = findStatPoint(weapon, level);
          return [asCellValue(point?.hp), asCellValue(point?.attack)];
        }),
        asCellValue(japaneseChargeAttack?.name),
        asCellValue(japaneseChargeAttack?.description),
        ...skillCells(weapon, wikiEntry, skillIndex),
        asCellValue(weapon.verificationStatus),
        asCellValue(weapon.confirmedAt),
        asCellValue(weapon.source),
      ];
    }),
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
