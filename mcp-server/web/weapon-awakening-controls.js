import { weaponAwakeningStatBonus } from "./weapon-awakening-stats.js";
function matchesForm(type, code) {
  return type.formCode === code || (type.gameFormCodes ?? []).includes(code);
}

const labels = {
  "weapon-elemental-attack-up": "武器属性攻撃", "ex-attack-up": "EX攻刃",
  "normal-attack-up": "通常攻刃", "normal-frame-damage-cap-up": "ダメージ上限",
  "normal-hp-up": "HP", "weapon-defense-up": "防御", "charge-damage-up": "奥義ダメージ",
  "charge-damage-cap-up": "奥義上限", "charge-supplemental-damage": "奥義与ダメージ",
  "ability-damage-up": "アビリティダメージ", "ability-damage-cap-up": "アビリティ上限",
  "healing-cap-up": "回復上限", "debuff-resistance-up": "弱体耐性",
  "double-attack-rate-up": "DA率", "triple-attack-rate-up": "TA率",
};

export function weaponAwakeningSummary(weapon, options) {
  if (!weapon.awakening) return undefined;
  const type = options?.types.find(type => matchesForm(type, weapon.awakening.formCode));
  return `覚醒${type?.name ?? "未対応"}Lv${weapon.awakening.level ?? "?"}`;
}

/** Keep the stored selection when Lv/uncap changes, while making its inactive state explicit. */
export function createWeaponAwakeningControls(weapon, options, onChange) {
  const container = document.createElement("div");
  container.className = "weapon-awakening-controls";
  const typeLabel = document.createElement("label"), levelLabel = document.createElement("label");
  typeLabel.textContent = "覚醒タイプ";
  levelLabel.textContent = "覚醒Lv";
  const typeSelect = document.createElement("select"), levelSelect = document.createElement("select");
  typeSelect.setAttribute("aria-label", "武器の覚醒タイプ");
  levelSelect.setAttribute("aria-label", "武器の覚醒レベル");
  typeSelect.append(new Option("なし", ""));
  for (const type of options?.types ?? []) typeSelect.append(new Option(type.name, type.formCode));
  const original = weapon.awakening;
  if (original && !options?.types.some(type => matchesForm(type, original.formCode))) {
    typeSelect.append(new Option(`未対応（${original.formCode ?? "タイプ不明"}）`, original.formCode ?? "unknown"));
  }
  for (let level = 1; level <= (options?.maximumLevel ?? 4); level++) levelSelect.append(new Option(String(level), String(level)));
  typeLabel.append(typeSelect); levelLabel.append(levelSelect);
  const note = document.createElement("p"); note.className = "field-note";
  container.append(typeLabel, levelLabel, note);
  const refresh = () => {
    const selection = weapon.awakening;
    const type = options?.types.find(type => matchesForm(type, selection?.formCode));
    const eligible = options && (weapon.level ?? 0) >= options.minimumWeaponLevel
      && (weapon.uncapLevel === undefined || weapon.uncapLevel >= options.minimumUncapLevel);
    typeSelect.value = selection ? type?.formCode ?? selection.formCode ?? "unknown" : "";
    levelSelect.value = String(selection?.level ?? 1);
    // Unknown imported settings can always be cleared/replaced; no numeric form IDs are guessed.
    typeSelect.disabled = !eligible && !selection;
    levelSelect.disabled = !eligible || !type;
    if (!options) note.textContent = "この武器の覚醒効果は未対応です。保存済みの設定は計算に反映されません。";
    else if (!eligible) note.textContent = `${options.minimumUncapLevel}凸・武器Lv${options.minimumWeaponLevel}以上で覚醒効果を反映します。現在の覚醒設定は保持されます。`;
    else if (selection && !type) note.textContent = "保存済みの覚醒タイプは未照合です。対応するタイプを選び直してください。";
    else if (!type) note.textContent = "覚醒を設定すると、加護対象外の効果を編成に反映します（数値・枠は要検証）。";
    else {
      const totals = new Map();
      for (const {level, effect} of type.effects) {
        if (level <= (selection.level ?? 0)) totals.set(effect.kind, (totals.get(effect.kind) ?? 0) + (effect.amountFlat ?? effect.amountPercent ?? 0));
      }
      note.textContent = `${totals.size ? [...totals].map(([kind, amount]) => `${labels[kind] ?? kind}+${amount.toLocaleString("ja-JP")}${kind === "charge-supplemental-damage" ? "" : "%"}`).join(" / ") : "Lv1は追加効果なし"}（要検証）`;
      const bonus = weaponAwakeningStatBonus(weapon, options);
      if (bonus.attack) note.textContent += ` / 武器ATK+${bonus.attack}`;
    }
  };
  typeSelect.addEventListener("change", () => {
    if (!typeSelect.value) delete weapon.awakening;
    else if (options?.types.some(type => type.formCode === typeSelect.value)) {
      weapon.awakening = { formCode: typeSelect.value, level: Math.max(1, Math.min(options.maximumLevel, weapon.awakening?.level ?? 1)) };
    }
    refresh(); onChange();
  });
  levelSelect.addEventListener("change", () => {
    if (!weapon.awakening) return;
    weapon.awakening.level = Number(levelSelect.value);
    refresh(); onChange();
  });
  refresh();
  return { element: container, refresh };
}
