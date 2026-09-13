export interface DamageAttenuationLine {
	/** Pre-attenuation damage at which this line starts. */
	threshold: number;
	/** Fraction of damage above this line that remains (95% attenuation = 0.05). */
	passRate: number;
}

export interface DamageAttenuationProfile {
	id: string;
	name: string;
	lines: readonly DamageAttenuationLine[];
}

export type DamageAttenuationRounding = "none" | "floor" | "ceil" | "nearest";

export interface DamageAttenuationOptions {
	/** Raises every attenuation threshold; 10 means +10%. */
	damageCapUpPercent?: number;
	/** Applied once after every attenuation segment has been accumulated. */
	rounding?: DamageAttenuationRounding;
}

export interface AppliedDamageAttenuationSegment {
	/** null is the unattenuated range before the first line. */
	afterLineIndex: number | null;
	inputStart: number;
	inputEnd: number;
	inputDamage: number;
	passRate: number;
	outputDamage: number;
}

export interface DamageAttenuationResult {
	schemaVersion: 1;
	profileId: string;
	inputDamage: number;
	damageCapUpPercent: number;
	thresholdMultiplier: number;
	scaledLines: DamageAttenuationLine[];
	segments: AppliedDamageAttenuationSegment[];
	unroundedDamage: number;
	rounding: DamageAttenuationRounding;
	damage: number;
}

function assertFiniteNonNegative(value: number, label: string): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`${label} must be a finite non-negative number`);
	}
}

function validateProfile(profile: DamageAttenuationProfile): void {
	if (profile.id.trim() === "") throw new Error("profile.id must not be empty");
	let previousThreshold = 0;
	profile.lines.forEach((line, index) => {
		if (
			!Number.isFinite(line.threshold) ||
			line.threshold <= previousThreshold
		) {
			throw new Error(
				`profile.lines[${index}].threshold must be finite and strictly increasing`,
			);
		}
		if (
			!Number.isFinite(line.passRate) ||
			line.passRate < 0 ||
			line.passRate > 1
		) {
			throw new Error(
				`profile.lines[${index}].passRate must be between 0 and 1`,
			);
		}
		previousThreshold = line.threshold;
	});
}

function applyRounding(
	value: number,
	rounding: DamageAttenuationRounding,
): number {
	switch (rounding) {
		case "none":
			return value;
		case "floor":
			return Math.floor(value);
		case "ceil":
			return Math.ceil(value);
		case "nearest":
			return Math.round(value);
		default:
			throw new Error(`unsupported rounding mode: ${String(rounding)}`);
	}
}

/**
 * Applies a piecewise-linear soft cap. Thresholds are scaled before evaluation;
 * supplemental damage and damage-dealt multipliers intentionally belong to later stages.
 */
export function calculateDamageAttenuation(
	inputDamage: number,
	profile: DamageAttenuationProfile,
	options: DamageAttenuationOptions = {},
): DamageAttenuationResult {
	assertFiniteNonNegative(inputDamage, "inputDamage");
	validateProfile(profile);
	const damageCapUpPercent = options.damageCapUpPercent ?? 0;
	assertFiniteNonNegative(damageCapUpPercent, "damageCapUpPercent");
	const rounding = options.rounding ?? "none";
	const thresholdMultiplier = 1 + damageCapUpPercent / 100;
	const scaledLines = profile.lines.map((line, index) => {
		// Addition avoids common diagnostics noise such as 400000 * 1.1 = 440000.00000000006.
		const threshold =
			line.threshold + (line.threshold * damageCapUpPercent) / 100;
		if (!Number.isFinite(threshold)) {
			throw new Error(
				`scaled profile.lines[${index}].threshold must be finite`,
			);
		}
		return { threshold, passRate: line.passRate };
	});
	const segments: AppliedDamageAttenuationSegment[] = [];
	let inputStart = 0;
	let unroundedDamage = 0;

	for (let segmentIndex = 0; inputStart < inputDamage; segmentIndex += 1) {
		const nextLine = scaledLines[segmentIndex];
		const inputEnd = Math.min(inputDamage, nextLine?.threshold ?? inputDamage);
		const segmentInputDamage = inputEnd - inputStart;
		const passRate =
			segmentIndex === 0 ? 1 : scaledLines[segmentIndex - 1].passRate;
		const outputDamage = segmentInputDamage * passRate;
		segments.push({
			afterLineIndex: segmentIndex === 0 ? null : segmentIndex - 1,
			inputStart,
			inputEnd,
			inputDamage: segmentInputDamage,
			passRate,
			outputDamage,
		});
		unroundedDamage += outputDamage;
		inputStart = inputEnd;
	}

	return {
		schemaVersion: 1,
		profileId: profile.id,
		inputDamage,
		damageCapUpPercent,
		thresholdMultiplier,
		scaledLines,
		segments,
		unroundedDamage,
		rounding,
		damage: applyRounding(unroundedDamage, rounding),
	};
}

const STANDARD_PASS_RATES = [0.6, 0.3, 0.05, 0.01] as const;
type StandardThresholds = readonly [number, number, number, number];

function standardProfile(
	id: string,
	name: string,
	thresholds: StandardThresholds,
): DamageAttenuationProfile {
	return {
		id,
		name,
		lines: thresholds.map((threshold, index) => ({
			threshold,
			passRate: STANDARD_PASS_RATES[index],
		})),
	};
}

/** Secondary-source values. Keep provisional until reproduced with in-game observations. */
export const PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES = {
	normalAttack: {
		id: "normal-attack-standard",
		name: "通常攻撃・反撃（標準）",
		lines: [
			{ threshold: 300_000, passRate: 0.8 },
			{ threshold: 400_000, passRate: 0.6 },
			{ threshold: 500_000, passRate: 0.05 },
			{ threshold: 600_000, passRate: 0.01 },
		],
	},
	chargeAttackMassive: standardProfile(
		"charge-attack-massive-standard",
		"奥義・特大（標準）",
		[1_500_000, 1_700_000, 1_800_000, 2_500_000],
	),
	chainBurst2: standardProfile(
		"chain-burst-2-standard",
		"2チェイン（標準）",
		[1_000_000, 1_200_000, 1_300_000, 1_500_000],
	),
	chainBurst3: standardProfile(
		"chain-burst-3-standard",
		"3チェイン（標準）",
		[1_250_000, 1_450_000, 1_500_000, 2_000_000],
	),
	chainBurst4: standardProfile(
		"chain-burst-4-standard",
		"4チェイン（標準）",
		[1_500_000, 1_700_000, 1_800_000, 2_500_000],
	),
} as const satisfies Record<string, DamageAttenuationProfile>;
