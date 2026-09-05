import { z } from "zod";
import type {
  DeckCharacter,
  DeckDisplayedDamageInfo,
  DeckDisplayedEffectValue,
  DamageModifier,
  DeckJob,
  DeckSkill,
  DeckSnapshot,
  DeckSummon,
  DeckWeapon,
} from "./types.js";

type JsonRecord = Record<string, unknown>;

const objectOrNullSchema = z.record(z.unknown()).nullable().optional();

const slotSchema = z
  .object({
    param: objectOrNullSchema,
    master: objectOrNullSchema,
  })
  .passthrough();

const deckResponseSchema = z
  .object({
    deck: z
      .object({
        group_name: z.unknown().optional(),
        name: z.unknown().optional(),
        order_no: z.unknown().optional(),
        priority: z.unknown().optional(),
        npc: z.record(slotSchema),
        pc: z
          .object({
            param: z.record(z.unknown()),
            job: z
              .object({
                master: objectOrNullSchema,
                param: objectOrNullSchema,
              })
              .passthrough()
              .nullable()
              .optional(),
            weapons: z.record(slotSchema),
            summons: z.record(slotSchema),
            sub_summons: z.record(slotSchema),
            damage_info: objectOrNullSchema,
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

function asRecord(value: unknown): JsonRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as JsonRecord;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function optionalId(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const id = optionalString(value);
  if (id === undefined) throw new Error(`${path} must be a string or finite number`);
  return id;
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error(`${path} must be a finite number or numeric string`);
  return parsed;
}

function optionalPercentage(value: unknown): number | undefined {
  const text = optionalString(value);
  if (text === undefined || !/[%％]$/.test(text)) return undefined;
  const parsed = Number(text.slice(0, -1).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === 0 || value === "0") return false;
  if (value === 1 || value === "1") return true;
  throw new Error(`${path} must be a boolean or 0/1`);
}

function slotEntries(record: Record<string, z.infer<typeof slotSchema>>) {
  return Object.entries(record)
    .map(([slot, value]) => ({ slot: Number(slot), value }))
    .filter(({ slot }) => Number.isInteger(slot) && slot > 0)
    .sort((a, b) => a.slot - b.slot);
}

function requireEquipmentIds(
  param: JsonRecord | undefined,
  master: JsonRecord | undefined,
  path: string,
): { instanceId: string; masterId: string } | undefined {
  const instanceId = optionalId(param?.id, `${path}.param.id`);
  const masterId = optionalId(master?.id, `${path}.master.id`);
  if (instanceId === undefined && masterId === undefined) return undefined;
  if (instanceId === undefined || masterId === undefined) {
    throw new Error(`${path} is populated but does not contain both instance and master IDs`);
  }
  return { instanceId, masterId };
}

function normalizeSkill(raw: JsonRecord, sourceKey: DeckSkill["sourceKey"], path: string): DeckSkill | undefined {
  const value = asRecord(raw[sourceKey]);
  if (value === undefined) return undefined;

  const id = optionalId(value.skill_id ?? value.id, `${path}.${sourceKey}.skill_id`);
  const name = optionalString(value.name);
  const description = optionalString(value.comment ?? value.description);
  if (id === undefined && name === undefined && description === undefined) return undefined;

  const level = asRecord(value.level);
  return {
    sourceKey,
    id,
    name,
    description,
    releaseLevel: optionalNumber(level?.release_level, `${path}.${sourceKey}.level.release_level`),
  };
}

function normalizeWeapon(value: z.infer<typeof slotSchema>, slot: number): DeckWeapon | undefined {
  const path = `deck.pc.weapons.${slot}`;
  const param = asRecord(value.param);
  const master = asRecord(value.master);
  const ids = requireEquipmentIds(param, master, path);
  if (ids === undefined) return undefined;

  const source = value as JsonRecord;
  const skillKeys: DeckSkill["sourceKey"][] = ["skill1", "skill2", "skill3", "skill4"];
  const skills = skillKeys
    .map((key) => normalizeSkill(source, key, path))
    .filter((skill): skill is DeckSkill => skill !== undefined);
  const arousal = asRecord(param?.arousal);
  const isAwakeningWeapon = optionalBoolean(arousal?.is_arousal_weapon, `${path}.param.arousal.is_arousal_weapon`);

  return {
    slot,
    position: slot === 1 ? "main" : "grid",
    ...ids,
    name: optionalString(master?.name),
    elementCode: optionalString(master?.attribute),
    weaponKindCode: optionalString(master?.kind),
    rarityCode: optionalString(master?.rarity),
    seriesId: optionalId(master?.series_id, `${path}.master.series_id`),
    level: optionalNumber(param?.level, `${path}.param.level`),
    skillLevel: optionalNumber(param?.skill_level, `${path}.param.skill_level`),
    uncapLevel: optionalNumber(param?.evolution, `${path}.param.evolution`),
    plusMark: optionalNumber(param?.quality, `${path}.param.quality`),
    awakening:
      isAwakeningWeapon === true
        ? {
            level: optionalNumber(arousal?.level, `${path}.param.arousal.level`),
            formCode: optionalString(arousal?.form),
          }
        : undefined,
    attack: optionalNumber(param?.attack, `${path}.param.attack`),
    hp: optionalNumber(param?.hp, `${path}.param.hp`),
    bonusAttack: optionalNumber(param?.bonus_attack, `${path}.param.bonus_attack`),
    bonusHp: optionalNumber(param?.bonus_hp, `${path}.param.bonus_hp`),
    skills,
  };
}

function normalizeSummon(
  value: z.infer<typeof slotSchema>,
  slot: number,
  source: "summons" | "sub_summons",
): DeckSummon | undefined {
  const path = `deck.pc.${source}.${slot}`;
  const param = asRecord(value.param);
  const master = asRecord(value.master);
  const ids = requireEquipmentIds(param, master, path);
  if (ids === undefined) return undefined;

  return {
    slot,
    position: source === "sub_summons" ? "sub" : slot === 1 ? "main" : "grid",
    ...ids,
    name: optionalString(master?.name),
    elementCode: optionalString(master?.attribute),
    rarityCode: optionalString(master?.rarity),
    level: optionalNumber(param?.level, `${path}.param.level`),
    uncapLevel: optionalNumber(param?.evolution, `${path}.param.evolution`),
    plusMark: optionalNumber(param?.quality, `${path}.param.quality`),
    attack: optionalNumber(param?.attack, `${path}.param.attack`),
    hp: optionalNumber(param?.hp, `${path}.param.hp`),
  };
}

function normalizeCharacter(value: z.infer<typeof slotSchema>, slot: number): DeckCharacter | undefined {
  const path = `deck.npc.${slot}`;
  const param = asRecord(value.param);
  const master = asRecord(value.master);
  const ids = requireEquipmentIds(param, master, path);
  if (ids === undefined) return undefined;

  return {
    slot,
    position: slot <= 3 ? "front" : "back",
    ...ids,
    name: optionalString(master?.name),
    elementCode: optionalString(master?.attribute),
    rarityCode: optionalString(master?.rarity),
    level: optionalNumber(param?.level, `${path}.param.level`),
    uncapLevel: optionalNumber(param?.evolution, `${path}.param.evolution`),
    plusMark: optionalNumber(param?.quality, `${path}.param.quality`),
    attack: optionalNumber(param?.attack, `${path}.param.attack`),
    hp: optionalNumber(param?.hp, `${path}.param.hp`),
  };
}

function normalizeJob(value: unknown): DeckJob | undefined {
  const job = asRecord(value);
  const master = asRecord(job?.master);
  if (master === undefined) return undefined;
  const masterId = optionalId(master.id, "deck.pc.job.master.id");
  if (masterId === undefined) return undefined;
  const param = asRecord(job?.param);

  const weaponKindCodes = [master.weapon1, master.weapon2]
    .map(optionalString)
    .filter((code): code is string => code !== undefined);

  const bonus = asRecord(job?.bonue);
  const masterBonuses = Array.isArray(bonus?.master_bonus) ? bonus.master_bonus : [];
  const damageModifiers = masterBonuses.flatMap((rawBonus): DamageModifier[] => {
    const entry = asRecord(rawBonus);
    if (entry === undefined || optionalString(entry.type) !== "my_job_class_if:final_attack_rise_plus") {
      return [];
    }
    const amountPercent = optionalNumber(entry.param, "deck.pc.job.bonue.master_bonus[].param");
    if (amountPercent === undefined) return [];
    return [
      {
        stage: "normal-attack-damage",
        amountPercent,
        sourceType: "job-master-bonus",
        sourceId: "my_job_class_if:final_attack_rise_plus",
        sourceName: optionalString(entry.name) ?? "Class.V以外のジョブの時、通常攻撃の与ダメージUP",
        condition: "non-class-v",
        verificationStatus: "下書き",
      },
    ];
  });

  return {
    masterId,
    name: optionalString(master.name),
    classCode: optionalString(master.class ?? master.ex_class),
    typeCode: optionalString(master.type),
    weaponKindCodes,
    baseDoubleAttackRate: optionalNumber(master.da_odds, "deck.pc.job.master.da_odds"),
    baseTripleAttackRate: optionalNumber(master.ta_odds, "deck.pc.job.master.ta_odds"),
    level: optionalNumber(param?.level, "deck.pc.job.param.level"),
    masterLevel: optionalNumber(param?.master_level, "deck.pc.job.param.master_level"),
    perfectionProofLevel: optionalNumber(
      param?.perfection_proof_level,
      "deck.pc.job.param.perfection_proof_level",
    ),
    damageModifiers,
  };
}

function normalizeDisplayedDamageInfo(value: unknown): DeckDisplayedDamageInfo | undefined {
  const info = asRecord(value);
  if (info === undefined) return undefined;

  const effectValues: DeckDisplayedEffectValue[] = Array.isArray(info.effect_value_info)
    ? info.effect_value_info.flatMap((rawValue, index) => {
        const effect = asRecord(rawValue);
        if (effect === undefined) return [];
        const valueText = optionalString(effect.value);
        return [
          {
            index,
            icon: optionalString(effect.icon_img),
            valueText,
            percentage: optionalPercentage(valueText),
            isMax:
              typeof effect.is_max === "boolean"
                ? effect.is_max
                : effect.is_max === 0 || effect.is_max === "0"
                  ? false
                  : effect.is_max === 1 || effect.is_max === "1"
                    ? true
                    : undefined,
          },
        ];
      })
    : [];

  const enhancement = asRecord(info.weapon_skill_enhance_param);
  const weaponSkillEnhancement =
    enhancement === undefined
      ? undefined
      : {
          normal: optionalNumber(
            enhancement.weapon_skill_enhance,
            "deck.pc.damage_info.weapon_skill_enhance_param.weapon_skill_enhance",
          ),
          magna: optionalNumber(
            enhancement.weapon_skill_enhance_magna,
            "deck.pc.damage_info.weapon_skill_enhance_param.weapon_skill_enhance_magna",
          ),
          evil: optionalNumber(
            enhancement.weapon_skill_enhance_evil,
            "deck.pc.damage_info.weapon_skill_enhance_param.weapon_skill_enhance_evil",
          ),
        };

  return {
    assumedAdvantageElementCode: optionalString(info.assumed_advantage_damage_attribute),
    assumedNormalElementCode: optionalString(info.assumed_normal_damage_attribute),
    assumedAdvantageDamage: optionalNumber(
      info.assumed_advantage_damage,
      "deck.pc.damage_info.assumed_advantage_damage",
    ),
    assumedNormalDamage: optionalNumber(
      info.assumed_normal_damage,
      "deck.pc.damage_info.assumed_normal_damage",
    ),
    hp: optionalNumber(info.hp, "deck.pc.damage_info.hp"),
    effectValues,
    weaponSkillEnhancement,
  };
}

/**
 * Validates and normalizes a live `/party/.../deck` response without retaining
 * unknown account-specific fields. This function never performs network I/O.
 */
export function parseDeckResponse(input: unknown): DeckSnapshot {
  const { deck } = deckResponseSchema.parse(input);
  const pcParam = deck.pc.param;

  return {
    schemaVersion: 1,
    name: optionalString(deck.name),
    groupName: optionalString(deck.group_name),
    orderNo: optionalNumber(deck.order_no, "deck.order_no"),
    priority: optionalNumber(deck.priority, "deck.priority"),
    protagonist: {
      attack: optionalNumber(pcParam.attack, "deck.pc.param.attack"),
      hp: optionalNumber(pcParam.hp, "deck.pc.param.hp"),
      elementCode: optionalString(pcParam.attribute),
      job: normalizeJob(deck.pc.job),
    },
    characters: slotEntries(deck.npc)
      .map(({ slot, value }) => normalizeCharacter(value, slot))
      .filter((character): character is DeckCharacter => character !== undefined),
    weapons: slotEntries(deck.pc.weapons)
      .map(({ slot, value }) => normalizeWeapon(value, slot))
      .filter((weapon): weapon is DeckWeapon => weapon !== undefined),
    summons: [
      ...slotEntries(deck.pc.summons).map(({ slot, value }) => normalizeSummon(value, slot, "summons")),
      ...slotEntries(deck.pc.sub_summons).map(({ slot, value }) =>
        normalizeSummon(value, slot, "sub_summons"),
      ),
    ].filter((summon): summon is DeckSummon => summon !== undefined),
    displayedDamageInfo: normalizeDisplayedDamageInfo(deck.pc.damage_info),
  };
}
