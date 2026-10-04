// Offline extractor for the specified page's seven-column, two-row ability tables.
// Never executes HTML/scripts, follows links, or assigns game IDs from names.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const [input, date] = process.argv.slice(2);
assert(input && /^\d{4}-\d{2}-\d{2}$/.test(date ?? ""), "Usage: node scripts/data-collection/import-kikumaro-attenuation.mjs <saved HTML> YYYY-MM-DD [--apply]");
const sourceUrl = "https://kikumarogaming.com/granbluefantasy-damegecaplist/";
const html = fs.readFileSync(input, "utf8");
const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (full, code) => {
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(code[1] === "x" ? 2 : 1), code[1] === "x" ? 16 : 10));
    assert(Object.hasOwn(entities, code), `Unknown HTML entity ${full}`);
    return entities[code];
  });
}
const text = value => decode(value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, ""))
  .split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean).join(" / ");
const number = value => { assert(/^[\d,]+$/.test(value), `Unexpected number: ${value}`); return Number(value.replaceAll(",", "")); };
const entries = [];
let element, sectionId, tableIndex = 0;
const sections = new Set();
for (const match of html.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>|<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
  if (match[2] !== undefined) {
    const name = text(match[2]);
    element = /^[火水土風光闇]属性$/.test(name) ? name[0] : undefined;
    sectionId = match[1].match(/\bid="([^"]+)"/)?.[1];
    if (element) { assert(sectionId); sections.add(element); }
    continue;
  }
  if (!element) continue;
  const rows = [...match[3].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
    [...row[1].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map(cell => ({
      value: text(cell[2]), html: cell[2],
      rowSpan: Number(cell[1].match(/\browspan="(\d+)"/)?.[1] ?? 1),
      colSpan: Number(cell[1].match(/\bcolspan="(\d+)"/)?.[1] ?? 1),
    })));
  if (rows[0]?.[0]?.value !== "キャラ名") continue;
  tableIndex++;
  assert.deepEqual(rows[0].map(c => c.value), ["キャラ名", "アビ名", "第1ライン", "第2ライン", "第3ライン", "第4ライン", "減衰値"]);
  const grid = [];
  for (const [rowIndex, cells] of rows.entries()) {
    grid[rowIndex] ??= [];
    let column = 0;
    for (const cell of cells) {
      while (grid[rowIndex][column]) column++;
      assert.equal(cell.colSpan, 1, "Unexpected merged column");
      for (let offset = 0; offset < cell.rowSpan; offset++) {
        assert(rowIndex + offset < rows.length, "Rowspan outside table");
        grid[rowIndex + offset] ??= [];
        assert(!grid[rowIndex + offset][column]);
        grid[rowIndex + offset][column] = cell;
      }
      column++;
    }
    assert.equal(grid[rowIndex].length, 7);
    assert(grid[rowIndex].every(Boolean));
  }
  assert.equal((grid.length - 1) % 2, 0);
  for (let rowIndex = 1; rowIndex < grid.length; rowIndex += 2) {
    const top = grid[rowIndex], bottom = grid[rowIndex + 1];
    for (const col of [0, 1, 6]) assert.equal(top[col], bottom[col], "Ability pair lost rowspan identity");
    const thresholdLabels = top.slice(2, 6).map(c => c.value);
    const thresholds = thresholdLabels.map(value => ["", "1.100,000"].includes(value) ? null : number(value));
    const passRatesPercent = bottom.slice(2, 6).map(c => {
      if (["", "%"].includes(c.value)) return null;
      assert(/^\d+(?:\.\d+)?%$/.test(c.value), `Unexpected rate ${c.value}`);
      const rate = Number(c.value.slice(0, -1)); assert(rate >= 0 && rate <= 100); return rate;
    });
    const monotonic = thresholds.every((n, i) => i === 0 || n === null || thresholds[i - 1] === null || n >= thresholds[i - 1]);
    const capText = top[6].value.match(/^([\d,]+)(.*)$/);
    assert(capText || top[6].value === "", "Unexpected listed attenuation value");
    const listedAttenuatedDamage = capText ? number(capText[1]) : null;
    const calculatedDamageAtFourthThreshold = !monotonic || thresholds.includes(null) || passRatesPercent.includes(null) ? null : Math.round((thresholds[0] + thresholds.slice(1)
      .reduce((sum, n, i) => sum + (n - thresholds[i]) * passRatesPercent[i] / 100, 0)) * 1e6) / 1e6;
    const characterSourceUrl = decode(top[0].html.match(/\bhref="([^"]+)"/)?.[1] ?? "");
    assert(characterSourceUrl.startsWith("https://kikumarogaming.com/"));
    entries.push({ sourceTable: tableIndex, sourceRow: rowIndex + 1, element,
      characterLabel: top[0].value, abilityLabel: top[1].value, characterSourceUrl,
      sourceSectionUrl: `${sourceUrl}#${sectionId}`, verificationStatus: "下書き",
      dataIssues: [...(thresholds.includes(null) ? ["missing-or-malformed-threshold"] : []), ...(passRatesPercent.includes(null) ? ["missing-pass-rate"] : []), ...(!monotonic ? ["non-monotonic-thresholds"] : []), ...(listedAttenuatedDamage === null ? ["missing-listed-value"] : [])],
      thresholdLabels, thresholds, passRateLabels: bottom.slice(2, 6).map(c => c.value), passRatesPercent, listedAttenuatedDamage,
      notes: capText ? capText[2].replace(/^\s*\/\s*/, "").trim() : "", calculatedDamageAtFourthThreshold,
      listedMinusCalculated: calculatedDamageAtFourthThreshold === null || listedAttenuatedDamage === null ? null : Math.round((listedAttenuatedDamage - calculatedDamageAtFourthThreshold) * 1e6) / 1e6,
    });
  }
}
assert.equal(sections.size, 6);
assert(entries.length > 0);
const counts = Object.fromEntries([...sections].map(e => [e, entries.filter(x => x.element === e).length]));
const discrepancies = entries.filter(x => x.listedMinusCalculated !== null && x.listedMinusCalculated !== 0);
const issueEntries = entries.filter(x => x.dataIssues.length);
const output = { schemaVersion: 1, source: { url: sourceUrl, title: "【グラブル】ダメージ減衰値一覧", retrievedOn: date,
  publishedAt: html.match(/"datePublished":\s*"([^"]+)"/)?.[1], modifiedAt: html.match(/"dateModified":\s*"([^"]+)"/)?.[1],
  htmlSha256: crypto.createHash("sha256").update(html).digest("hex"), quality: "二次情報・実機未検証" },
  verificationStatus: "下書き", tableCount: tableIndex, entryCount: entries.length, countsByElement: counts,
  arithmeticDiscrepancyCount: discrepancies.length, dataIssueCount: issueEntries.length,
  semantics: { thresholds: "第1〜第4ライン、補正前の値。空欄と原表の1.100,000は解釈保留のnullとしthresholdLabelsに原表記を保持", passRatesPercent: "各ライン超過分の通過率（減少率ではない）。空欄と%のみの欄はnull、passRateLabelsに原表記を保持",
    listedAttenuatedDamage: "サイト記載値。多段合計や厳密な最大値へ読み替えない",
    calculatedDamageAtFourthThreshold: "転記したラインと通過率から本スクリプトで算出。実測ではない",
    notes: "掲載のhit数・発動回数等の注記。未記載を1hitと推定しない",
    sourceRow: "属性別の掲載テーブル内の物理行番号（見出し含む、1始まり）",
    identities: "表番号はローカル参照用。action_id・キャラマスターID・減衰IDは未照合",
    scope: "属性別数値表のみ。解説本文・画像・広告は収録しない。計算機には自動適用しない" }, entries };
assert(output.source.publishedAt && output.source.modifiedAt);
const stem = `kikumaro-attenuation-${date}`;
const md = `# きくまろGamingの減衰表・数値参照資料\n\n> ステータス: 下書き（全件実機要検証）\n> 取得日: ${date}\n> 出典: [ダメージ減衰値一覧](${sourceUrl})\n> 掲載公開日: ${output.source.publishedAt}\n> 掲載更新日: ${output.source.modifiedAt}\n\n属性別${tableIndex}表・${entries.length}件を[JSON](./${stem}.json)へ保存した。全6属性のキャラ名・アビリティ名・4ライン・4通過率・掲載減衰値・hit/発動回数の注記と出典リンクを保持する。名称から実機IDや現在の性能を確定しない。本文や画像の転載ではなく数値参照資料であり、計算機の設定には自動適用しない。\n\n| 属性 | 件数 |\n| --- | ---: |\n${Object.entries(counts).map(([e,n])=>`| ${e} | ${n} |`).join("\n")}\n\n通過率はラインを超えた部分に掛ける割合。第4ライン超過後もその通過率で増加する場合があり、掲載減衰値を厳密な最大値として扱わない。未記載のhit数・倍率は補完しない。\n\n## 算術照合\n\n4ラインと最初の3通過率から第4ライン到達時の値を算出し、掲載値と比較した。差分${discrepancies.length}件を検出したが、原表を訂正せず両値を保存した。転記の検査でありゲーム仕様の検証ではなく、表記丸め・誤記・条件差は未判定。\n\n| 表番号 / 行 | 属性 | キャラ / アビリティ | 掲載値 | 算出値 | 差（掲載−算出） |\n| --- | --- | --- | ---: | ---: | ---: |\n${discrepancies.map(x=>`| ${x.sourceTable} / ${x.sourceRow} | ${x.element} | ${x.characterLabel} / ${x.abilityLabel} | ${x.listedAttenuatedDamage} | ${x.calculatedDamageAtFourthThreshold} | ${x.listedMinusCalculated} |`).join("\n")}\n\n## 欠損・形式上の保留\n\n${issueEntries.length}件は欠損、数値表記の解釈保留、またはラインの逆転がある。欠損を0にせず、数値化できない欄と算出値はnullとした。原表記はJSONのthresholdLabels/passRateLabelsに残す。\n\n| 表番号 / 行 | キャラ / アビリティ | 原表のライン | 問題 |\n| --- | --- | --- | --- |\n${issueEntries.map(x=>`| ${x.sourceTable} / ${x.sourceRow} | ${x.characterLabel} / ${x.abilityLabel} | ${x.thresholdLabels.join(" → ")} | ${x.dataIssues.join(", ")} |`).join("\n")}\n\n浴衣イルザのウェイジズ・オブ・シンは掲載されていない。既存の不散花別実測候補へこの資料の別キャラの表を自動流用しない。\n\n## 再取得時の手順\n\n保存済みHTMLを実行せず、オフラインで次のスクリプトに渡す。既定は検査のみ、保存には最後に\`--apply\`を付ける。既存ファイルは上書きしない。\n\n\`node scripts/data-collection/import-kikumaro-attenuation.mjs <保存済みHTML> YYYY-MM-DD --apply\`\n\n結合セルの対応、2行1組、全4ラインと通過率、6属性、数値形式を検査する。構造が変わった場合は手動確認してから更新する。\n`;
if (process.argv.includes("--apply")) {
  const dir = path.resolve(import.meta.dirname, "../../knowledge/abilities/_sources");
  for (const ext of ["json", "md"]) assert(!fs.existsSync(path.join(dir, `${stem}.${ext}`)), "Refusing to overwrite existing source artifact");
  fs.writeFileSync(path.join(dir, `${stem}.json`), JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
  fs.writeFileSync(path.join(dir, `${stem}.md`), md, { flag: "wx" });
}
console.log(JSON.stringify({ tableCount: tableIndex, entryCount: entries.length, counts, discrepancies: discrepancies.length }, null, 2));
