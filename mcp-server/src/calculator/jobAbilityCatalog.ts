import { readFileSync } from "node:fs";
import path from "node:path";
import type { JobAbility, JobAbilityConfig } from "../../web/protagonist-abilities.js";

interface CandidateData {
  abilities: Record<string, { name: string; comment: string }>;
  jobs: Record<string, { slot_caps: { ex: number; base: number; zenith_limit: number }; ex_ability_ids: string[]; limit_ability_ids: string[]; base_ability_ids: string[] }>;
}
const cleanName = (name: string) => name.replace(/[（(].*$/, "").trim();
const normalizeName = (name: string) => cleanName(name).replace(/[＋+]$/, "");
function section(markdown: string, heading: string) {
  return markdown.split(`## ${heading}`)[1]?.split(/\n## /)[0] ?? "";
}

/** Existing sanitized knowledge only; no account/capture files or new numeric combat claims. */
export function createJobAbilityConfigs(knowledgeBasePath: string, documents: { slug: string; jobId: string; classTier: string; markdown: string }[]): Map<string, JobAbilityConfig> {
  const data: CandidateData = JSON.parse(readFileSync(path.join(knowledgeBasePath, "abilities", "free-slot-candidates.json"), "utf8"));
  const configs = new Map<string, JobAbilityConfig>();
  const exIds = [...new Set(Object.values(data.jobs).flatMap(j => j.ex_ability_ids))];
  for (const doc of documents) {
    const fixedCount = doc.classTier === "ClassI" ? 2 : ["ClassII", "ClassIII", "エクストラ"].includes(doc.classTier) ? 3 : 1;
    const headers = [...section(doc.markdown, "アビリティ構成").matchAll(/^### アビリティ(\d+):\s*(.+)$/gm)];
    const fixed = headers.filter(m => Number(m[1]) <= fixedCount).map(m => ({
      id: `${doc.slug}:fixed:${m[1]}`, name: cleanName(m[2]),
      minimumJobLevel: Number(m[2].match(/Lv(\d+)で習得/)?.[1] ?? 1),
      battleStatus: doc.jobId === "100501" && m[1] === "1" ? "Lv50で状態のみ対応・数値効果未計算" : "戦闘効果未実装",
    }));
    if (fixed.length !== fixedCount) throw new Error(`${doc.slug}: fixed ability coverage is incomplete`);
    let entry = data.jobs[doc.slug];
    const derived = !entry;
    if (!entry && ["class1-fighter", "class1-lancer", "class1-wizard"].includes(doc.slug)) {
      const peer = documents.find(d => d.classTier === "ClassII" && d.jobId.slice(0, 2) === doc.jobId.slice(0, 2));
      const peerEntry = peer && data.jobs[peer.slug];
      if (!peerEntry) throw new Error(`${doc.slug}: missing series candidate evidence`);
      entry = { ...peerEntry, ex_ability_ids: exIds.filter(id => !fixed.some(a => normalizeName(a.name) === normalizeName(data.abilities[id].name))), base_ability_ids: [] };
    }
    if (!entry) throw new Error(`${doc.slug}: candidate coverage is incomplete`);
    const candidateRows: JobAbility[] = ([['ex', entry.ex_ability_ids], ['limit', entry.limit_ability_ids], ['base', entry.base_ability_ids]] as const)
      .flatMap(([category, ids]) => ids.map(id => {
        const a = data.abilities[id];
        if (!a) throw new Error(`unknown candidate: ${id}`);
        const row: JobAbility = { id, name: a.name, description: a.comment, category,
          battleStatus: doc.jobId === "100501" && ["202071", "200721", "203961"].includes(id)
            ? "Lv50で状態・発動のみ対応・数値効果未計算" : "戦闘効果未実装" };
        // Own explicit unlock levels only. Inherited source-job training is not represented in deck settings.
        const own = [...section(doc.markdown, "リミットアビリティ").matchAll(/^### (.+)$/gm)]
          .find(m => normalizeName(m[1]) === normalizeName(a.name));
        const level = own?.[1].match(/Lv(\d+)で習得/);
        if (level) row.minimumJobLevel = Number(level[1]);
        const perfection = [...section(doc.markdown, "極致の証").matchAll(/^### (.+)$/gm)]
          .find(m => normalizeName(m[1]) === normalizeName(a.name) && /段階6/.test(m[1]));
        if (perfection) row.minimumPerfectionProofLevel = 6;
        return row;
      }));
    configs.set(doc.jobId, {
      fixed, freeSlots: (doc.classTier === "ClassI" ? 3 : 4) - fixedCount,
      caps: { ex: entry.slot_caps.ex, limit: entry.slot_caps.zenith_limit, base: entry.slot_caps.base },
      ...(doc.classTier === "オリジン" ? { limitCapIncreaseLevel: doc.jobId === "130501" ? 40 : 30 } : {}),
      candidates: candidateRows, coverage: derived ? "同系列リミット候補・共通EXプールから導出（候補一覧未観測）" : "既存候補一覧を収録（習得済みアカウントの観測範囲）",
      verificationStatus: "下書き", observedOn: "2026-09-07",
      evidence: "knowledge/abilities/free-slot-candidates.json / knowledge/mechanics/abilities.md / 各ジョブMarkdown。ClassI自由1枠は要再検証。習得・源ジョブLv/極致・武器等の追加条件は別途確認。Origin枠上限増加Lv: clover公開調査2026-10-05 https://gbf.wiki/Fighter_Origin#Level_Bonuses / https://gbf.wiki/Lancer_Origin#Level_Bonuses / https://gbf.wiki/Wizard_Origin#Level_Bonuses（実機未再検証）。",
    });
  }
  return configs;
}
