import { z } from "zod";
import { parseCharacterDamageSettings } from "./calculatorDeckConfig.js";
import { importCharacterLimitBonuses } from "./characterNormalAttack.js";

const captureSchema = z.object({ apiCalls: z.array(z.object({ url: z.string(), timestamp: z.number().finite(), body: z.unknown() })).max(10_000) });
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

/** The content response identifies the public master in inert, URL-encoded HTML. Never execute it. */
function masterySettings(body: Record<string, unknown>) {
  if (typeof body.data !== "string") throw new Error("Character mastery content is missing");
  let html: string;
  try { html = decodeURIComponent(body.data); } catch { throw new Error("Character mastery content encoding is invalid"); }
  const input = [...html.matchAll(/<input\b[^>]*>/g)].map(match => match[0])
    .find(tag => /\bid\s*=\s*["']id-of-npc-master["']/.test(tag));
  const characterId = input?.match(/\bvalue\s*=\s*["'](\d{10})["']/)?.[1];
  if (!characterId) throw new Error("Character mastery master ID is missing");
  const rows = record(record(body.option).npcaugment).param_data;
  if (!Array.isArray(rows)) throw new Error("Current character mastery effects are missing");
  const ring: unknown[] = [];
  const earring: unknown[] = [];
  for (const raw of rows) {
    const row = record(raw);
    const type = record(row.type);
    const param = record(row.param);
    const slot = row.slot_number;
    if (typeof slot !== "number" || ![1, 2, 3, 4].includes(slot)) throw new Error("Unsupported character mastery slot");
    if (typeof param.total_param !== "number" && typeof param.total_param !== "string") throw new Error("Character mastery value is missing");
    if (String(param.total_param).trim() === "") throw new Error("Character mastery value is missing");
    const effect = { bonusId: String(type.id), name: type.name, value: Number(param.total_param),
      unit: /[%％]$/.test(String(param.disp_total_param)) ? "percent" : type.name === "渾身" || type.name === "背水" ? "rating" : "flat" };
    (slot === 4 ? earring : ring).push(effect);
  }
  return parseCharacterDamageSettings([{ characterId, mastery: { ring, earring } }])[0];
}

/** Offline supplements explicitly supplied by the caller; dates need not precede the battle.
 * Only character master IDs and applied enhancement effects leave this importer.
 * Owned identifiers, innate ATK/HP and account metadata never become calculator settings.
 */
export function importCharacterEnhancementExports(inputs: unknown[]) {
  const calls = inputs.flatMap((input) => captureSchema.parse(input).apiCalls)
    .map((call) => ({ ...call, path: new URL(call.url).pathname, time: call.timestamp }))
    .filter(call => /^\/(?:npc\/npc|npczenith\/(?:bonus_list|content\/index))\/\d+$/.test(call.path))
    .map(call => {
      let body = call.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { throw new Error("Character enhancement response is not valid JSON"); }
      }
      return { path: call.path, time: call.time, body: record(body) };
    })
    .sort((a, b) => a.time - b.time);
  const settings = new Map<string, ReturnType<typeof parseCharacterDamageSettings>[number]>();
  for (const call of calls.filter((call) => /^\/npc\/npc\/\d+$/.test(call.path) || /^\/npczenith\/content\/index\/\d+$/.test(call.path))) {
    if (call.path.includes("/content/index/")) {
      const setting = masterySettings(call.body);
      settings.set(setting.characterId, { ...settings.get(setting.characterId), ...setting });
      continue;
    }
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
    settings.set(characterId, { ...settings.get(characterId), ...setting });
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
