// Leading slashes distinguish /zenith/ from /npczenith/. Omit trailing slashes
// so endpoints recorded both with and without one are included.
export const URL_FILTER_PRESETS = [
  { group: "編成・主人公", label: "編成情報", value: "/party/deck" },
  { group: "編成・主人公", label: "出撃前編成・サポート召喚石", value: "/rest/quest/decks_info" },
  { group: "編成・主人公", label: "主人公ジョブ情報", value: "/party/job_equipped" },
  { group: "編成・主人公", label: "主人公LB", value: "/zenith/bonus_list" },
  { group: "キャラ強化", label: "キャラLB情報", value: "/npczenith/bonus_list" },
  { group: "キャラ強化", label: "耳飾り・指輪情報", value: "/npczenith/content" },
  { group: "装備・詳細", label: "キャラ詳細", value: "/npc/npc" },
  { group: "装備・詳細", label: "武器詳細", value: "/weapon/weapon" },
  { group: "装備・詳細", label: "バレット情報", value: "/weapon_bullet/weapon_bullet" },
  { group: "装備・詳細", label: "マナベリ情報", value: "/rest/job/familiar/familiar_list" },
  { group: "装備・詳細", label: "秘器情報", value: "/weapon_hiddenweapon/content" },
  { group: "装備・詳細", label: "盾情報", value: "/rest/job/shield/shield_list" },
  { group: "装備・詳細", label: "召喚石情報", value: "/summon/summon" },
  { group: "戦闘", label: "戦闘開始時データ", value: "start.json" },
  { group: "戦闘", label: "戦闘時の結果データ", value: "result.json" },
  { group: "大事なもの", label: "大事なもの", value: "/item/memorial_list" },
];

export function collectUrlFilters(text, selectedPresets = []) {
  return [...new Set([...text.split(","), ...selectedPresets]
    .map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export function filterRecordsByUrl(records, filters) {
  if (filters.length === 0) return records;
  return records.filter((record) => {
    const url = String(record.url ?? "").toLowerCase();
    return filters.some((filter) => url.includes(filter));
  });
}
