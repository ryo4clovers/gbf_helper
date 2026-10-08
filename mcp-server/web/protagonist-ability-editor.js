import { abilityIssue, abilityCaps, validateAbilitySelection } from "./protagonist-abilities.js";

export function createProtagonistAbilityEditor(protagonist, config, onChange) {
  const section = document.createElement("section");
  section.className = "protagonist-ability-editor";
  const heading = document.createElement("h3"); heading.textContent = "主人公アビリティ"; section.append(heading);
  if (!config) { section.append(document.createTextNode("候補未登録・装備条件未確認")); return section; }
  for (const [index, ability] of config.fixed.entries()) {
    const row = document.createElement("p");
    const issue = abilityIssue(ability, protagonist);
    row.textContent = `${index + 1}アビ（ジョブ固定）: ${ability.name} — ${issue || ability.battleStatus}`;
    section.append(row);
  }
  const selected = protagonist.abilityIds ?? [];
  const labels = { ex: "EX", limit: "リミット", base: "ベース" };
  for (let slot = 0; slot < config.freeSlots; slot++) {
    const label = document.createElement("label"); label.textContent = `${config.fixed.length + slot + 1}アビ（選択枠）`;
    const select = document.createElement("select"); select.setAttribute("aria-label", label.textContent);
    const empty = document.createElement("option"); empty.value = ""; empty.textContent = "未装備"; select.append(empty);
    for (const category of ["ex", "limit", "base"]) {
      const group = document.createElement("optgroup"); group.label = labels[category];
      for (const a of config.candidates.filter(a => a.category === category)) {
        const candidate = Array.from({ length: config.freeSlots }, (_, i) => i === slot ? a.id : selected[i] ?? null);
        let issue = "";
        try { validateAbilitySelection({ ...protagonist, abilityIds: candidate }, config); } catch (error) { issue = error.message; }
        const option = document.createElement("option"); option.value = a.id;
        option.textContent = `${a.name} — ${issue || a.battleStatus}`;
        option.disabled = !!issue; group.append(option);
      }
      if (group.children.length) select.append(group);
    }
    if (selected[slot] && !config.candidates.some(a => a.id === selected[slot])) {
      const unknown = document.createElement("option"); unknown.value = selected[slot]; unknown.textContent = `${selected[slot]}（装備不可・選び直してください）`; select.append(unknown);
    }
    select.value = selected[slot] ?? "";
    select.addEventListener("change", () => {
      const next = Array.from({ length: config.freeSlots }, (_, i) => i === slot ? select.value || null : selected[i] ?? null);
      onChange(next);
    });
    const a = config.candidates.find(a => a.id === selected[slot]);
    const note = document.createElement("small"); note.textContent = a ? `${labels[a.category]} / ${a.description} / ${a.battleStatus}` : "未装備";
    label.append(select, note); section.append(label);
  }
  const caps = abilityCaps(protagonist, config);
  const note = document.createElement("p"); note.className = "supporting-text";
  note.textContent = `EX最大${caps.ex} / リミット最大${caps.limit} / ベース最大${caps.base}（自由枠計${config.freeSlots}）。${config.verificationStatus}・${config.observedOn}。${config.coverage}。習得済みかは別途確認してください。`;
  note.title = config.evidence; section.append(note);
  if (config.fixed.length > 1) {
    const uncertainty = document.createElement("small"); uncertainty.textContent = "固定枠・自由1枠は既存資料に基づく暫定設定（ClassIの自由枠数は要再検証）"; section.append(uncertainty);
  }
  return section;
}
