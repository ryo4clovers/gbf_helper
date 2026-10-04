import { readFileSync } from "node:fs";
import { z } from "zod";
import { weaponSkillEffectSchema } from "./weaponCatalog.js";
import type { DeckWeapon, EffectiveWeaponSkillEffect } from "./types.js";

const catalogSchema = z.object({
  schemaVersion: z.literal(1), verificationStatus: z.literal("下書き"),
  checkedAt: z.string(), sources: z.array(z.string().url()).min(1), note: z.string(),
  minimumWeaponLevel: z.number().int().positive(), minimumUncapLevel: z.number().int().nonnegative(), maximumLevel: z.number().int().positive(),
  types: z.array(z.object({
    formCode: z.string().min(1), name: z.string(),
    statBonuses: z.array(z.object({ level: z.number().int().min(2).max(20), attack: z.number().int().nonnegative().optional(), hp: z.number().int().nonnegative().optional() }).strict()).optional(),
    effects: z.array(z.object({ level: z.number().int().min(2).max(20) }).passthrough()
      .transform(({ level, ...effect }) => ({ level, effect: weaponSkillEffectSchema.parse(effect) }))),
  }).strict()),
  weapons: z.array(z.object({ weaponId: z.string(), name: z.string(), types: z.array(z.string()).min(1),
    observedGameForms: z.record(z.string().regex(/^\d+$/), z.string()).optional(),
  }).strict()),
}).strict();

const catalog = catalogSchema.parse(JSON.parse(readFileSync(new URL("../../catalog/weapon-awakenings.v1.json", import.meta.url), "utf8")));
const revans = catalogSchema.parse(JSON.parse(readFileSync(new URL("../../catalog/weapon-awakenings-revans.v1.json", import.meta.url), "utf8")));
const catalogs = [catalog, revans];
const types = new Map(catalogs.flatMap(c => c.types).map(type => [type.formCode, type]));
const weapons = new Map(catalogs.flatMap(c => c.weapons).map(weapon => [weapon.weaponId, weapon]));
if (types.size !== catalogs.reduce((n,c) => n+c.types.length,0) || weapons.size !== catalogs.reduce((n,c) => n+c.weapons.length,0)
  || catalogs.flatMap(c => c.weapons).some(weapon => new Set(weapon.types).size !== weapon.types.length || weapon.types.some(type => !types.has(type))
    || Object.values(weapon.observedGameForms ?? {}).some(type => !weapon.types.includes(type)))) {
  throw new Error("Weapon awakening catalog has duplicate or unresolved IDs");
}

/** Public master data; observed game form codes are scoped to the weapon master, never inventory IDs. */
export function weaponAwakeningOptions(weaponId: string) {
  const weapon = weapons.get(weaponId);
  if (!weapon) return undefined;
  const catalog = catalogs.find(c => c.weapons.some(w => w.weaponId === weaponId))!;
  return { minimumWeaponLevel: catalog.minimumWeaponLevel, minimumUncapLevel: catalog.minimumUncapLevel,
    maximumLevel: catalog.maximumLevel, verificationStatus: catalog.verificationStatus,
    sources: catalog.sources, types: weapon.types.map(code => ({ ...types.get(code)!,
      gameFormCodes: Object.entries(weapon.observedGameForms ?? {}).filter(([, type]) => type === code).map(([form]) => form),
    })) };
}

export type WeaponAwakeningIssueCode = "weapon-awakening-unresolved" | "weapon-awakening-inactive" | "weapon-awakening-unverified";

/** Resolve separately from SLv skills so auras, skill boosts, and release levels never amplify awakening. */
export function resolveWeaponAwakenings(deckWeapons: DeckWeapon[]) {
  const effects: EffectiveWeaponSkillEffect[] = [];
  const issues: Array<{ code: WeaponAwakeningIssueCode; path: string; message: string }> = [];
  deckWeapons.forEach((weapon, index) => {
    const selection = weapon.awakening;
    if (!selection || (selection.level ?? 0) === 0 && !selection.formCode) return;
    const options = weaponAwakeningOptions(weapon.masterId);
    const type = options?.types.find(type => type.formCode === selection.formCode || type.gameFormCodes.includes(selection.formCode ?? ""));
    const path = `weapons.${index}.awakening`;
    if (!type || !Number.isInteger(selection.level) || selection.level! < 1 || selection.level! > options!.maximumLevel) {
      issues.push({ code: "weapon-awakening-unresolved", path,
        message: `${weapon.name ?? weapon.masterId}: 覚醒タイプ・Lvが未対応または不明のため未反映です。武器設定で対応タイプと対応Lvを選択してください（実機番号は武器ごとに照合済みのものだけ対応）。` });
      return;
    }
    // Legacy imports without evolution can prove the unlock through Lv150, which requires 4★.
    if ((weapon.level ?? 0) < options!.minimumWeaponLevel
      || (weapon.uncapLevel !== undefined && weapon.uncapLevel < options!.minimumUncapLevel)) {
      issues.push({ code: "weapon-awakening-inactive", path,
        message: `${weapon.name ?? weapon.masterId}: 覚醒効果は${options!.minimumUncapLevel}凸・武器Lv${options!.minimumWeaponLevel}以上で反映します。設定は保持しています。` });
      return;
    }
    const increments = type.effects.filter(increment => increment.level <= selection.level!);
    for (const { level, effect } of increments) {
      effects.push({ sourceWeaponSlot: weapon.slot, sourceWeaponId: weapon.masterId,
        sourceSkillId: `awakening:${type.formCode}:${level}`, sourceSkillName: `覚醒・${type.name} Lv${level}`,
        kind: effect.kind, elementCode: effect.elementCode, baseAmountPercent: effect.amountPercent ?? 0, effectiveAmountPercent: effect.amountPercent ?? 0,
        ...(effect.amountFlat === undefined ? {} : { baseAmountFlat: effect.amountFlat, effectiveAmountFlat: effect.amountFlat }),
        verificationStatus: "下書き", appliedModifiers: [] });
    }
    if (increments.length) issues.push({ code: "weapon-awakening-unverified", path,
      message: `${weapon.name ?? weapon.masterId}: 覚醒・${type.name}Lv${selection.level}を加護対象外の下書きモデルで反映。実機で確認した表示効果量と、未確認の対象範囲・合算上限・戦闘時の丸めは区別してください。` });
  });
  return { effects, issues };
}
