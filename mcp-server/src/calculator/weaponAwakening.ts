import { readFileSync } from "node:fs";
import { z } from "zod";
import { weaponSkillEffectSchema } from "./weaponCatalog.js";
import type { DeckWeapon, EffectiveWeaponSkillEffect } from "./types.js";

const catalogSchema = z.object({
  schemaVersion: z.literal(1), verificationStatus: z.literal("下書き"),
  checkedAt: z.string(), sources: z.array(z.string().url()).min(1), note: z.string(),
  minimumWeaponLevel: z.literal(150), minimumUncapLevel: z.literal(4), maximumLevel: z.literal(4),
  types: z.array(z.object({
    formCode: z.string().startsWith("limited-"), name: z.string(),
    effects: z.array(z.object({ level: z.number().int().min(2).max(4) }).passthrough()
      .transform(({ level, ...effect }) => ({ level, effect: weaponSkillEffectSchema.parse(effect) }))),
  }).strict()),
  weapons: z.array(z.object({ weaponId: z.string(), name: z.string(), types: z.array(z.string()).length(2) }).strict()),
}).strict();

const catalog = catalogSchema.parse(JSON.parse(readFileSync(new URL("../../catalog/weapon-awakenings.v1.json", import.meta.url), "utf8")));
const types = new Map(catalog.types.map(type => [type.formCode, type]));
const weapons = new Map(catalog.weapons.map(weapon => [weapon.weaponId, weapon]));
if (types.size !== catalog.types.length || weapons.size !== catalog.weapons.length
  || catalog.weapons.some(weapon => new Set(weapon.types).size !== 2 || weapon.types.some(type => !types.has(type)))) {
  throw new Error("Weapon awakening catalog has duplicate or unresolved IDs");
}

/** Public master data shared by the selector and calculator; no inventory or game form IDs. */
export function weaponAwakeningOptions(weaponId: string) {
  const weapon = weapons.get(weaponId);
  if (!weapon) return undefined;
  return { minimumWeaponLevel: catalog.minimumWeaponLevel, minimumUncapLevel: catalog.minimumUncapLevel,
    maximumLevel: catalog.maximumLevel, verificationStatus: catalog.verificationStatus,
    sources: catalog.sources, types: weapon.types.map(code => types.get(code)!) };
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
    const type = options?.types.find(type => type.formCode === selection.formCode);
    const path = `weapons.${index}.awakening`;
    if (!type || !Number.isInteger(selection.level) || selection.level! < 1 || selection.level! > options!.maximumLevel) {
      issues.push({ code: "weapon-awakening-unresolved", path,
        message: `${weapon.name ?? weapon.masterId}: 覚醒タイプ・Lvが未対応または不明のため未反映です。武器設定で対応タイプとLv1〜4を選択してください（実機のタイプ番号は未照合）。` });
      return;
    }
    // Legacy imports without evolution can prove the unlock through Lv150, which requires 4★.
    if ((weapon.level ?? 0) < options!.minimumWeaponLevel
      || (weapon.uncapLevel !== undefined && weapon.uncapLevel < options!.minimumUncapLevel)) {
      issues.push({ code: "weapon-awakening-inactive", path,
        message: `${weapon.name ?? weapon.masterId}: 覚醒効果は4凸・武器Lv150以上で反映します。設定は保持しています。` });
      return;
    }
    const increments = type.effects.filter(increment => increment.level <= selection.level!);
    for (const { level, effect } of increments) {
      effects.push({ sourceWeaponSlot: weapon.slot, sourceWeaponId: weapon.masterId,
        sourceSkillId: `awakening:${type.formCode}:${level}`, sourceSkillName: `覚醒・${type.name} Lv${level}`,
        kind: effect.kind, baseAmountPercent: effect.amountPercent ?? 0, effectiveAmountPercent: effect.amountPercent ?? 0,
        ...(effect.amountFlat === undefined ? {} : { baseAmountFlat: effect.amountFlat, effectiveAmountFlat: effect.amountFlat }),
        verificationStatus: "下書き", appliedModifiers: [] });
    }
    if (increments.length) issues.push({ code: "weapon-awakening-unverified", path,
      message: `${weapon.name ?? weapon.masterId}: 覚醒・${type.name}Lv${selection.level}を加護対象外・全属性共通として反映（二次情報・要検証）。複数本/既存武器枠との上限・丸めは実測未確認です。` });
  });
  return { effects, issues };
}
