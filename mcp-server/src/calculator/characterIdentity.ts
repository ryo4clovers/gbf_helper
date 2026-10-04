// Explicit aliases for implemented models. Image IDs alone must not select a combat
// model: alternate styles can share the same image master ID.
const MODEL_ALIASES: Readonly<Record<string, string>> = {
  "dark-ssr-cidala-valentine": "3040512000",
  "dark-ssr-sariel-limited": "3040611000",
  "dark-ssr-ilsa-yukata": "3040456000",
};

export function resolveCharacterModelId(characterId: string): string {
  return Object.hasOwn(MODEL_ALIASES, characterId) ? MODEL_ALIASES[characterId] : characterId;
}
