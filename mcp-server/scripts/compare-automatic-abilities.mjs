import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { automaticAbilityCalculationRequestSchema, calculateAutomaticAbilityDamage } from "../dist/calculator/automaticAbilityDamage.js";

// This input is a locally prepared comparison manifest, not a raw game export.
// Explicit pre-cast conditions keep the predictor independent of recorded actions.
const schema = z.object({ schemaVersion: z.literal(1), cases: z.array(z.object({
  label: z.string().max(200).optional(), request: automaticAbilityCalculationRequestSchema,
  observedDamage: z.array(z.number().int().positive()).min(1).max(100),
}).strict()).min(1).max(1000) }).strict();

try {
  const [input, output, ...extra] = process.argv.slice(2);
  if (!input || !output || extra.length) throw new Error("Usage: node scripts/compare-automatic-abilities.mjs <ローカル照合入力.json> <新規ローカル出力.json>");
  const manifest = schema.parse(JSON.parse(await readFile(input, "utf8")));
  const cases = manifest.cases.map((entry) => {
    const prediction = calculateAutomaticAbilityDamage(entry.request);
    const hits = entry.observedDamage.map((observed) => {
      const nearest = prediction.predictions.reduce((best, candidate) =>
        Math.abs(candidate.damage - observed) < Math.abs(best.damage - observed) ? candidate : best);
      return { observed, nearest, residual: observed - nearest.damage,
        inRange: observed >= prediction.perHit.minimum && observed <= prediction.perHit.maximum };
    });
    return { label: entry.label, prediction, hits };
  });
  const hits = cases.flatMap((entry) => entry.hits);
  const summary = { cases: cases.length, hits: hits.length, exact: hits.filter((hit) => hit.residual === 0).length,
    inRange: hits.filter((hit) => hit.inRange).length, maxAbsoluteResidual: Math.max(...hits.map((hit) => Math.abs(hit.residual))) };
  await writeFile(output, `${JSON.stringify({ schemaVersion: 1, verificationStatus: "下書き", summary, cases }, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} catch (error) {
  // Validation values and account details must not leak into command output.
  process.stderr.write(error instanceof z.ZodError ? "照合入力の形式が不正です\n" : `${error.message}\n`);
  process.exitCode = 1;
}
