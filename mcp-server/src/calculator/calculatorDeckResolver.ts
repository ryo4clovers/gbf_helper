import { parseCalculatorDeckConfig } from "./calculatorDeckConfig.js";
import { applyCalculatorDeckEquipmentRules } from "./calculatorDeckEquipmentRules.js";
import { createSelectableJobCatalog } from "./jobCatalogView.js";
import { loadJobFallbackWeaponCatalog } from "./jobFallbackWeaponCatalog.js";
import { loadIncrementalSummonCatalog, resolveCatalogSummonAura } from "./summonCatalog.js";
import {
  resolveEffectiveCharacterHpAuras,
  resolveEffectiveCharacterHpFlatAuras,
} from "./summonAuraEffectResolver.js";
import { loadIncrementalWeaponCatalog } from "./weaponCatalog.js";
import { resolveEffectiveWeaponSkillEffects } from "./weaponEffectResolver.js";
import type {
  CalculatorDeckConfig,
  CalculatorDeckProtagonistConfig,
  DamageModifier,
  DeckJobMultiattackRateBonus,
  DeckSnapshot,
  ResolvedSupportSummon,
  SummonMasterCatalogEntry,
  WeaponMasterCatalogEntry,
} from "./types.js";
import { calculateEquipmentLevelStats } from "../../web/equipment-level-stats.js";
import {
  calculateProtagonistDisplayedStats,
  PROTAGONIST_LIMIT_BONUS_VALUES,
} from "../../web/protagonist-displayed-stats.js";

function fireAttackLimitBonusModifiers(
  protagonist: CalculatorDeckProtagonistConfig,
): DamageModifier[] {
  return [
    {
      level: protagonist.fireAttackLimitBonusLevel ?? 0,
      sourceId: "fire-attack-limit-bonus",
      sourceName: "火属性攻撃力LB",
      verificationStatus: "検証済み" as const,
    },
    {
      level: protagonist.fireAttackLimitBonus2Level ?? 0,
      sourceId: "fire-attack-limit-bonus-2",
      sourceName: "火属性攻撃力LB II",
      verificationStatus: "検証済み" as const,
    },
    {
      level: protagonist.fireAttackLimitBonus3Level ?? 0,
      sourceId: "fire-attack-limit-bonus-3",
      sourceName: "火属性攻撃力LB III",
      verificationStatus: "検証済み" as const,
    },
  ].flatMap(({ level, sourceId, sourceName, verificationStatus }) => level === 0 ? [] : [{
    stage: "elemental-attack" as const,
    amountPercent: PROTAGONIST_LIMIT_BONUS_VALUES.fireAttack[level],
    sourceType: "job-limit-bonus" as const,
    sourceId,
    sourceName,
    elementCode: "1",
    verificationStatus,
  }]);
}

export type CalculatorDeckResolutionIssueCode =
  | "protagonist-lb-components-unresolved"
  | "missing-stat-override"
  | "job-master-data-unresolved"
  | "main-weapon-incompatible-with-job"
  | "weapon-master-data-unresolved"
  | "weapon-skill-data-unresolved"
  | "unverified-weapon-skill"
  | "unverified-weapon-skill-effect"
  | "weapon-skill-partially-supported"
  | "weapon-skill-level-unresolved"
  | "multiple-weapon-skill-boosts-assumed-additive"
  | "summon-aura-unresolved"
  | "character-passives-unresolved";

export interface CalculatorDeckResolutionIssue {
  severity: "warning";
  code: CalculatorDeckResolutionIssueCode;
  path: string;
  message: string;
}

export interface CalculatorDeckResolution {
  schemaVersion: 1;
  mode: "catalog-derived" | "catalog-with-overrides";
  deck: DeckSnapshot;
  issues: CalculatorDeckResolutionIssue[];
}

function calculateCatalogSummonStats(
  summon: CalculatorDeckConfig["summons"][number],
  master: SummonMasterCatalogEntry | undefined,
): { attack: number; hp: number } | undefined {
  if (master?.levelStats === undefined || summon.level === undefined) return undefined;
  const minimumLevel = master.levelStats.points[0]?.level;
  if (minimumLevel === undefined || summon.level < minimumLevel || summon.level > master.levelStats.maximumLevel) {
    return undefined;
  }
  return calculateEquipmentLevelStats(master.levelStats, summon.level, summon.plusMark ?? 0, {
    attack: 5,
    hp: 1,
  });
}

function jobGrowthStats(
  selectedJob: ReturnType<typeof createSelectableJobCatalog>["jobs"][number] | undefined,
  protagonist: CalculatorDeckConfig["protagonist"],
): { attack: number; hp: number } {
  if (selectedJob === undefined) return { attack: 0, hp: 0 };
  const active = [
    ...selectedJob.jobLevelBonuses.filter((bonus) => bonus.level <= (protagonist.jobLevel ?? 0)),
    ...selectedJob.masterLevelBonuses.filter((bonus) => bonus.level <= (protagonist.masterLevel ?? 0)),
    ...selectedJob.perfectionProofBonuses.filter(
      (bonus) => bonus.level <= (protagonist.perfectionProofLevel ?? 0),
    ),
  ];
  return active.reduce(
    (total, bonus) => ({ attack: total.attack + bonus.attack, hp: total.hp + bonus.hp }),
    { attack: 0, hp: 0 },
  );
}

function appendMissingStatIssues(
  issues: CalculatorDeckResolutionIssue[],
  path: string,
  attack: number | undefined,
  hp: number | undefined,
): void {
  if (attack === undefined) {
    issues.push({
      severity: "warning",
      code: "missing-stat-override",
      path: `${path}.attackOverride`,
      message: "Attack cannot be derived until master/stat calculation data is available.",
    });
  }
  if (hp === undefined) {
    issues.push({
      severity: "warning",
      code: "missing-stat-override",
      path: `${path}.hpOverride`,
      message: "HP cannot be derived until master/stat calculation data is available.",
    });
  }
}

function calculateCatalogWeaponStats(
  weapon: CalculatorDeckConfig["weapons"][number],
  master: WeaponMasterCatalogEntry | undefined,
): { attack: number; hp: number } | undefined {
  if (master?.levelStats === undefined || weapon.level === undefined) return undefined;
  const minimumLevel = master.levelStats.points[0]?.level;
  if (minimumLevel === undefined || weapon.level < minimumLevel || weapon.level > master.levelStats.maximumLevel) {
    return undefined;
  }
  return calculateEquipmentLevelStats(master.levelStats, weapon.level, weapon.plusMark ?? 0, {
    attack: 5,
    hp: 1,
  });
}

/**
 * Resolves the stable user-editable config without inventing unavailable master
 * data. Overrides become observed stats; unresolved mechanics are reported.
 */
export function resolveCalculatorDeckConfig(
  input: unknown,
  supportSummon?: ResolvedSupportSummon,
): CalculatorDeckResolution {
  const catalog = loadIncrementalWeaponCatalog();
  const fallbackWeaponCatalog = loadJobFallbackWeaponCatalog();
  const jobCatalog = createSelectableJobCatalog();
  const config: CalculatorDeckConfig = applyCalculatorDeckEquipmentRules(
    parseCalculatorDeckConfig(input),
    {
      jobs: jobCatalog,
      fallbackWeapons: fallbackWeaponCatalog,
      weapons: catalog,
    },
  );
  const summonCatalog = loadIncrementalSummonCatalog();
  const issues: CalculatorDeckResolutionIssue[] = [];
  const selectedJob = jobCatalog.jobs.find((job) => job.jobId === config.protagonist.jobId);
  const resolvedWeaponStats = config.weapons.map((weapon) => {
    const master = catalog.weapons.get(weapon.weaponId);
    const fallbackMaster = weapon.isJobFallback
      ? fallbackWeaponCatalog.byWeaponId.get(weapon.weaponId)
      : undefined;
    const stats = calculateCatalogWeaponStats(weapon, master) ?? (
      weapon.attackOverride === undefined || weapon.hpOverride === undefined
        ? undefined
        : { attack: weapon.attackOverride, hp: weapon.hpOverride }
    );
    return { stats, weaponKindCode: master?.weaponKindCode ?? fallbackMaster?.weaponKindCode };
  });
  const resolvedSummonStats = config.summons.map((summon) => {
    const master = summonCatalog.summons.get(summon.summonId);
    return calculateCatalogSummonStats(summon, master) ?? (
      summon.attackOverride === undefined || summon.hpOverride === undefined
        ? undefined
        : { attack: summon.attackOverride, hp: summon.hpOverride }
    );
  });
  const contributingSummonIndexes = config.summons.flatMap((summon, index) =>
    summon.position === "main" || summon.position === "grid" ? [index] : []
  );
  const canDeriveDisplayedStats =
    config.protagonist.rank !== undefined &&
    selectedJob !== undefined &&
    config.protagonist.masterBonusAttackPercent !== undefined &&
    config.protagonist.masterBonusHpPercent !== undefined &&
    config.protagonist.mainWeaponCompletionAttackContribution !== undefined &&
    resolvedWeaponStats.every((entry) => entry.stats !== undefined && entry.weaponKindCode !== undefined) &&
    contributingSummonIndexes.every((index) => resolvedSummonStats[index] !== undefined);
  const growthStats = jobGrowthStats(selectedJob, config.protagonist);
  const displayedStats = canDeriveDisplayedStats
    ? calculateProtagonistDisplayedStats({
        rank: config.protagonist.rank!,
        jobGrowthAttack: growthStats.attack,
        jobGrowthHp: growthStats.hp,
        attackLimitBonusLevel: config.protagonist.attackLimitBonusLevel,
        hpLimitBonusLevel: config.protagonist.hpLimitBonusLevel,
        completionAttackPercent: config.protagonist.masterBonusAttackPercent!,
        completionHpPercent: config.protagonist.masterBonusHpPercent!,
        mainWeaponCompletionAttack: config.protagonist.mainWeaponCompletionAttackContribution!,
        jobWeaponKindCodes: selectedJob!.weaponKinds.map((weaponKind) => weaponKind.code),
        weapons: resolvedWeaponStats.map((entry) => ({
          attack: entry.stats!.attack,
          hp: entry.stats!.hp,
          weaponKindCode: entry.weaponKindCode,
        })),
        summons: contributingSummonIndexes.map((index) => resolvedSummonStats[index]!),
      })
    : undefined;
  const jobVerificationStatus: "検証済み" | "下書き" =
    selectedJob?.verificationStatus === "検証済み" ? "検証済み" : "下書き";
  if (displayedStats === undefined && ((config.protagonist.attackLimitBonusLevel ?? 0) > 0 || (config.protagonist.hpLimitBonusLevel ?? 0) > 0)) {
    issues.push({
      severity: "warning",
      code: "protagonist-lb-components-unresolved",
      path: "protagonist",
      message: "LBを反映するにはRank・ジョブ・装備ステータス・コンプリートボーナスを設定してください。表示ATK/HPの直接入力にはLBを追加加算しません。",
    });
  }
  const multiattackRateBonuses: DeckJobMultiattackRateBonus[] = selectedJob === undefined
    ? []
    : [
        ...selectedJob.jobLevelMultiattackBonuses
          .filter((bonus) => bonus.level <= (config.protagonist.jobLevel ?? 0))
          .map((bonus) => ({ ...bonus, sourceType: "job-level" as const, verificationStatus: jobVerificationStatus })),
        ...selectedJob.masterLevelMultiattackBonuses
          .filter((bonus) => bonus.level <= (config.protagonist.masterLevel ?? 0))
          .map((bonus) => ({ ...bonus, sourceType: "master-level" as const, verificationStatus: jobVerificationStatus })),
        ...selectedJob.perfectionProofMultiattackBonuses
          .filter((bonus) => bonus.level <= (config.protagonist.perfectionProofLevel ?? 0))
          .map((bonus) => ({ ...bonus, sourceType: "perfection-proof" as const, verificationStatus: jobVerificationStatus })),
      ];

  appendMissingStatIssues(
    issues,
    "protagonist",
    displayedStats?.attack ?? config.protagonist.attackOverride,
    displayedStats?.hp ?? config.protagonist.hpOverride,
  );
  if (config.protagonist.jobId !== undefined) {
    issues.push({
      severity: "warning",
      code: "job-master-data-unresolved",
      path: "protagonist.jobId",
      message: `ジョブ ${selectedJob?.name ?? config.protagonist.jobId} の得意武器と育成段階のATK・HP・連続攻撃率は解決済みですが、防御・上限・アビリティ等は未解決です。`,
    });
  }

  config.weapons.forEach((weapon, index) => {
    const master = catalog.weapons.get(weapon.weaponId);
    const calculatedStats = resolvedWeaponStats[index]?.stats;
    appendMissingStatIssues(
      issues,
      `weapons.${index}`,
      calculatedStats?.attack,
      calculatedStats?.hp,
    );
    const fallbackMaster = weapon.isJobFallback
      ? fallbackWeaponCatalog.byWeaponId.get(weapon.weaponId)
      : undefined;
    if (master === undefined && fallbackMaster === undefined) {
      issues.push({
        severity: "warning",
        code: "weapon-master-data-unresolved",
        path: `weapons.${index}.weaponId`,
        message: `Weapon ${weapon.weaponId} is not registered in the incremental catalog.`,
      });
      return;
    }
    master?.skillSlots.forEach((slot) => {
      const skill = catalog.skills.get(slot.skillId);
      if (skill === undefined) {
        issues.push({
          severity: "warning",
          code: "weapon-skill-data-unresolved",
          path: `weapons.${index}.weaponId`,
          message: `Weapon skill ${slot.skillId} is not registered in the incremental catalog.`,
        });
      } else {
        if (skill.verificationStatus !== "検証済み") {
          issues.push({
            severity: "warning",
            code: "unverified-weapon-skill",
            path: `weapons.${index}.weaponId`,
            message: `Weapon skill ${skill.skillId} (${skill.name}) is ${skill.verificationStatus}.`,
          });
        }
        if (
          skill.effects.some(
            (effect) =>
              effect.verificationStatus !== undefined &&
              effect.verificationStatus !== "検証済み" &&
              (effect.skillLevel === undefined || weapon.skillLevel === effect.skillLevel),
          )
        ) {
          issues.push({
            severity: "warning",
            code: "unverified-weapon-skill-effect",
            path: `weapons.${index}.weaponId`,
            message: `Weapon skill ${skill.skillId} (${skill.name}) has a provisional numeric effect at SLv${weapon.skillLevel ?? "unknown"}.`,
          });
        }
      }
      if (skill?.unsupportedEffects !== undefined) {
        issues.push({
          severity: "warning",
          code: "weapon-skill-partially-supported",
          path: `weapons.${index}.weaponId`,
          message: `Weapon skill ${skill.skillId} (${skill.name}) does not yet calculate: ${skill.unsupportedEffects.join(", ")}.`,
        });
      }
    });
  });

  const mainWeaponIndex = config.weapons.findIndex((weapon) => weapon.position === "main");
  const mainWeapon = config.weapons[mainWeaponIndex];
  if (selectedJob !== undefined && mainWeapon !== undefined) {
    const regularMaster = catalog.weapons.get(mainWeapon.weaponId);
    const fallbackMaster = mainWeapon.isJobFallback
      ? fallbackWeaponCatalog.byWeaponId.get(mainWeapon.weaponId)
      : undefined;
    const weaponKindCode = regularMaster?.weaponKindCode ?? fallbackMaster?.weaponKindCode;
    if (
      weaponKindCode !== undefined &&
      !selectedJob.weaponKinds.some((weaponKind) => weaponKind.code === weaponKindCode)
    ) {
      const allowedNames = selectedJob.weaponKinds.map((weaponKind) => weaponKind.name).join(" / ");
      const selectedKindName = jobCatalog.jobs
        .flatMap((job) => job.weaponKinds)
        .find((weaponKind) => weaponKind.code === weaponKindCode)?.name;
      issues.push({
        severity: "warning",
        code: "main-weapon-incompatible-with-job",
        path: `weapons.${mainWeaponIndex}.weaponId`,
        message: `${selectedJob.name}の得意武器は${allowedNames}です。メイン武器「${regularMaster?.name ?? fallbackMaster?.name ?? mainWeapon.nameHint ?? mainWeapon.weaponId}」${selectedKindName === undefined ? "" : `（${selectedKindName}）`}は装備できません。設定は自動削除していません。`,
      });
    }
  }
  config.summons.forEach((summon, index) => {
    const calculatedStats = resolvedSummonStats[index];
    appendMissingStatIssues(issues, `summons.${index}`, calculatedStats?.attack, calculatedStats?.hp);
    if (!summonCatalog.summons.has(summon.summonId)) {
      issues.push({
        severity: "warning",
        code: "summon-aura-unresolved",
        path: `summons.${index}.summonId`,
        message: `Summon ${summon.summonId} is identified, but its aura is not resolved yet.`,
      });
    }
  });
  config.characters.forEach((character, index) => {
    appendMissingStatIssues(issues, `characters.${index}`, character.attackOverride, character.hpOverride);
    issues.push({
      severity: "warning",
      code: "character-passives-unresolved",
      path: `characters.${index}.characterId`,
      message: `Character ${character.characterId} is identified, but its passive effects are not resolved yet.`,
    });
  });

  const deck: DeckSnapshot = {
    schemaVersion: 1,
    name: config.name,
    protagonist: {
      elementCode: config.protagonist.elementCode,
      attack: displayedStats?.attack ?? config.protagonist.attackOverride,
      hp: displayedStats?.hp ?? config.protagonist.hpOverride,
      job:
        config.protagonist.jobId === undefined
          ? undefined
          : {
              masterId: config.protagonist.jobId,
              name: selectedJob?.name ?? config.protagonist.jobNameHint,
              classCode: selectedJob?.classTier === "ClassV" ? "5" : selectedJob?.classTier,
              weaponKindCodes: selectedJob?.weaponKinds.map((weaponKind) => weaponKind.code) ?? [],
              baseDoubleAttackRate:
                config.protagonist.baseDoubleAttackRate ?? selectedJob?.baseDoubleAttackRate,
              baseTripleAttackRate:
                config.protagonist.baseTripleAttackRate ?? selectedJob?.baseTripleAttackRate,
              jobCompletionDoubleAttackRate: config.protagonist.jobCompletionDoubleAttackRate,
              jobCompletionTripleAttackRate: config.protagonist.jobCompletionTripleAttackRate,
              multiattackRateBonuses,
              level: config.protagonist.jobLevel,
              masterLevel: config.protagonist.masterLevel,
              perfectionProofLevel: config.protagonist.perfectionProofLevel,
              damageModifiers: fireAttackLimitBonusModifiers(config.protagonist),
            },
    },
    weapons: config.weapons.map((weapon, index) => {
      const master = catalog.weapons.get(weapon.weaponId);
      const calculatedStats = resolvedWeaponStats[index]?.stats;
      const fallbackMaster = weapon.isJobFallback
        ? fallbackWeaponCatalog.byWeaponId.get(weapon.weaponId)
        : undefined;
      const skills =
        master?.skillSlots.flatMap((slot) => {
          const skill = catalog.skills.get(slot.skillId);
          if (skill === undefined) return [];
          return [
            {
              sourceKey: slot.sourceKey,
              id: skill.skillId,
              name: skill.name,
              description: skill.description,
              verificationStatus: skill.verificationStatus,
              source: skill.source,
              confirmedAt: skill.confirmedAt,
              effects: skill.effects,
            },
          ];
        }) ?? [];
      return {
        slot: weapon.slot,
        position: weapon.position,
        masterId: weapon.weaponId,
        isJobFallback: weapon.isJobFallback,
        name: master?.name ?? fallbackMaster?.name ?? weapon.nameHint,
        elementCode: master?.elementCode ?? fallbackMaster?.elementCode,
        weaponKindCode: master?.weaponKindCode ?? fallbackMaster?.weaponKindCode,
        rarityCode: master?.rarityCode ?? fallbackMaster?.rarityCode,
        seriesId: master?.seriesId,
        level: weapon.level,
        skillLevel: weapon.skillLevel,
        uncapLevel: weapon.uncapLevel,
        plusMark: weapon.plusMark,
        awakening: weapon.awakening,
        attack: calculatedStats?.attack,
        hp: calculatedStats?.hp,
        skills,
      };
    }),
    summons: config.summons.map((summon, index) => {
      const master = summonCatalog.summons.get(summon.summonId);
      const calculatedStats = resolvedSummonStats[index];
      const resolvedAura =
        master === undefined ? undefined : resolveCatalogSummonAura(master, summon.uncapLevel);
      return {
        slot: summon.slot,
        position: summon.position,
        masterId: summon.summonId,
        name: master?.name ?? summon.nameHint,
        elementCode: master?.elementCode,
        rarityCode: master?.rarityCode,
        level: summon.level,
        uncapLevel: summon.uncapLevel,
        plusMark: summon.plusMark,
        attack: calculatedStats?.attack,
        hp: calculatedStats?.hp,
        aura:
          master === undefined
            ? undefined
            : {
                name: master.auraName,
                description: resolvedAura?.auraDescription ?? master.auraDescription,
                effects: resolvedAura?.auraEffects ?? master.auraEffects,
                verificationStatus: resolvedAura?.verificationStatus ?? master.verificationStatus,
                source: resolvedAura?.source ?? master.source,
                confirmedAt: resolvedAura?.confirmedAt ?? master.confirmedAt,
              },
      };
    }),
    characters: config.characters.map((character) => ({
      slot: character.slot,
      position: character.position,
      masterId: character.characterId,
      name: character.nameHint,
      level: character.level,
      uncapLevel: character.uncapLevel,
      plusMark: character.plusMark,
      attack: character.attackOverride,
      hp: character.hpOverride,
    })),
  };

  const effectResolution = resolveEffectiveWeaponSkillEffects(
    deck.weapons,
    deck.summons,
    supportSummon,
  );
  deck.effectiveWeaponSkillEffects = effectResolution.effects;
  deck.effectiveCharacterHpAuras = resolveEffectiveCharacterHpAuras(
    deck.summons,
    deck.protagonist.elementCode,
  );
  deck.effectiveCharacterHpFlatAuras = resolveEffectiveCharacterHpFlatAuras(
    deck.summons,
    deck.protagonist.elementCode,
  );
  issues.push(
    ...effectResolution.issues.map((issue) => ({
      severity: "warning" as const,
      code: issue.code,
      path: issue.path,
      message: issue.message,
    })),
  );

  return {
    schemaVersion: 1,
    mode: displayedStats === undefined ? "catalog-with-overrides" : "catalog-derived",
    deck,
    issues,
  };
}
