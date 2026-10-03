import { readFile, writeFile } from "node:fs/promises";
import { generateBattleActions } from "../dist/calculator/battleActionGenerator.js";

const [input, output, ...extra] = process.argv.slice(2);
if (!input || !output || extra.length) {
  console.error("Usage: node scripts/generate-battle-actions.mjs <request.json> <local-output.json>");
  process.exitCode = 1;
} else {
  try {
    const result = generateBattleActions(JSON.parse(await readFile(input, "utf8")));
    // Never silently overwrite an existing capture or a previous result.
    await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    console.error(`${result.turns.length}ターンの行動を生成しました（下書き・自動アビリティ${result.automaticAbilityConditions ? "は候補ダメージを計算" : "ダメージ未計算"}）`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
