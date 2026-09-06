import { parseCalculatorDeckConfig } from "./calculatorDeckConfig.js";
import { applyCalculatorDeckEquipmentRules } from "./calculatorDeckEquipmentRules.js";
import { createSelectableJobCatalog } from "./jobCatalogView.js";
import { loadJobFallbackWeaponCatalog } from "./jobFallbackWeaponCatalog.js";
import { loadIncrementalSummonCatalog } from "./summonCatalog.js";
import { loadIncrementalWeaponCatalog } from "./weaponCatalog.js";
import { resolveEffectiveWeaponSkillEffects } from "./weaponEffectResolver.js";
import type {
  CalculatorDeckConfig,
  DeckJobMultiattackRateBonus,
  DeckSnapshot,
  ResolvedSupportSummon,
} from "./types.js";

export type CalculatorDeckResolutionIssueCode =
  | "missing-stat-override"
  | "job-master-data-unresolved"
  | "main-weapon-incompatible-with-job"
  | "weapon-master-data-unresolved"
  | "weapon-skill-data-unresolved"
  | "unverified-weapon-skill"
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
  mode: "catalog-with-overrides";
  deck: DeckSnapshot;
  issues: CalculatorDeckResolutionIssue[];
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
  const jobVerificationStatus: "検証済み" | "下書き" =
    selectedJob?.verificationStatus === "検証済み" ? "検証済み" : "下書き";
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
    config.protagonist.attackOverride,
    config.protagonist.hpOverride,
  );
  if (config.protagonist.jobId !== undefined) {
    issues.push({
      severity: "warning",
      code: "job-master-data-unresolved",
      path: "protagonist.jobId",
      message: `ジョブ ${selectedJob?.name ?? config.protagonist.jobId} の得意武器と登録済み連続攻撃率は解決済みですが、その他の戦闘用マスターデータは未解決です。`,
    });
  }

  config.weapons.forEach((weapon, index) => {
    appendMissingStatIssues(issues, `weapons.${index}`, weapon.attackOverride, weapon.hpOverride);
    const master = catalog.weapons.get(weapon.weaponId);
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
      } else if (skill.verificationStatus !== "検証済み") {
        issues.push({
          severity: "warning",
          code: "unverified-weapon-skill",
          path: `weapons.${index}.weaponId`,
          message: `Weapon skill ${skill.skillId} (${skill.name}) is ${skill.verificationStatus}.`,
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
    appendMissingStatIssues(issues, `summons.${index}`, summon.attackOverride, summon.hpOverride);
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
      attack: config.protagonist.attackOverride,
      hp: config.protagonist.hpOverride,
      job:
        config.protagonist.jobId === undefined
          ? undefined
          : {
              masterId: config.protagonist.jobId,
              name: selectedJob?.name ?? config.protagonist.jobNameHint,
              weaponKindCodes: selectedJob?.weaponKinds.map((weaponKind) => weaponKind.code) ?? [],
              baseDoubleAttackRate:
                config.protagonist.baseDoubleAttackRate ?? selectedJob?.baseDoubleAttackRate,
              baseTripleAttackRate:
                config.protagonist.baseTripleAttackRate ?? selectedJob?.baseTripleAttackRate,
              multiattackRateBonuses,
              level: config.protagonist.jobLevel,
              masterLevel: config.protagonist.masterLevel,
              perfectionProofLevel: config.protagonist.perfectionProofLevel,
            },
    },
    weapons: config.weapons.map((weapon) => {
      const master = catalog.weapons.get(weapon.weaponId);
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
        attack: weapon.attackOverride,
        hp: weapon.hpOverride,
        skills,
      };
    }),
    summons: config.summons.map((summon) => {
      const master = summonCatalog.summons.get(summon.summonId);
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
        attack: summon.attackOverride,
        hp: summon.hpOverride,
        aura:
          master === undefined
            ? undefined
            : {
                name: master.auraName,
                description: master.auraDescription,
                effects: master.auraEffects,
                verificationStatus: master.verificationStatus,
                source: master.source,
                confirmedAt: master.confirmedAt,
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
  issues.push(
    ...effectResolution.issues.map((issue) => ({
      severity: "warning" as const,
      code: issue.code,
      path: issue.path,
      message: issue.message,
    })),
  );

  return { schemaVersion: 1, mode: "catalog-with-overrides", deck, issues };
}
