import { z } from "zod";
import { parseCharacterDamageSettings } from "./calculatorDeckConfig.js";
import { importCharacterLimitBonuses } from "./characterNormalAttack.js";

const captureSchema = z.object({ apiCalls: z.array(z.object({ url: z.string(), timestamp: z.number().finite(), body: z.unknown() })).max(10_000) });
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

/** Offline supplements explicitly supplied by the caller; dates need not precede the battle.
 * Only character master IDs, awakening, ring flags, artifact effects and LB stars leave this importer.
 * Owned identifiers, innate ATK/HP and account metadata never become calculator settings.
 */
export function importCharacterEnhancementExports(inputs: unknown[]) {
  const calls = inputs.flatMap((input) => captureSchema.parse(input).apiCalls)
    .map((call) => ({ path: new URL(call.url).pathname, time: call.timestamp,
      body: record(typeof call.body === "string" ? JSON.parse(call.body) : call.body) }))
    .sort((a, b) => a.time - b.time);
  const settings = new Map<string, ReturnType<typeof parseCharacterDamageSettings>[number]>();
  for (const call of calls.filter((call) => /^\/npc\/npc\/\d+$/.test(call.path))) {
    const body = call.body;
    const characterId = record(body.master).id;
    if (typeof characterId !== "string" || !/^\d{10}$/.test(characterId)) throw new Error("Character detail master ID is missing");
    const artifact = record(body.artifact);
    const skills = [1, 2, 3, 4].flatMap((slot) => {
      const skill = record(artifact[`skill${slot}_info`]);
      if (Object.keys(skill).length === 0) return [];
      return [{ skillId: String(skill.skill_id), name: skill.name, effectValue: skill.effect_value }];
    });
    const [setting] = parseCharacterDamageSettings([{ characterId,
      awakening: { level: body.npc_arousal_level, formCode: body.npc_arousal_form },
      ...(typeof body.has_npcaugment_constant === "boolean" ? { perpetuityRing: body.has_npcaugment_constant } : {}),
      ...(Object.hasOwn(body, "artifact") ? { artifact: { skills } } : {}),
    }]);
    settings.set(characterId, setting);
  }
  for (const call of calls) {
    const characterId = /^\/npczenith\/bonus_list\/(\d{10})$/.exec(call.path)?.[1];
    if (!characterId) continue;
    const setting = settings.get(characterId) ?? { characterId };
    setting.limitBonuses = importCharacterLimitBonuses(call.body);
    settings.set(characterId, setting);
  }
  return [...settings.values()];
}
