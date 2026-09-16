export const MAX_SUPPORTED_PLAYER_RANK = 425;

export const PROTAGONIST_LIMIT_BONUS_VALUES = Object.freeze({
  attack: Object.freeze([0, 500, 1500, 3000]),
  hp: Object.freeze([0, 300, 600, 1000]),
  fireAttack: Object.freeze([0, 1, 3, 5]),
  elementAttack: Object.freeze([0, 1, 3, 5]),
  proficiencyAttack: Object.freeze([0, 1, 3, 5]),
  multiattack: Object.freeze([0, 1, 3, 5]),
});

const ELEMENT_ATTACK_LIMIT_BONUS_ELEMENTS = [
  { elementCode: "1", elementName: "火", fieldPrefix: "fire", sourcePrefix: "fire" },
  { elementCode: "2", elementName: "水", fieldPrefix: "water", sourcePrefix: "water" },
  { elementCode: "3", elementName: "土", fieldPrefix: "earth", sourcePrefix: "earth" },
  { elementCode: "4", elementName: "風", fieldPrefix: "wind", sourcePrefix: "wind" },
  { elementCode: "5", elementName: "光", fieldPrefix: "light", sourcePrefix: "light" },
  { elementCode: "6", elementName: "闇", fieldPrefix: "dark", sourcePrefix: "dark" },
];

const ELEMENT_ATTACK_LIMIT_BONUS_TIERS = [
  { labelSuffix: "", fieldSuffix: "Level", sourceSuffix: "", firstId: 9 },
  { labelSuffix: " II", fieldSuffix: "2Level", sourceSuffix: "-2", firstId: 67 },
  { labelSuffix: " III", fieldSuffix: "3Level", sourceSuffix: "-3", firstId: 106 },
];

export const PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS = Object.freeze(
  ELEMENT_ATTACK_LIMIT_BONUS_ELEMENTS.flatMap((element, elementIndex) =>
    ELEMENT_ATTACK_LIMIT_BONUS_TIERS.map((tier) => Object.freeze({
      elementCode: element.elementCode,
      elementName: element.elementName,
      fieldKey: `${element.fieldPrefix}AttackLimitBonus${tier.fieldSuffix}`,
      label: `${element.elementName}属性攻撃LB${tier.labelSuffix}`,
      sourceName: `${element.elementName}属性攻撃力LB${tier.labelSuffix}`,
      limitBonusId: String(tier.firstId + elementIndex),
      sourceId: `${element.sourcePrefix}-attack-limit-bonus${tier.sourceSuffix}`,
      verificationStatus: element.elementCode === "1" ? "検証済み" : "下書き",
    })),
  ),
);

export const PROTAGONIST_PROFICIENCY_ATTACK_LIMIT_BONUS_DEFINITIONS = Object.freeze([
  Object.freeze({ fieldKey: "proficiency1AttackLimitBonusLevel", label: "得意武器攻撃1", limitBonusId: "22", target: "first" }),
  Object.freeze({ fieldKey: "proficiency2AttackLimitBonusLevel", label: "得意武器攻撃2", limitBonusId: "23", target: "second" }),
  Object.freeze({ fieldKey: "proficiency1AttackLimitBonus2Level", label: "得意武器攻撃1 II", limitBonusId: "30", target: "first" }),
  Object.freeze({ fieldKey: "proficiency2AttackLimitBonus2Level", label: "得意武器攻撃2 II", limitBonusId: "31", target: "second" }),
  Object.freeze({ fieldKey: "proficiency1AttackLimitBonus3Level", label: "得意武器攻撃1 III", limitBonusId: "64", target: "first" }),
  Object.freeze({ fieldKey: "proficiency2AttackLimitBonus3Level", label: "得意武器攻撃2 III", limitBonusId: "65", target: "second" }),
  Object.freeze({ fieldKey: "proficiencyBothAttackLimitBonusLevel", label: "得意武器攻撃1・2", limitBonusId: "83", target: "both" }),
  Object.freeze({ fieldKey: "proficiencyBothAttackLimitBonus2Level", label: "得意武器攻撃1・2 II", limitBonusId: "97", target: "both" }),
]);

export const PROTAGONIST_MULTIATTACK_LIMIT_BONUS_DEFINITIONS = Object.freeze([
  Object.freeze({ fieldKey: "doubleAttackRateLimitBonusLevel", label: "ダブルアタック確率", limitBonusId: "24", kind: "double" }),
  Object.freeze({ fieldKey: "doubleAttackRateLimitBonus2Level", label: "ダブルアタック確率 II", limitBonusId: "33", kind: "double" }),
  Object.freeze({ fieldKey: "tripleAttackRateLimitBonusLevel", label: "トリプルアタック確率", limitBonusId: "34", kind: "triple" }),
  Object.freeze({ fieldKey: "tripleAttackRateLimitBonus2Level", label: "トリプルアタック確率 II", limitBonusId: "88", kind: "triple" }),
  Object.freeze({ fieldKey: "doubleAttackRateLimitBonus3Level", label: "ダブルアタック確率 III", limitBonusId: "102", kind: "double" }),
]);

function limitBonusValue(kind, level = 0) {
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error("LBは0〜3の整数で入力してください");
  }
  return PROTAGONIST_LIMIT_BONUS_VALUES[kind][level];
}

function assertSupportedRank(rank) {
  if (!Number.isInteger(rank) || rank < 1 || rank > MAX_SUPPORTED_PLAYER_RANK) {
    throw new Error(`Rankは1〜${MAX_SUPPORTED_PLAYER_RANK}の整数で入力してください`);
  }
}

/** Returns the provisional Rank base stats documented in protagonist-base-stats.md. */
export function calculateProtagonistRankBaseStats(rank) {
  assertSupportedRank(rank);
  let attack;
  if (rank === 1) attack = 1_000;
  else if (rank <= 100) attack = 1_000 + rank * 40;
  else if (rank <= 175) attack = 5_000 + (rank - 100) * 20;
  else if (rank <= 190) attack = 6_500 + (rank - 175) * 10;
  else attack = 6_650 + (rank - 190) * 5;

  let hp;
  if (rank === 1) hp = 600;
  else if (rank === 2) hp = 616;
  else if (rank === 3 || rank === 4) hp = 624;
  else if (rank <= 100) hp = 600 + rank * 8;
  else if (rank <= 175) hp = 1_400 + (rank - 100) * 4;
  else if (rank <= 190) hp = 1_700 + (rank - 175) * 2;
  else hp = 1_730 + (rank - 190);
  // Rank 425 HP is a community-derived correction and remains provisional.
  if (rank === 425) hp = 1_964;

  return { rank, attack, hp, verificationStatus: "下書き" };
}

function statTotal(entries, key) {
  return entries.reduce((total, entry) => total + entry[key], 0);
}

function proficiencyContribution(weapons, jobWeaponKindCodes, key) {
  return weapons.reduce((total, weapon) => {
    const matchCount = jobWeaponKindCodes.filter((code) => code === weapon.weaponKindCode).length;
    return total + Math.round(weapon[key] * 0.2 * matchCount);
  }, 0);
}

function proficiencyLimitBonusAttackContribution(input) {
  const firstWeaponKindCode = input.jobWeaponKindCodes[0];
  const secondWeaponKindCode = input.jobWeaponKindCodes[1];
  const proficientWeaponKindCodes = new Set(input.jobWeaponKindCodes);
  return input.weapons.reduce((total, weapon) => {
    const amountPercent = PROTAGONIST_PROFICIENCY_ATTACK_LIMIT_BONUS_DEFINITIONS.reduce(
      (sum, definition) => {
        const applies = definition.target === "first"
          ? firstWeaponKindCode !== undefined && weapon.weaponKindCode === firstWeaponKindCode
          : definition.target === "second"
            ? secondWeaponKindCode !== undefined && weapon.weaponKindCode === secondWeaponKindCode
            : weapon.weaponKindCode !== undefined && proficientWeaponKindCodes.has(weapon.weaponKindCode);
        return applies
          ? sum + limitBonusValue("proficiencyAttack", input[definition.fieldKey])
          : sum;
      },
      0,
    );
    return total + Math.round(weapon.attack * amountPercent / 100);
  }, 0);
}

/** Builds the protagonist's pre-skill displayed ATK/HP from catalog-resolved components. */
export function calculateProtagonistDisplayedStats(input) {
  const rank = calculateProtagonistRankBaseStats(input.rank);
  const limitBonusAttack = limitBonusValue("attack", input.attackLimitBonusLevel);
  const limitBonusHp = limitBonusValue("hp", input.hpLimitBonusLevel);
  const weaponAttack = statTotal(input.weapons, "attack");
  const weaponHp = statTotal(input.weapons, "hp");
  const summonAttack = statTotal(input.summons, "attack");
  const summonHp = statTotal(input.summons, "hp");
  const proficiencyAttack = proficiencyContribution(input.weapons, input.jobWeaponKindCodes, "attack");
  const proficiencyHp = proficiencyContribution(input.weapons, input.jobWeaponKindCodes, "hp");
  const proficiencyLimitBonusAttack = proficiencyLimitBonusAttackContribution(input);
  const attackSubtotal = rank.attack
    + limitBonusAttack
    + input.jobGrowthAttack
    + weaponAttack
    + proficiencyAttack
    + proficiencyLimitBonusAttack
    + input.mainWeaponCompletionAttack
    + summonAttack;
  const hpSubtotal = rank.hp
    + limitBonusHp
    + input.jobGrowthHp
    + weaponHp
    + proficiencyHp
    + summonHp;

  return {
    schemaVersion: 1,
    source: "derived",
    attack: Math.round(attackSubtotal * (1 + input.completionAttackPercent / 100)),
    hp: Math.round(hpSubtotal * (1 + input.completionHpPercent / 100)),
    breakdown: {
      rankAttack: rank.attack,
      rankHp: rank.hp,
      limitBonusAttack,
      limitBonusHp,
      jobGrowthAttack: input.jobGrowthAttack,
      jobGrowthHp: input.jobGrowthHp,
      weaponAttack,
      weaponHp,
      proficiencyAttack,
      proficiencyHp,
      proficiencyLimitBonusAttack,
      mainWeaponCompletionAttack: input.mainWeaponCompletionAttack,
      summonAttack,
      summonHp,
      attackSubtotal,
      hpSubtotal,
      completionAttackPercent: input.completionAttackPercent,
      completionHpPercent: input.completionHpPercent,
    },
  };
}
