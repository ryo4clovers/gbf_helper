import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { KNOWLEDGE_BASE_PATH } from "../constants.js";
import { resolveWeaponChargeAttack } from "../calculator/weaponChargeAttack.js";
import { AUTOMATIC_ABILITY_PROFILES } from "../calculator/automaticAbilityDamage.js";
import { hasCharacterNormalAttackModel } from "../calculator/characterNormalAttack.js";
import type { WeaponMasterCatalogEntry, WeaponSkillCatalogEntry, SummonMasterCatalogEntry, WeaponSkillEffectKind, SummonAuraEffectDefinition } from "../calculator/types.js";

// Japanese labels follow scripts/sheets/catalog-sheet-data.mjs; catalog view only.
const effectLabels: Record<string, string> = {
  "normal-attack-up": "通常攻刃",
  "ex-attack-up": "EX攻刃",
  "special-ex-attack-up": "EX攻刃（特殊）",
  "weapon-defense-up": "防御力UP（武器スキル）",
  "normal-frame-damage-cap-up": "ダメージ上限UP（通常枠）",
  "special-frame-damage-cap-up": "ダメージ上限UP（特殊枠）",
  "normal-stamina-up": "通常渾身",
  "magna-stamina-up": "方陣渾身",
  "normal-enmity-up": "通常背水",
  "normal-hp-up": "通常HPUP",
  "weapon-hp-down": "武器最大HP減少",
  "battle-start-hp-damage": "開幕HPダメージ",
  "magna-hp-up": "方陣HPUP",
  "normal-skill-boost": "通常スキル効果量UP",
  "character-hp-up": "キャラHPUP",
  "character-hp-down": "キャラ最大HP減少",
  "critical-rate-up": "クリティカル確率UP",
  "double-attack-rate-up": "ダブルアタック確率UP",
  "triple-attack-rate-up": "トリプルアタック確率UP",
  "healing-cap-up": "回復上限UP",
  "debuff-resistance-up": "弱体耐性UP",
  "damage-dealt-up": "与ダメージUP",
  "enemy-defense-ignore": "敵防御無視",
  "normal-only-damage-cap-up": "通常攻撃ダメージ上限UP",
  "normal-only-damage-dealt-up": "通常攻撃与ダメージUP",
  "special-normal-damage-dealt-up": "通常攻撃与ダメージUP（特殊）",
  "elemental-superiority-damage-up": "有利属性与ダメージUP",
  "normal-supplemental-damage": "通常攻撃与ダメージ上昇",
  "destruction-pursuit": "破壊属性追撃",
  "separate-normal-supplemental-damage": "通常攻撃与ダメージ上昇（別枠）",
  "ability-damage-cap-up": "アビリティダメージ上限UP",
  "ability-damage-up": "アビリティダメージUP",
  "charge-damage-up": "奥義ダメージUP",
  "charge-damage-cap-up": "奥義ダメージ上限UP",
  "charge-supplemental-damage": "奥義与ダメージ上昇",
  "special-ability-damage-cap-up": "アビリティダメージ上限UP（特殊枠）",
  "special-ability-damage-dealt-up": "アビリティ与ダメージUP（特殊枠）",
  "ability-supplemental-damage": "アビリティ与ダメージ上昇",
  "supplemental-damage": "与ダメージ上昇",
  "elemental-pursuit": "属性追撃",
  "magna-attack-up": "方陣攻刃",
  "weapon-elemental-attack-up": "武器属性攻撃UP"
};
export const seriesLabels: Record<string, string> = {
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
  "45": "禁禍武器"
};
export type ConnectionStatus = "connected" | "partial" | "unconnected" | "unknown";
export interface CatalogEffectCoverage {
  name: string;
  structured: boolean;
  connection: "connected" | "unconnected" | "unknown";
  scope: string;
  verificationStatus: string;
  source?: string;
  confirmedAt?: string;
  evidence: string[];
  observation: "未確認" | "減衰設定のみ確認・全体未確認";
}
export interface CatalogCoverage {
  missing: string[];
  unknown: string[];
  effects: CatalogEffectCoverage[];
  connection: ConnectionStatus;
  source?: string;
  confirmedAt?: string;
  matrix?: Record<string, { status: "○" | "△" | "×" | "？" | "―"; reason: string }>;
}
export interface CatalogFacets {
  weaponKind: string[];
  series: string[];
  skills: string[];
  effectTypes: string[];
  race: string[];
  gender: string[];
  proficiency: string[];
}
export const emptyFacets = (): CatalogFacets => ({ weaponKind: [], series: [], skills: [], effectTypes: [], race: [], gender: [], proficiency: [] });

// Reviewed consumer paths, not a guess from the existence of an effect name.
// Connection means a calculation/output path exists; it does not assert measured accuracy.
export const weaponRoutes = {
  "magna-attack-up": "src/calculator/normalAttackPowerCalculator.ts",
  "normal-attack-up": "src/calculator/normalAttackPowerCalculator.ts",
  "ex-attack-up": "src/calculator/normalAttackPowerCalculator.ts",
  "special-ex-attack-up": "src/calculator/normalAttackPowerCalculator.ts",
  "weapon-elemental-attack-up": "src/calculator/normalAttackPowerCalculator.ts",
  "normal-stamina-up": "src/calculator/hpDependentAttackCalculator.ts",
  "magna-stamina-up": "src/calculator/hpDependentAttackCalculator.ts",
  "normal-enmity-up": "src/calculator/hpDependentAttackCalculator.ts",
  "normal-hp-up": "src/calculator/protagonistHpCalculator.ts",
  "magna-hp-up": "src/calculator/protagonistHpCalculator.ts",
  "weapon-hp-down": "src/calculator/protagonistHpCalculator.ts",
  "battle-start-hp-damage": "src/calculator/battleHpCalculator.ts",
  "double-attack-rate-up": "src/calculator/multiattackRateCalculator.ts",
  "triple-attack-rate-up": "src/calculator/multiattackRateCalculator.ts",
  "critical-rate-up": "src/calculator/criticalBodyDamageCalculator.ts",
  "normal-skill-boost": "src/calculator/weaponEffectResolver.ts",
  "weapon-defense-up": "src/calculator/normalAttackDamageCalculator.ts",
  "normal-frame-damage-cap-up": "src/calculator/normalAttackDamageCalculator.ts",
  "special-frame-damage-cap-up": "src/calculator/normalAttackDamageCalculator.ts",
  "elemental-pursuit": "src/calculator/normalAttackDamageCalculator.ts",
  "destruction-pursuit": "src/calculator/normalAttackDamageCalculator.ts",
  "healing-cap-up": "src/calculator/otherWeaponSkillCalculator.ts",
  "debuff-resistance-up": "src/calculator/otherWeaponSkillCalculator.ts",
  "damage-dealt-up": "src/calculator/otherWeaponSkillCalculator.ts",
  "ability-damage-cap-up": "src/calculator/otherWeaponSkillCalculator.ts",
  "ability-damage-up": "src/calculator/otherWeaponSkillCalculator.ts",
  "charge-damage-up": "src/calculator/otherWeaponSkillCalculator.ts",
  "charge-damage-cap-up": "src/calculator/otherWeaponSkillCalculator.ts",
  "charge-supplemental-damage": "src/calculator/otherWeaponSkillCalculator.ts",
  "ability-supplemental-damage": "src/calculator/otherWeaponSkillCalculator.ts",
  "supplemental-damage": "src/calculator/otherWeaponSkillCalculator.ts",
  "normal-only-damage-cap-up": "src/calculator/normalAttackSkillFrames.ts",
  "normal-only-damage-dealt-up": "src/calculator/normalAttackSkillFrames.ts",
  "special-normal-damage-dealt-up": "src/calculator/normalAttackSkillFrames.ts",
  "elemental-superiority-damage-up": "src/calculator/normalAttackSkillFrames.ts",
  "normal-supplemental-damage": "src/calculator/normalAttackSkillFrames.ts",
  "separate-normal-supplemental-damage": "src/calculator/normalAttackSkillFrames.ts",
  "enemy-defense-ignore": "src/calculator/normalAttackSkillFrames.ts",
  "special-ability-damage-cap-up": "src/calculator/automaticAbilityDamage.ts",
  "special-ability-damage-dealt-up": "src/calculator/automaticAbilityDamage.ts"
} satisfies Record<WeaponSkillEffectKind, string>;
export const summonRoutes = {
  "elemental-attack-up": "src/calculator/normalAttackPowerCalculator.ts",
  "character-attack-up": "src/calculator/normalAttackPowerCalculator.ts",
  "normal-skill-boost": "src/calculator/weaponEffectResolver.ts",
  "character-hp-up": "src/calculator/summonAuraEffectResolver.ts",
  "character-hp-down": "src/calculator/summonAuraEffectResolver.ts",
  "character-hp-flat": "src/calculator/summonAuraEffectResolver.ts",
  "damage-cap-up": "src/calculator/summonDamageEffects.ts",
  "damage-dealt-up": "src/calculator/summonDamageEffects.ts",
  "supplemental-damage": "src/calculator/summonDamageEffects.ts",
} satisfies Record<Exclude<SummonAuraEffectDefinition["kind"], "utility">, string>;
export const weaponEffectClasses = {
  "magna-attack-up": "攻撃力上昇（攻刃など）",
  "normal-attack-up": "攻撃力上昇（攻刃など）",
  "ex-attack-up": "攻撃力上昇（攻刃など）",
  "special-ex-attack-up": "攻撃力上昇（攻刃など）",
  "weapon-elemental-attack-up": "攻撃力上昇（攻刃など）",
  "normal-stamina-up": "渾身",
  "magna-stamina-up": "渾身",
  "normal-enmity-up": "背水",
  "normal-hp-up": "HP上昇（守護・神威など）",
  "magna-hp-up": "HP上昇（守護・神威など）",
  "weapon-hp-down": "HP減少・開幕ダメージ",
  "battle-start-hp-damage": "HP減少・開幕ダメージ",
  "critical-rate-up": "技巧（クリティカル）",
  "double-attack-rate-up": "連撃（DA・TA）",
  "triple-attack-rate-up": "連撃（DA・TA）",
  "weapon-defense-up": "防御力上昇",
  "normal-frame-damage-cap-up": "ダメージ上限",
  "special-frame-damage-cap-up": "ダメージ上限",
  "normal-only-damage-cap-up": "ダメージ上限",
  "ability-damage-cap-up": "ダメージ上限",
  "charge-damage-cap-up": "ダメージ上限",
  "special-ability-damage-cap-up": "ダメージ上限",
  "damage-dealt-up": "与ダメージUP",
  "normal-only-damage-dealt-up": "与ダメージUP",
  "special-normal-damage-dealt-up": "与ダメージUP",
  "elemental-superiority-damage-up": "与ダメージUP",
  "special-ability-damage-dealt-up": "与ダメージUP",
  "charge-supplemental-damage": "与ダメージ上昇（固定加算）",
  "ability-supplemental-damage": "与ダメージ上昇（固定加算）",
  "supplemental-damage": "与ダメージ上昇（固定加算）",
  "normal-supplemental-damage": "与ダメージ上昇（固定加算）",
  "separate-normal-supplemental-damage": "与ダメージ上昇（固定加算）",
  "elemental-pursuit": "追撃",
  "destruction-pursuit": "追撃",
  "enemy-defense-ignore": "敵防御無視",
  "ability-damage-up": "アビリティダメージUP",
  "charge-damage-up": "奥義ダメージUP",
  "normal-skill-boost": "スキル効果量強化",
  "healing-cap-up": "回復上限",
  "debuff-resistance-up": "弱体耐性"
} satisfies Record<WeaponSkillEffectKind, string>;
export function weaponEffectTypes(weapon: WeaponMasterCatalogEntry, skills: Map<string, WeaponSkillCatalogEntry>): string[] {
  return [...new Set(weapon.skillSlots.flatMap(slot => (skills.get(slot.skillId)?.effects ?? []).flatMap(effect => {
    const label = (weaponEffectClasses as Partial<Record<string, string>>)[effect.kind];
    return label ? [label] : [];
  })))];
}
export function aggregateConnection(effects: CatalogEffectCoverage[]): ConnectionStatus {
  if (!effects.length) return "unknown";
  const connected = effects.filter(effect => effect.connection === "connected").length;
  if (connected === effects.length) return "connected";
  if (connected) return "partial";
  return effects.some(effect => effect.connection === "unknown") ? "unknown" : "unconnected";
}
function conditionLabel(condition: NonNullable<WeaponSkillCatalogEntry["effects"][number]["activationCondition"]>): string {
  if (condition.kind === "minimum-weapon-level") return `武器Lv${condition.level}以上`;
  if (condition.kind === "minimum-same-weapon-kind-count") return `同じ武器種を${condition.count}本以上`;
  return `指定スキルの加護強化率 ${condition.minimumPercent ?? 0}%〜${condition.maximumPercent ?? "上限なし"}（${condition.targetSkillNamePrefixes.join(" / ")}）`;
}
function description(name: string, scope: string, verificationStatus: string, source?: string): CatalogEffectCoverage {
  return { name, structured: false, connection: "unconnected", scope, verificationStatus, source, evidence: [], observation: "未確認" };
}
export function weaponCoverage(weapon: WeaponMasterCatalogEntry, skills: Map<string, WeaponSkillCatalogEntry>, skillCoverageCache = new Map<string, CatalogEffectCoverage[]>()): CatalogCoverage {
  const missing: string[] = [];
  const unknown: string[] = ["奥義・覚醒等を含む武器全体の効果網羅性と実測範囲は未確認"];
  if (!weapon.levelStats) missing.push("Lv別ATK/HPが未登録");
  if (!weapon.selectionDefaults) missing.push("選択時の初期値が未登録");
  const effects: CatalogEffectCoverage[] = [];
  for (const slot of weapon.skillSlots) {
    const skill = skills.get(slot.skillId);
    if (!skill) { missing.push(`スキルID ${slot.skillId} の詳細が未登録`); continue; }
    const cached = skillCoverageCache.get(skill.skillId);
    if (cached) { effects.push(...cached); continue; }
    const start = effects.length;
    // Group SLv alternatives: one semantic kind per skill, retain the coverage range.
    const groups = new Map<string, typeof skill.effects>();
    for (const effect of skill.effects) groups.set(effect.kind, [...(groups.get(effect.kind) ?? []), effect]);
    for (const [kind, definitions] of groups) {
      const route = (weaponRoutes as Partial<Record<string, string>>)[kind];
      const levels = [...new Set(definitions.flatMap(effect => effect.skillLevel === undefined ? [] : [effect.skillLevel]))].sort((a, b) => a - b);
      effects.push({ name: `${skill.name}: ${effectLabels[kind] ?? kind}`, structured: true, connection: route ? "connected" : "unknown",
        scope: [route ? ["healing-cap-up", "debuff-resistance-up"].includes(kind) ? "数値集計への接続。回復量・弱体付与の行動処理全体は未対応" : "編成→計算出力（対応する攻撃・行動モデルに限定）" : "消費経路未調査", levels.length ? `登録SLv: ${levels.join(", ")}` : "SLv指定なし",
          ...new Set(definitions.flatMap(effect => [effect.mainWeaponOnly ? "メイン装備限定" : "", effect.activationCondition ? `発動条件: ${conditionLabel(effect.activationCondition)}` : "", effect.note ?? ""]).filter(Boolean))].join(" / "),
        verificationStatus: definitions.every(effect => (effect.verificationStatus ?? skill.verificationStatus) === "検証済み") ? "検証済み" : "下書き",
        source: [...new Set(definitions.map(effect => effect.source ?? skill.source))].join(" / "),
        confirmedAt: definitions.every(effect => effect.confirmedAt === definitions[0].confirmedAt) ? definitions[0].confirmedAt : undefined,
        evidence: route ? ["src/calculator/calculatorDeckResolver.ts", "src/calculator/weaponEffectResolver.ts", route] : [], observation: "未確認" });
    }
    for (const unsupported of skill.unsupportedEffects ?? []) effects.push(description(`${skill.name}: ${unsupported}`, "未対応として登録された効果", skill.verificationStatus, skill.source));
    if (!groups.size && !skill.unsupportedEffects?.length) effects.push(description(skill.name, "説明のみ。計算用数値・効果が未登録", skill.verificationStatus, skill.source));
    skillCoverageCache.set(skill.skillId, effects.slice(start));
  }
  for (const skill of weapon.listedSkills ?? []) effects.push(description(skill.name, `説明のみ: ${skill.description}`, "下書き", weapon.source));
  const charge = resolveWeaponChargeAttack({ masterId: weapon.weaponId, level: weapon.selectionDefaults?.level, uncapLevel: weapon.selectionDefaults?.uncapLevel });
  if (charge) effects.push({ name: charge.name, structured: true, connection: "connected", scope: "戦闘画面・メイン武器・登録初期Lv/凸段階限定の奥義候補モデル。その他の段階は未確認", verificationStatus: "下書き", source: charge.source, evidence: ["src/calculator/weaponChargeAttack.ts", "src/calculator/battleTurn.ts"], observation: "未確認" });
  if (!effects.length) unknown.push("スキル記録が空。正式なスキルなし／未収録を判別できません");
  return { missing, unknown, effects, connection: aggregateConnection(effects), source: weapon.source, confirmedAt: weapon.confirmedAt };
}
// Display-only ownership metadata, tied to the exact existing record. No calculation effect is added.
export const summonUtilityPositions = {
  "2040046000": { "サブ加護の攻防10%は未接続": "sub" },
} as const;
function utilityPosition(summonId: string, description: string): "main" | "sub" | undefined {
  return (summonUtilityPositions as Record<string, Record<string, "main" | "sub">>)[summonId]?.[description];
}
function basicAuraStage(summon: SummonMasterCatalogEntry): string {
  if (summon.auraMinimumLevel === undefined) return "基本登録加護（Lv/凸条件の限定登録なし。段階別の登録加護を優先）";
  return `基本登録加護（Lv${summon.auraMinimumLevel}以上${summon.selectionDefaults?.uncapLevel === undefined ? "・凸条件未登録" : `・${summon.selectionDefaults.uncapLevel}凸以上`}。段階別の登録加護があればそちらを優先）`;
}
export function summonCoverage(summon: SummonMasterCatalogEntry): CatalogCoverage {
  const missing = summon.levelStats ? [] : ["Lv別ATK/HPが未登録"];
  const effects = [{ ...summon, stage: basicAuraStage(summon) }, ...(summon.auraOverrides ?? []).map(override => ({ ...override, stage: `${override.uncapLevel}凸${override.minimumLevel ? ` Lv${override.minimumLevel}以上` : ""}` }))].flatMap(stage => stage.auraEffects.map((effect): CatalogEffectCoverage => {
    const route = (summonRoutes as Partial<Record<string, string>>)[effect.kind];
    return { name: `${stage.stage}: ${effect.description}`, structured: effect.kind !== "utility", connection: effect.kind === "utility" ? "unconnected" : route ? "connected" : "unknown",
      scope: effect.kind === "utility" ? `${utilityPosition(summon.summonId, effect.description) === "sub" ? "サブ加護（既存効果文で配置確認） / " : ""}説明のみ。計算への接続なし` : `編成→計算出力 / ${"activation" in effect ? ({ always: "メイン・サポート", "main-only": "メイン限定", "sub-only": "サブ限定" })[effect.activation] : ""}（属性・Lv・凸・編成条件に従う）`,
      verificationStatus: stage.verificationStatus, source: stage.source, confirmedAt: stage.confirmedAt,
      evidence: route ? ["src/calculator/summonCatalog.ts", "src/calculator/calculatorDeckResolver.ts", route] : [], observation: "未確認" };
  }));
  const all = [summon, ...(summon.auraOverrides ?? [])].flatMap(stage => stage.auraEffects);
  const auraCell = (position: "main" | "sub") => {
    const applicable = all.filter(effect => "activation" in effect && (position === "main" ? effect.activation !== "sub-only" : effect.activation === "sub-only"));
    const knownUnsupported = all.filter(effect => effect.kind === "utility" && utilityPosition(summon.summonId, effect.description) === position);
    if (!applicable.length && knownUnsupported.length) return { status: "×" as const, reason: knownUnsupported.map(effect => effect.description).join(" / ") };
    return applicable.some(effect => (summonRoutes as Partial<Record<string, string>>)[effect.kind])
      ? { status: "△" as const, reason: `登録された数値効果の計算経路あり。${knownUnsupported.length ? `未接続: ${knownUnsupported.map(effect => effect.description).join(" / ")}。` : ""}説明文全体・全Lv/凸段階の網羅性は未確認。個別効果と発動条件を参照` }
      : { status: "？" as const, reason: "この位置の数値効果を確認できません。加護なし／説明のみ／未収録の判別は未確認" };
  };
  return { missing, unknown: ["召喚効果・全Lv/凸段階の網羅性と実測範囲は未確認"], effects, connection: aggregateConnection(effects), source: summon.source, confirmedAt: summon.confirmedAt,
    matrix: {
      stats: summon.levelStats ? { status: "△", reason: "Lv境界ATK/HPを登録し編成に接続。中間Lvは補間計算で実測未確認" } : { status: "×", reason: "Lv別ATK/HPが未登録。手動入力が必要" },
      main: auraCell("main"), sub: auraCell("sub"),
      call: { status: "×", reason: "召喚ダメージをカタログから計算する経路は未実装。ダメージのない召喚かどうかは未確認" },
    },
  };
}

// Split explicit parallel values only. Parenthetical caveats remain visible and are not reclassified.
export function parallelValues(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return value.includes("(") || value.includes("（") ? [value.trim()] : value.split(/[・/／、]/).map(part => part.trim()).filter(Boolean);
}
export function characterCoverage(id: string, masterId?: string, styleId?: number, record?: { data: Record<string, unknown>; content: string }): { coverage: CatalogCoverage; facets: CatalogFacets } {
  const parsed = record ?? matter(readFileSync(path.join(KNOWLEDGE_BASE_PATH, "characters", `${id}.md`), "utf8"));
  const data = parsed.data;
  const facets = emptyFacets();
  facets.race = parallelValues(data.race);
  facets.gender = parallelValues(data.gender);
  facets.series = parallelValues(data.series);
  const explicit = data.proficiency ?? data.weapon_proficiency;
  if (Array.isArray(explicit)) facets.proficiency = explicit.filter((value): value is string => typeof value === "string");
  else if (typeof explicit === "string") facets.proficiency = parallelValues(explicit);
  else if (typeof data.job_type === "string") {
    // Existing records explicitly encode type/proficiency, e.g. 攻撃/銃・弓 or 攻撃(銃・弓).
    const match = /^(?:攻撃|防御|回復|特殊|バランス)(?:タイプ)?(?:[/／]|[（(])([剣短槍斧杖銃格闘弓楽器刀・/／]+)[)）]?$/.exec(data.job_type);
    if (match) facets.proficiency = parallelValues(match[1]);
  }
  const missing = [["race", "種族"], ["gender", "性別"]].filter(([field]) => !facets[field as keyof CatalogFacets].length).map(([, label]) => `${label}が未登録`);
  const effects: CatalogEffectCoverage[] = [];
  const normal = masterId !== undefined && styleId !== 2 && hasCharacterNormalAttackModel(masterId);
  if (normal) effects.push({ name: "通常攻撃・対応済み固有補正", structured: true, connection: "connected", scope: "前衛・表示ATK等の入力が必要。通常攻撃の限定モデル", verificationStatus: "下書き", source: data.source, evidence: ["src/calculator/characterNormalAttack.ts", "src/calculator/calculatorDeckResolver.ts"], observation: "未確認" });
  if (masterId === "3040611000" && styleId !== 2) effects.push({ name: "スコトゥスアルケー：武器スキル強化", structured: true, connection: "connected", scope: "前後列。通常/方陣の指定スキルのみ", verificationStatus: "下書き", source: data.source, evidence: ["src/calculator/characterSkillBoosts.ts", "src/calculator/weaponEffectResolver.ts"], observation: "未確認" });
  if (normal) for (const profile of Object.values(AUTOMATIC_ABILITY_PROFILES)) {
    if (profile.characterId !== masterId) continue;
    effects.push({ name: profile.name, structured: true, connection: "connected", scope: "戦闘画面の自動発動と単発計算。Lv80以上、発動条件・回数・状態入力が必要。減衰設定の確認は倍率・補正・丸めの実測一致ではありません", verificationStatus: "下書き", source: profile.source, evidence: ["src/calculator/automaticAbilityDamage.ts", "src/calculator/battleActionGenerator.ts", "test/automaticAbilityDamage.test.ts", "knowledge/abilities/damage-profiles.md（2026-10-04、キャラ詳細2件の減衰設定のみ）"], observation: profile.attenuationTableId ? "減衰設定のみ確認・全体未確認" : "未確認" });
  }
  for (const match of parsed.content.matchAll(/^###\s+((?:アビリティ\d+|奥義|EXアビリティ)[^\n]*)/gm)) {
    const connected = masterId === "3040456000" && styleId !== 2 && /^(?:アビリティ[123]|奥義)/.test(match[1]);
    effects.push({ name: match[1], structured: connected, connection: connected ? "connected" : "unknown", scope: connected ? "戦闘画面の浴衣イルザ限定モデル。Lv80以上・候補減衰・成功前提" : "本文の説明を登録。効果ごとの接続は未調査", verificationStatus: "下書き", source: data.source, evidence: connected ? ["src/calculator/ilsaBattleState.ts", "src/calculator/ilsaDamage.ts", "src/calculator/battleTurn.ts"] : [], observation: "未確認" });
  }
  // Known models cover only an explicitly limited subset; never report entire characters as complete.
  effects.push({ name: "その他の固有効果・サポート", structured: false, connection: "unknown", scope: "全効果の対応関係は未調査。未入力を効果なしと扱いません", verificationStatus: data.status, evidence: [], observation: "未確認" });
  return { facets, coverage: { missing, unknown: [...(!facets.series.length ? ["シリーズ分類が未登録。正式なシリーズなし／未調査を判別できません"] : []), ...(!facets.proficiency.length ? [`得意武器の分類が未登録・未確認。元のタイプ表記: ${data.job_type ?? "未登録"}`] : []), "種族・性別は元データの分類を表示（分類の正確性は未確認）", "得意武器は専用項目またはタイプ欄の明示表記のみ", "実測範囲の台帳なし。個別のknowledge記録を参照"], effects, connection: aggregateConnection(effects), source: data.source } };
}
