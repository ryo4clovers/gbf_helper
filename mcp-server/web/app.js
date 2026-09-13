import {
  CALCULATOR_ENVIRONMENT_STORAGE_KEY,
  CALCULATOR_FORMATION_FORMAT,
  CALCULATOR_FORMATION_STORAGE_KEY,
  CALCULATOR_PROFILES_STORAGE_KEY,
  LEGACY_CALCULATOR_STORAGE_KEYS,
  createCalculatorEnvironment,
  createCalculatorFormation,
  mergeCalculatorEnvironment,
  mergeCalculatorFormation,
  parseCalculatorEnvironment,
  parseCalculatorFormation,
  parseCalculatorProfiles,
  removeCalculatorProfile,
  serializeCalculatorEnvironment,
  serializeCalculatorFormation,
  serializeCalculatorProfiles,
  upsertCalculatorProfile,
} from "/calculator-state-storage.js?v=2";
import { DEFAULT_CALCULATOR_DECK } from "/calculator-default-deck.js?v=1";
import { calculateEquipmentLevelStats } from "/equipment-level-stats.js";
import { createEquipmentLevelOptions } from "/equipment-level-options.js";
import {
  rebaseProtagonistForCompletionBonusChange,
  rebaseProtagonistForRankChange,
  rebaseProtagonistForSummonChange,
} from "/summon-stat-contribution.js";
import {
  MEMORIAL_ITEM_DEFINITIONS,
  calculateMemorialItemModifiers,
  defaultMemorialItemSettings,
  describeMemorialItemEffect,
} from "/memorial-item-config.js";
import {
  CREW_SUPPORT_DEFINITIONS,
  calculateCrewSupportEffects,
  defaultCrewSupportSettings,
  normalizeCrewSupportSettings,
} from "/crew-support-config.js";
import {
  JOB_COMPLETION_BONUS_DEFINITIONS,
  calculateJobCompletionBonuses,
  normalizeCompletedJobIds,
} from "/job-completion-bonus-config.js";
import {
  calculateJobGrowthBonuses,
  normalizeJobGrowthLevels,
} from "/job-growth-config.js?v=1";
import {
  JOB_CLASS_FILTER_ORDER,
  filterAndSortJobs,
} from "/job-picker-filter.js?v=1";
import {
  CATALOG_ELEMENT_ORDER,
  WEAPON_KIND_FILTER_OPTIONS,
  catalogRarityFilterOptions,
  filterAndSortCatalog,
} from "/catalog-picker-filter.js?v=1";

const $ = (id) => document.getElementById(id);
const form = $("calculator-form");
const deckField = $("deck-config");
function reportUnexpectedUiError(error) {
  const state = $("deck-state");
  if (!state) return;
  state.textContent = `画面の初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`;
  state.classList.add("error-text");
}
window.addEventListener("error", (event) => reportUnexpectedUiError(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportUnexpectedUiError(event.reason));
const numberFormat = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 3 });
const elementMeta = {
  "0": { name: "属性可変", className: "unknown" },
  "1": { name: "火", className: "fire" },
  "2": { name: "水", className: "water" },
  "3": { name: "土", className: "earth" },
  "4": { name: "風", className: "wind" },
  "5": { name: "光", className: "light" },
  "6": { name: "闇", className: "dark" },
};
const weaponKindSymbols = { "1": "⚔", "2": "⌁", "3": "♜", "4": "⌁", "5": "✣", "6": "⌖", "7": "◈", "8": "✧", "9": "♩", "10": "◒" };
const rarityLabels = { "1": "N", "2": "R", "3": "SR", "4": "SSR" };
const equipmentPlusBonus = { maximum: 99, attackPerMark: 5, hpPerMark: 1 };
const characterPlusBonus = { maximum: 99, attackPerMark: 3, hpPerMark: 1 };
const characterPickerResultLimit = 100;
const weaponPickerResultLimit = 100;
let jobCatalog = [];
let selectedJobClassTier = "";
let characterCatalog = [];
let selectedCharacterElementCode = "";
let selectedCharacterRarity = "";
let editingCharacterSlot = null;
let weaponCatalog = [];
let fallbackWeaponCatalog = [];
let selectedWeaponElementCode = "";
let selectedWeaponRarity = "";
let selectedWeaponKindCode = "";
let editingWeaponSlot = null;
let summonCatalog = [];
let selectedSummonElementCode = "";
let selectedSummonRarity = "";
let editingSummonSlot = null;
let selectedSupportSummon = null;
let latestDamageResult = null;
let weaponCriticalManuallySelected = false;
let persistenceReady = false;
let persistenceTimer = null;
let savedProfiles = [];
let selectedProfileId = "";

deckField.value = JSON.stringify(DEFAULT_CALCULATOR_DECK, null, 2);

function renderCatalogFilters({
  catalog,
  selectedElementCode,
  selectedRarity,
  rarities,
  elementContainerId,
  rarityContainerId,
  statusId,
  onChange,
}) {
  const availableElements = new Set(catalog.map((entry) => String(entry.elementCode)));
  const elementContainer = $(elementContainerId);
  elementContainer.replaceChildren();
  for (const elementCode of CATALOG_ELEMENT_ORDER.filter((code) => availableElements.has(code))) {
    const element = elementMeta[elementCode];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `element-filter-button ${element?.className ?? "unknown"}`;
    button.textContent = element?.name ?? "属性不明";
    button.setAttribute("aria-pressed", String(selectedElementCode === elementCode));
    button.addEventListener("click", () => onChange({
      elementCode: selectedElementCode === elementCode ? "" : elementCode,
      rarity: selectedRarity,
    }));
    elementContainer.append(button);
  }

  const rarityContainer = $(rarityContainerId);
  rarityContainer.replaceChildren();
  for (const rarity of rarities) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rarity-filter-button";
    button.textContent = rarity;
    button.setAttribute("aria-pressed", String(selectedRarity === rarity));
    button.addEventListener("click", () => onChange({
      elementCode: selectedElementCode,
      rarity: selectedRarity === rarity ? "" : rarity,
    }));
    rarityContainer.append(button);
  }

  const elementLabel = selectedElementCode === ""
    ? "全属性"
    : elementMeta[selectedElementCode]?.name ?? "属性不明";
  const rarityLabel = selectedRarity === "" ? "全レアリティ" : selectedRarity;
  $(statusId).textContent = selectedElementCode === "" && selectedRarity === ""
    ? "すべての属性・レアリティを表示"
    : `選択中: ${elementLabel}・${rarityLabel}`;
}

function renderCrewSupportEditor(settings) {
  const normalized = normalizeCrewSupportSettings(settings);
  const container = $("crew-support-editor");
  container.replaceChildren();
  for (const definition of CREW_SUPPORT_DEFINITIONS) {
    const row = document.createElement("label");
    row.className = "crew-support-row";
    const copy = document.createElement("span");
    copy.className = "crew-support-copy";
    const name = document.createElement("strong");
    name.textContent = definition.name;
    const effect = document.createElement("small");
    effect.textContent = definition.effect;
    copy.append(name, effect);
    const input = document.createElement("input");
    input.id = `crew-support-${definition.key}`;
    input.type = "checkbox";
    input.checked = normalized[definition.key];
    row.append(input, copy);
    container.append(row);
  }
}

function readCrewSupportSettings() {
  return Object.fromEntries(CREW_SUPPORT_DEFINITIONS.map((definition) => [
    definition.key,
    $(`crew-support-${definition.key}`)?.checked ?? true,
  ]));
}

const jobClassOrder = ["オリジン", "ClassI", "ClassII", "ClassIII", "ClassIV", "ClassV", "エクストラ", "エクストラII"];

function readCompletedJobIds() {
  return JOB_COMPLETION_BONUS_DEFINITIONS.flatMap((definition) => {
    const job = jobCatalog.find((candidate) => candidate.name === definition.name);
    return job && $(`job-completed-${job.jobId}`)?.checked ? [job.jobId] : [];
  });
}

function currentMainWeaponKindCode(config) {
  const main = config.weapons.find((weapon) => weapon.position === "main");
  const catalog = main?.isJobFallback ? fallbackWeaponCatalog : weaponCatalog;
  return catalog.find((weapon) => weapon.weaponId === main?.weaponId)?.weaponKindCode;
}

function mainWeaponCompletionAttackContribution(config, amountPercent) {
  const main = config.weapons.find((weapon) => weapon.position === "main");
  if (!Number.isFinite(main?.attackOverride) || !Number.isFinite(amountPercent)) return 0;
  return Math.round(main.attackOverride * amountPercent / 100);
}

function renderJobCompletionSummary(completedJobIds, config) {
  const selectedJob = catalogJob(config.protagonist.jobId);
  const result = calculateJobCompletionBonuses(
    completedJobIds, jobCatalog, selectedJob, currentMainWeaponKindCode(config),
  );
  const labels = {
    attack: "攻撃力", hp: "HP", da: "DA率", ta: "TA率", normalAttackDamage: "通常攻撃与ダメージ",
    damageCap: "ダメージ上限", abilityDamage: "アビリティダメージ", abilityDamageCap: "アビリティダメージ上限",
    defense: "防御力", healing: "回復力", healingCap: "回復上限", debuffSuccess: "弱体成功率",
    debuffResistance: "弱体耐性", dodge: "回避率", overdriveSuppression: "OD抑制",
    overdriveDamageReduction: "OD中被ダメ軽減", normalAttackChargeGain: "通常攻撃時奥義ゲージ上昇量",
    mainWeaponAttack: "メイン武器攻撃力",
  };
  const summary = $("job-completion-summary");
  summary.replaceChildren();
  const connectedKeys = new Set(["attack", "hp", "da", "ta", "normalAttackDamage", "mainWeaponAttack"]);
  for (const [key, amount] of Object.entries(result.totals)) {
    const chip = document.createElement("span");
    chip.className = connectedKeys.has(key) ? "connected" : "pending";
    chip.title = connectedKeys.has(key) ? "計算へ反映" : "集計のみ（計算未接続）";
    chip.textContent = `${labels[key] ?? key} +${numberFormat.format(amount)}${key === "normalAttackChargeGain" ? "" : "%"}`;
    summary.append(chip);
  }
  if (result.inactiveConditionalEffects.length > 0) {
    const note = document.createElement("small");
    note.textContent = `条件付き効果 ${result.inactiveConditionalEffects.length}件は現在の編成では対象外です`;
    summary.append(note);
  }
  $("job-completion-count").textContent = `${result.selectedJobIds.length} / ${JOB_COMPLETION_BONUS_DEFINITIONS.length}ジョブ`;
  return result;
}

function renderJobCompletionEditor(value) {
  const completedIds = new Set(normalizeCompletedJobIds(value, jobCatalog));
  const jobByName = new Map(jobCatalog.map((job) => [job.name, job]));
  const groups = new Map(jobClassOrder.map((tier) => [tier, []]));
  for (const definition of JOB_COMPLETION_BONUS_DEFINITIONS) {
    const job = jobByName.get(definition.name);
    if (job) groups.get(job.classTier)?.push({ definition, job });
  }
  const editor = $("job-completion-editor");
  editor.replaceChildren();
  for (const tier of jobClassOrder) {
    const entries = groups.get(tier) ?? [];
    if (entries.length === 0) continue;
    const group = document.createElement("details");
    group.className = "job-completion-group";
    const heading = document.createElement("summary");
    heading.textContent = `${tier}（${entries.filter(({ job }) => completedIds.has(job.jobId)).length} / ${entries.length}）`;
    const list = document.createElement("div");
    list.className = "job-completion-list";
    for (const { definition, job } of entries) {
      const row = document.createElement("label");
      row.className = "job-completion-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `job-completed-${job.jobId}`;
      input.checked = completedIds.has(job.jobId);
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = definition.name;
      const description = document.createElement("small");
      description.textContent = definition.description;
      copy.append(name, description);
      row.append(input, copy);
      list.append(row);
    }
    group.append(heading, list);
    editor.append(group);
  }
  renderJobCompletionSummary([...completedIds], readDeckConfig());
}

function readDeckConfig() {
  return JSON.parse(deckField.value);
}

function writeDeckConfig(config) {
  config.characters.sort((left, right) => left.slot - right.slot);
  config.weapons.sort((left, right) => left.slot - right.slot);
  const summonPositionOrder = { main: 0, grid: 1, sub: 2 };
  config.summons.sort((left, right) =>
    summonPositionOrder[left.position] - summonPositionOrder[right.position] || left.slot - right.slot,
  );
  deckField.value = JSON.stringify(config, null, 2);
}

function setPersistenceStatus(message, isError = false) {
  const status = $("persistence-status");
  status.textContent = message;
  status.classList.toggle("error-text", isError);
}

function persistRequest(request, message = "編成・個別環境をこの端末に自動保存済み") {
  if (!persistenceReady) return;
  const errors = [];
  try {
    localStorage.setItem(
      CALCULATOR_FORMATION_STORAGE_KEY,
      serializeCalculatorFormation(createCalculatorFormation(request)),
    );
  } catch (error) {
    errors.push(error);
  }
  try {
    localStorage.setItem(
      CALCULATOR_ENVIRONMENT_STORAGE_KEY,
      serializeCalculatorEnvironment(createCalculatorEnvironment(request)),
    );
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 0) setPersistenceStatus(message);
  else setPersistenceStatus(errors[0] instanceof Error ? errors[0].message : "自動保存に失敗しました", true);
}

function persistCurrentState(message) {
  try {
    persistRequest(buildRequest(), message);
  } catch (error) {
    // Keep the latest valid state while the JSON editor or a number field is temporarily invalid.
    if (message !== undefined) {
      setPersistenceStatus(error instanceof Error ? error.message : "端末への保存に失敗しました", true);
    }
  }
}

function resetFormation() {
  if (!window.confirm("現在の編成をデフォルトへ戻しますか？\n個別環境・名前付き保存・戦闘条件は削除されません。")) return;
  try {
    const currentRequest = buildRequest();
    applyFormationToForm(createCalculatorFormation({
      ...currentRequest,
      deckConfig: structuredClone(DEFAULT_CALCULATOR_DECK),
      supportSummon: undefined,
    }));
    selectProfile("");
    persistCurrentState("デフォルト編成にリセットしました");
    setProfileStatus("名前付き編成は保持されています");
    void calculate();
  } catch (error) {
    setPersistenceStatus(error instanceof Error ? error.message : "編成をリセットできませんでした", true);
  }
}

function schedulePersistence() {
  if (!persistenceReady) return;
  if (persistenceTimer !== null) window.clearTimeout(persistenceTimer);
  persistenceTimer = window.setTimeout(() => {
    persistenceTimer = null;
    persistCurrentState();
  }, 250);
}

function applyFormationToForm(formation) {
  const request = mergeCalculatorFormation(buildRequest(), formation);
  applyResolvedRequestToForm(request);
}

function applyResolvedRequestToForm(request) {
  applyCatalogWeaponLevelStatsToConfig(request.deckConfig);
  for (const summon of request.deckConfig.summons) {
    applyCatalogSummonLevelStats(summon, catalogSummon(summon.summonId));
  }
  applyRequestToForm(request);
}

function restorePersistedState() {
  let request = buildRequest();
  const restored = [];
  const failed = [];
  const environment = localStorage.getItem(CALCULATOR_ENVIRONMENT_STORAGE_KEY);
  if (environment !== null) {
    try {
      request = mergeCalculatorEnvironment(request, parseCalculatorEnvironment(environment));
      restored.push("個別環境");
    } catch {
      localStorage.removeItem(CALCULATOR_ENVIRONMENT_STORAGE_KEY);
      failed.push("個別環境");
    }
  }
  const formation = localStorage.getItem(CALCULATOR_FORMATION_STORAGE_KEY);
  if (formation !== null) {
    try {
      request = mergeCalculatorFormation(request, parseCalculatorFormation(formation));
      restored.push("編成");
    } catch {
      localStorage.removeItem(CALCULATOR_FORMATION_STORAGE_KEY);
      failed.push("編成");
    }
  }
  if (restored.length > 0) applyResolvedRequestToForm(request);
  if (failed.length > 0) {
    const restoredMessage = restored.length > 0 ? `${restored.join("・")}を復元、` : "";
    setPersistenceStatus(`${restoredMessage}${failed.join("・")}は復元できないため初期設定を使用`, true);
  } else if (restored.length > 0) {
    setPersistenceStatus(`保存した${restored.join("・")}を復元しました`);
  }
  return restored.length > 0;
}

function setProfileStatus(message, isError = false) {
  const status = $("profile-status");
  status.textContent = message;
  status.classList.toggle("error-text", isError);
}

function selectedProfile() {
  return savedProfiles.find((profile) => profile.id === selectedProfileId);
}

function renderProfileOptions(message) {
  const select = $("profile-select");
  select.replaceChildren(new Option("新しい保存枠", ""));
  for (const profile of savedProfiles) {
    select.append(new Option(profile.name, profile.id));
  }
  if (selectedProfile()) select.value = selectedProfileId;
  else selectedProfileId = "";
  $("load-profile").disabled = selectedProfileId === "";
  $("rename-profile").disabled = selectedProfileId === "";
  $("delete-profile").disabled = selectedProfileId === "";
  $("save-profile").textContent = selectedProfileId === "" ? "新規保存" : "上書き保存";
  if (message !== undefined) setProfileStatus(message);
  else setProfileStatus(`保存済み ${savedProfiles.length}件`);
}

function selectProfile(profileId, { clearName = true } = {}) {
  selectedProfileId = savedProfiles.some((profile) => profile.id === profileId) ? profileId : "";
  const profile = selectedProfile();
  if (profile) $("profile-name").value = profile.name;
  else if (clearName) $("profile-name").value = "";
  renderProfileOptions();
}

function restoreNamedProfiles() {
  const serialized = localStorage.getItem(CALCULATOR_PROFILES_STORAGE_KEY);
  if (serialized === null) {
    renderProfileOptions();
    return;
  }
  try {
    savedProfiles = parseCalculatorProfiles(serialized);
    renderProfileOptions();
  } catch {
    localStorage.removeItem(CALCULATOR_PROFILES_STORAGE_KEY);
    savedProfiles = [];
    renderProfileOptions();
    setProfileStatus("名前付き保存を復元できませんでした", true);
  }
}

function persistNamedProfiles() {
  localStorage.setItem(CALCULATOR_PROFILES_STORAGE_KEY, serializeCalculatorProfiles(savedProfiles));
}

function createProfileId() {
  return globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveNamedProfile() {
  const name = $("profile-name").value.trim();
  if (name === "") {
    setProfileStatus("保存名を入力してください", true);
    $("profile-name").focus();
    return;
  }
  const duplicate = savedProfiles.find((profile) => profile.name === name && profile.id !== selectedProfileId);
  if (duplicate) {
    setProfileStatus("同じ保存名があります。一覧から選んで上書きしてください", true);
    return;
  }
  try {
    const id = selectedProfileId || createProfileId();
    savedProfiles = upsertCalculatorProfile(savedProfiles, {
      id,
      name,
      updatedAt: new Date().toISOString(),
      formation: createCalculatorFormation(buildRequest()),
    });
    selectedProfileId = id;
    persistNamedProfiles();
    persistCurrentState();
    renderProfileOptions(`「${name}」を保存しました`);
  } catch (error) {
    setProfileStatus(error instanceof Error ? error.message : "名前付き保存に失敗しました", true);
  }
}

function renameNamedProfile() {
  const profile = selectedProfile();
  if (!profile) return;
  const name = $("profile-name").value.trim();
  if (name === "") {
    setProfileStatus("新しい保存名を入力してください", true);
    $("profile-name").focus();
    return;
  }
  const duplicate = savedProfiles.find((candidate) => candidate.name === name && candidate.id !== profile.id);
  if (duplicate) {
    setProfileStatus("同じ保存名があります", true);
    return;
  }
  try {
    savedProfiles = upsertCalculatorProfile(savedProfiles, {
      ...profile,
      name,
      updatedAt: new Date().toISOString(),
    });
    persistNamedProfiles();
    renderProfileOptions(`「${name}」へ名前を変更しました`);
  } catch (error) {
    setProfileStatus(error instanceof Error ? error.message : "名前を変更できませんでした", true);
  }
}

function deleteNamedProfile() {
  const profile = selectedProfile();
  if (!profile) return;
  if (!window.confirm(`保存済み編成「${profile.name}」を削除しますか？\nこの操作は元に戻せません。`)) return;
  try {
    savedProfiles = removeCalculatorProfile(savedProfiles, profile.id);
    selectedProfileId = "";
    $("profile-name").value = "";
    persistNamedProfiles();
    renderProfileOptions(`「${profile.name}」を削除しました`);
  } catch (error) {
    setProfileStatus(error instanceof Error ? error.message : "保存済み編成を削除できませんでした", true);
  }
}

async function loadNamedProfile() {
  const profile = selectedProfile();
  if (!profile) return;
  try {
    applyFormationToForm(profile.formation);
    persistCurrentState(`「${profile.name}」を現在の編成にしました`);
    await calculate();
    setProfileStatus(`「${profile.name}」を読み込みました`);
  } catch (error) {
    setProfileStatus(error instanceof Error ? error.message : "名前付き保存を読み込めませんでした", true);
  }
}

function createText(className, text) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

function createJobArt(className, job) {
  const art = document.createElement("span");
  art.className = className;
  art.append(createText("job-art-fallback", "◆"));
  if (!job?.imageUrl) return art;

  const image = document.createElement("img");
  image.className = "job-thumbnail";
  image.src = job.imageUrl;
  image.alt = `${job.name}のジョブ画像`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("load", () => art.classList.add("image-loaded"));
  image.addEventListener("error", () => image.remove());
  art.append(image);
  return art;
}

function createEquipmentArt(className, equipment, fallback, altText) {
  const art = document.createElement("span");
  art.className = className;
  art.append(createText("weapon-symbol equipment-art-fallback", fallback));
  if (!equipment?.imageUrl) return art;

  const image = document.createElement("img");
  image.className = "equipment-thumbnail";
  image.src = equipment.imageUrl;
  image.alt = altText;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("load", () => art.classList.add("image-loaded"));
  image.addEventListener("error", () => image.remove());
  art.append(image);
  return art;
}

function updateEquipmentPlusMark(equipment, nextPlusMark) {
  const previousPlusMark = equipment.plusMark ?? 0;
  const difference = nextPlusMark - previousPlusMark;
  equipment.plusMark = nextPlusMark;
  if (equipment.attackOverride != null) {
    equipment.attackOverride += difference * equipmentPlusBonus.attackPerMark;
  }
  if (equipment.hpOverride != null) {
    equipment.hpOverride += difference * equipmentPlusBonus.hpPerMark;
  }
}

function createEquipmentPlusField(equipment, name, findCurrentEquipment, onUpdated) {
  const label = document.createElement("label");
  label.textContent = "+";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = String(equipmentPlusBonus.maximum);
  input.step = "1";
  input.value = String(equipment.plusMark ?? 0);
  input.setAttribute("aria-label", `${name}のプラスボーナス`);
  input.addEventListener("input", () => {
    const value = Number(input.value);
    const isValid = Number.isInteger(value) && value >= 0 && value <= equipmentPlusBonus.maximum;
    input.setCustomValidity(isValid ? "" : `0〜${equipmentPlusBonus.maximum}の整数を入力してください`);
    if (!isValid) return;
    const config = readDeckConfig();
    const currentEquipment = findCurrentEquipment(config);
    if (!currentEquipment) return;
    const previousEquipment = { ...currentEquipment };
    updateEquipmentPlusMark(currentEquipment, value);
    writeDeckConfig(config);
    onUpdated(currentEquipment, config, previousEquipment);
    void calculate();
  });
  label.append(input);
  return label;
}

function catalogJob(jobId) {
  return jobCatalog.find((job) => job.jobId === jobId);
}

function createJobLevelField(config, job, key, label, maximum, minimum = 0) {
  const field = document.createElement("label");
  field.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(minimum);
  input.max = String(maximum);
  input.step = "1";
  input.value = String(config.protagonist[key] ?? minimum);
  input.disabled = maximum === 0;
  input.setAttribute("aria-label", `${label}を変更`);
  input.addEventListener("change", () => {
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < minimum || value > maximum) return;
    config.protagonist[key] = value;
    normalizeJobGrowthLevels(config.protagonist, job);
    writeDeckConfig(config);
    renderJobEditor(config);
    void calculate();
  });
  field.append(input);
  return field;
}

function jobGrowthStageSummary(label, totals) {
  const values = [
    totals.attack > 0 ? `ATK +${numberFormat.format(totals.attack)}` : "",
    totals.hp > 0 ? `HP +${numberFormat.format(totals.hp)}` : "",
    totals.doubleAttackRatePercent > 0 ? `DA +${totals.doubleAttackRatePercent}%` : "",
    totals.tripleAttackRatePercent > 0 ? `TA +${totals.tripleAttackRatePercent}%` : "",
  ].filter(Boolean);
  return values.length > 0 ? `${label}: ${values.join(" / ")}` : "";
}

function renderJobEditor(config) {
  const jobId = config.protagonist.jobId;
  const job = jobId ? catalogJob(jobId) : undefined;
  const protagonistElement = elementMeta[config.protagonist.elementCode];
  const card = document.createElement("article");
  card.className = `job-card ${jobId ? "occupied" : "empty"}`;
  const choice = document.createElement("button");
  choice.type = "button";
  choice.className = "job-choice";
  choice.addEventListener("click", openJobPicker);
  choice.setAttribute("aria-label", "主人公ジョブを選択");
  const icon = jobId && job
    ? createJobArt("job-symbol", job)
    : createText("job-symbol", jobId ? "◆" : "+");
  const details = document.createElement("span");
  details.className = "job-details";
  const heading = document.createElement("span");
  heading.className = "job-heading-row";
  const elementChip = createText(
    `protagonist-element-chip ${protagonistElement?.className ?? "unknown"}`,
    protagonistElement ? `${protagonistElement.name}属性` : "属性不明",
  );
  elementChip.setAttribute(
    "aria-label",
    `現在の主人公属性: ${protagonistElement?.name ?? "不明"}`,
  );
  heading.append(
    createText("job-name", job?.name ?? config.protagonist.jobNameHint ?? (jobId ? `ジョブ ${jobId}` : "ジョブを選択")),
    elementChip,
  );
  details.append(
    heading,
    createText(
      "job-meta",
      job
        ? `${job.classTier}・得意武器 ${job.weaponKinds.map((weapon) => weapon.name).join(" / ")}`
        : jobId
          ? "未登録ジョブ"
          : "主人公のジョブを設定",
    ),
  );
  choice.append(icon, details);
  card.append(choice);
  if (jobId) {
    normalizeJobGrowthLevels(config.protagonist, job);
    const controls = document.createElement("div");
    controls.className = "job-level-controls";
    controls.append(
      createJobLevelField(config, job, "jobLevel", "Lv", job?.maximumJobLevel ?? 20, 1),
      createJobLevelField(config, job, "masterLevel", "ML", job?.maximumMasterLevel ?? 0, job?.maximumMasterLevel ? 1 : 0),
      createJobLevelField(config, job, "perfectionProofLevel", "極致", job?.maximumPerfectionProofLevel ?? 0),
    );
    const growth = calculateJobGrowthBonuses(job, config.protagonist);
    const summaryText = [
      jobGrowthStageSummary("Lv", growth.jobLevel),
      jobGrowthStageSummary("ML", growth.masterLevel),
      jobGrowthStageSummary("極致", growth.perfectionProof),
    ].filter(Boolean).join(" ｜ ");
    const summary = createText("job-growth-summary", summaryText || "現在の段階に計算対象ボーナスはありません");
    controls.append(summary);
    card.append(controls);
  }
  $("job-editor").replaceChildren(card);
}

function renderJobResults(query = "") {
  const matches = filterAndSortJobs(jobCatalog, query, selectedJobClassTier);
  const results = $("job-results");
  results.replaceChildren();
  for (const job of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-weapon-card catalog-job-card";
    button.addEventListener("click", () => selectJob(job));
    const icon = createJobArt("catalog-art job-catalog-art", job);
    const details = document.createElement("span");
    details.className = "catalog-weapon-details";
    details.append(
      createText("catalog-weapon-name", job.name),
      createText("catalog-weapon-meta", `${job.nameEn} ・ ${job.jobId}`),
      createText("catalog-skill-list", `${job.classTier} ・ ${job.weaponKinds.map((weapon) => weapon.name).join(" / ")}`),
    );
    const status = createText(`verification-chip ${job.verificationStatus === "検証済み" ? "verified" : "draft"}`, job.verificationStatus);
    button.append(icon, details, status);
    results.append(button);
  }
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "picker-empty";
    empty.textContent = "一致するジョブがありません。未登録ジョブはJSONから指定できます。";
    results.append(empty);
  }
  $("job-catalog-count").textContent = `${matches.length} / ${jobCatalog.length}件`;
}

function renderJobClassFilters() {
  const availableClasses = new Set(jobCatalog.map((job) => job.classTier));
  const container = $("job-class-filters");
  container.replaceChildren();
  for (const classTier of JOB_CLASS_FILTER_ORDER.filter((name) => availableClasses.has(name))) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "job-class-filter";
    button.textContent = classTier;
    button.setAttribute("aria-pressed", String(selectedJobClassTier === classTier));
    button.addEventListener("click", () => {
      selectedJobClassTier = selectedJobClassTier === classTier ? "" : classTier;
      renderJobClassFilters();
      renderJobResults($("job-search").value);
    });
    container.append(button);
  }
  $("job-class-filter-status").textContent = selectedJobClassTier === ""
    ? "すべてのクラスを表示"
    : `選択中: ${selectedJobClassTier}`;
}

function openJobPicker() {
  $("job-search").value = "";
  selectedJobClassTier = "";
  $("remove-job").disabled = !readDeckConfig().protagonist.jobId;
  renderJobClassFilters();
  renderJobResults();
  $("job-picker").showModal();
  $("job-search").focus();
}

function selectJob(job) {
  const config = readDeckConfig();
  if (config.protagonist.jobId !== job.jobId) {
    delete config.protagonist.jobLevel;
    delete config.protagonist.masterLevel;
    delete config.protagonist.perfectionProofLevel;
    delete config.protagonist.baseDoubleAttackRate;
    delete config.protagonist.baseTripleAttackRate;
  }
  config.protagonist.jobId = job.jobId;
  config.protagonist.jobNameHint = job.name;
  writeDeckConfig(config);
  renderWeaponEditor();
  $("job-picker").close();
  void calculate();
}

function removeSelectedJob() {
  const config = readDeckConfig();
  delete config.protagonist.jobId;
  delete config.protagonist.jobNameHint;
  delete config.protagonist.jobLevel;
  delete config.protagonist.masterLevel;
  delete config.protagonist.perfectionProofLevel;
  delete config.protagonist.baseDoubleAttackRate;
  delete config.protagonist.baseTripleAttackRate;
  writeDeckConfig(config);
  renderWeaponEditor();
  $("job-picker").close();
  void calculate();
}

function catalogCharacter(characterId) {
  return characterCatalog.find((character) => character.characterId === characterId);
}

function characterForSlot(config, slot) {
  return config.characters.find((character) => character.slot === slot);
}

function createCharacterNumberField(config, character, key, label, options = {}) {
  const field = document.createElement("label");
  field.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(options.minimum ?? 0);
  input.max = String(options.maximum ?? 999999);
  input.step = "1";
  input.placeholder = "—";
  input.value = character[key] == null ? "" : String(character[key]);
  input.setAttribute("aria-label", `${character.nameHint ?? character.characterId}の${label}`);
  input.addEventListener("change", () => {
    const value = Number(input.value);
    const current = characterForSlot(config, character.slot);
    if (!current) return;
    if (input.value === "") delete current[key];
    else if (Number.isInteger(value) && value >= Number(input.min) && value <= Number(input.max)) current[key] = value;
    else return;
    writeDeckConfig(config);
    void calculate();
  });
  field.append(input);
  return field;
}

function createCharacterPlusField(config, character) {
  const field = document.createElement("label");
  field.textContent = "+";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = String(characterPlusBonus.maximum);
  input.step = "1";
  input.value = String(character.plusMark ?? 0);
  input.setAttribute("aria-label", `${character.nameHint ?? character.characterId}のプラスボーナス`);
  input.addEventListener("change", () => {
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < 0 || value > characterPlusBonus.maximum) return;
    const current = characterForSlot(config, character.slot);
    if (!current) return;
    const difference = value - (current.plusMark ?? 0);
    current.plusMark = value;
    if (current.attackOverride != null) current.attackOverride += difference * characterPlusBonus.attackPerMark;
    if (current.hpOverride != null) current.hpOverride += difference * characterPlusBonus.hpPerMark;
    writeDeckConfig(config);
    renderCharacterEditor(config);
    void calculate();
  });
  field.append(input);
  return field;
}

function createCharacterSlot(config, slot) {
  const character = characterForSlot(config, slot);
  const master = character ? catalogCharacter(character.characterId) : undefined;
  const element = master ? elementMeta[master.elementCode] : undefined;
  const article = document.createElement("article");
  article.className = `character-slot ${character ? "occupied" : "empty"}`;
  const choice = document.createElement("button");
  choice.type = "button";
  choice.className = "character-choice";
  choice.setAttribute("aria-label", `${slot <= 3 ? `前衛${slot}` : `サブ${slot - 3}`}のキャラクターを選択`);
  choice.addEventListener("click", () => openCharacterPicker(slot));
  const art = document.createElement("span");
  art.className = `character-art ${element?.className ?? "unknown"}`;
  art.append(
    createText("slot-badge", slot <= 3 ? `FRONT ${slot}` : `SUB ${slot - 3}`),
    createText("rarity-badge", master?.rarity ?? "—"),
    createText("character-symbol", character ? "♟" : "+"),
  );
  const info = document.createElement("span");
  info.className = "character-slot-info";
  info.append(
    createText("character-slot-name", character ? (master?.name ?? character.nameHint ?? character.characterId) : "キャラクターを選択"),
    createText("character-slot-meta", character ? `${element?.name ?? "属性不明"}・${master?.rarity ?? "未登録"}` : slot <= 3 ? `前衛 ${slot}` : `サブ ${slot - 3}`),
  );
  choice.append(art, info);
  article.append(choice);

  if (character) {
    const controls = document.createElement("div");
    controls.className = "character-slot-controls";
    controls.append(
      createCharacterNumberField(config, character, "level", "Lv", { minimum: 1, maximum: 150 }),
      createCharacterPlusField(config, character),
      createCharacterNumberField(config, character, "hpOverride", "表示HP"),
      createCharacterNumberField(config, character, "attackOverride", "表示ATK"),
    );
    article.append(controls);
  }
  return article;
}

function renderCharacterEditor(config = readDeckConfig()) {
  $("front-character-grid").replaceChildren(...Array.from({ length: 3 }, (_, index) => createCharacterSlot(config, index + 1)));
  $("back-character-grid").replaceChildren(...Array.from({ length: 2 }, (_, index) => createCharacterSlot(config, index + 4)));
  $("character-count").textContent = `${config.characters.length} / 5`;
}

function normalizeCharacterSearch(value) {
  return value.toLocaleLowerCase("ja").replace(/[\s・･._-]/g, "");
}

function renderCharacterResults(query = "") {
  const normalized = normalizeCharacterSearch(query.trim());
  const matches = filterAndSortCatalog(
    characterCatalog.filter((character) => {
      const element = elementMeta[character.elementCode]?.name ?? "";
      return normalizeCharacterSearch(
        [character.name, character.nameEn, character.characterId, element, character.rarity].join(" "),
      ).includes(normalized);
    }),
    selectedCharacterElementCode,
    selectedCharacterRarity,
    "characterId",
  );
  const visibleMatches = matches.slice(0, characterPickerResultLimit);
  const results = $("character-results");
  results.replaceChildren();
  for (const character of visibleMatches) {
    const element = elementMeta[character.elementCode];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-weapon-card catalog-character-card";
    button.addEventListener("click", () => selectCharacter(character));
    const art = document.createElement("span");
    art.className = `catalog-art character-catalog-art ${element?.className ?? "unknown"}`;
    art.append(createText("character-symbol", "♟"));
    const details = document.createElement("span");
    details.className = "catalog-weapon-details";
    details.append(
      createText("catalog-weapon-name", character.name),
      createText("catalog-weapon-meta", `${character.nameEn} ・ ${character.characterId}`),
      createText("catalog-skill-list", `${element?.name ?? "属性不明"}属性 ・ ${character.rarity}`),
    );
    const status = createText(`verification-chip ${character.verificationStatus === "検証済み" ? "verified" : "draft"}`, character.verificationStatus);
    button.append(art, details, status);
    results.append(button);
  }
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "picker-empty";
    empty.textContent = "一致するキャラクターがありません。未登録キャラクターはJSONから指定できます。";
    results.append(empty);
  }
  $("character-catalog-count").textContent = matches.length > visibleMatches.length
    ? `${matches.length}件中 ${visibleMatches.length}件を表示（全${characterCatalog.length}件）`
    : `${matches.length} / ${characterCatalog.length}件`;
}

function renderCharacterFilters() {
  renderCatalogFilters({
    catalog: characterCatalog,
    selectedElementCode: selectedCharacterElementCode,
    selectedRarity: selectedCharacterRarity,
    rarities: catalogRarityFilterOptions("character"),
    elementContainerId: "character-element-filters",
    rarityContainerId: "character-rarity-filters",
    statusId: "character-filter-status",
    onChange: ({ elementCode, rarity }) => {
      selectedCharacterElementCode = elementCode;
      selectedCharacterRarity = rarity;
      renderCharacterFilters();
      renderCharacterResults($("character-search").value);
    },
  });
}

function openCharacterPicker(slot) {
  editingCharacterSlot = slot;
  $("character-picker-slot-label").textContent = slot <= 3 ? `前衛 ${slot}を変更` : `サブ ${slot - 3}を変更`;
  $("character-search").value = "";
  selectedCharacterElementCode = "";
  selectedCharacterRarity = "";
  $("remove-character").disabled = !characterForSlot(readDeckConfig(), slot);
  renderCharacterFilters();
  renderCharacterResults();
  $("character-picker").showModal();
  $("character-search").focus();
}

function selectCharacter(master) {
  if (editingCharacterSlot == null) return;
  const config = readDeckConfig();
  config.characters = config.characters.filter((character) => character.slot !== editingCharacterSlot);
  config.characters.push({
    slot: editingCharacterSlot,
    position: editingCharacterSlot <= 3 ? "front" : "back",
    characterId: master.characterId,
    nameHint: master.name,
    plusMark: 0,
  });
  writeDeckConfig(config);
  renderCharacterEditor(config);
  $("character-picker").close();
  void calculate();
}

function removeSelectedCharacter() {
  if (editingCharacterSlot == null) return;
  const config = readDeckConfig();
  config.characters = config.characters.filter((character) => character.slot !== editingCharacterSlot);
  writeDeckConfig(config);
  renderCharacterEditor(config);
  $("character-picker").close();
  void calculate();
}

function catalogWeapon(weaponId) {
  return weaponCatalog.find((weapon) => weapon.weaponId === weaponId);
}

function catalogFallbackWeapon(weaponId) {
  return fallbackWeaponCatalog.find((weapon) => weapon.weaponId === weaponId);
}

function applyEquipmentRules(config) {
  const job = config.protagonist.jobId ? catalogJob(config.protagonist.jobId) : undefined;
  let mainWeapon = config.weapons.find((weapon) => weapon.position === "main");
  if (job && (!mainWeapon || mainWeapon.isJobFallback === true)) {
    const fallback = fallbackWeaponCatalog.find(
      (weapon) => weapon.weaponKindCode === job.weaponKinds[0]?.code,
    );
    if (fallback) {
      config.weapons = config.weapons.filter(
        (weapon) => weapon.position !== "main" && weapon.slot !== 1,
      );
      config.weapons.push({
        slot: 1,
        position: "main",
        weaponId: fallback.weaponId,
        isJobFallback: true,
        nameHint: fallback.name,
        level: fallback.level,
        uncapLevel: 0,
        plusMark: 0,
        attackOverride: fallback.attack,
        hpOverride: fallback.hp,
      });
      mainWeapon = config.weapons.find((weapon) => weapon.position === "main");
    }
  } else if (!config.protagonist.jobId && mainWeapon?.isJobFallback === true) {
    config.weapons = config.weapons.filter((weapon) => weapon !== mainWeapon);
    delete config.protagonist.elementCode;
    mainWeapon = undefined;
  }

  const master = mainWeapon
    ? mainWeapon.isJobFallback === true
      ? catalogFallbackWeapon(mainWeapon.weaponId)
      : catalogWeapon(mainWeapon.weaponId)
    : undefined;
  if (master?.elementCode) config.protagonist.elementCode = master.elementCode;
}

function renderMainWeaponCompatibility(config) {
  const warning = $("weapon-compatibility-warning");
  const job = config.protagonist.jobId ? catalogJob(config.protagonist.jobId) : undefined;
  const mainWeapon = config.weapons.find((weapon) => weapon.position === "main");
  const master = mainWeapon
    ? mainWeapon.isJobFallback === true
      ? catalogFallbackWeapon(mainWeapon.weaponId)
      : catalogWeapon(mainWeapon.weaponId)
    : undefined;
  if (!job || !mainWeapon || !master || job.weaponKinds.some((kind) => kind.code === master.weaponKindCode)) {
    warning.hidden = true;
    warning.textContent = "";
    return;
  }
  const allowedNames = job.weaponKinds.map((kind) => kind.name).join(" / ");
  const selectedKindName = jobCatalog
    .flatMap((entry) => entry.weaponKinds)
    .find((kind) => kind.code === master.weaponKindCode)?.name ?? `武器種${master.weaponKindCode}`;
  warning.textContent = `⚠ ${job.name}の得意武器は${allowedNames}です。メイン武器「${master.name}」（${selectedKindName}）は装備できません。計算用設定は保持しています。`;
  warning.hidden = false;
}

function weaponForSlot(config, slot) {
  if (slot === 1) return config.weapons.find((weapon) => weapon.position === "main");
  return config.weapons.find((weapon) => weapon.position === "grid" && weapon.slot === slot);
}

function applyCatalogWeaponLevelStats(weapon, master) {
  if (!master?.levelStats || weapon.level == null) return false;
  const minimumLevel = master.levelStats.points[0]?.level;
  if (minimumLevel == null || weapon.level < minimumLevel || weapon.level > master.levelStats.maximumLevel) return false;
  const stats = calculateEquipmentLevelStats(
    master.levelStats,
    weapon.level,
    weapon.plusMark ?? 0,
    { attack: equipmentPlusBonus.attackPerMark, hp: equipmentPlusBonus.hpPerMark },
  );
  weapon.attackOverride = stats.attack;
  weapon.hpOverride = stats.hp;
  return true;
}

function applyCatalogWeaponLevelStatsToConfig(config) {
  for (const weapon of config.weapons) {
    if (weapon.isJobFallback === true) continue;
    applyCatalogWeaponLevelStats(weapon, catalogWeapon(weapon.weaponId));
  }
}

function createWeaponSlot(config, slot) {
  const weapon = weaponForSlot(config, slot);
  const isJobFallback = slot === 1 && weapon?.isJobFallback === true;
  const master = weapon
    ? isJobFallback
      ? catalogFallbackWeapon(weapon.weaponId)
      : catalogWeapon(weapon.weaponId)
    : undefined;
  const element = master ? elementMeta[master.elementCode] : undefined;
  const article = document.createElement("article");
  article.className = `weapon-slot ${slot === 1 ? "main-slot" : "grid-slot"} ${weapon && !isJobFallback ? "occupied" : "empty"} ${isJobFallback ? "job-fallback" : ""}`;

  const choice = document.createElement("button");
  choice.type = "button";
  choice.className = "weapon-choice";
  choice.setAttribute("aria-label", `${slot === 1 ? "メイン武器" : `武器${slot}`}を選択`);
  choice.addEventListener("click", () => openWeaponPicker(slot));

  const art = createEquipmentArt(
    `weapon-art ${isJobFallback ? "unknown" : (element?.className ?? "unknown")}`,
    weapon && !isJobFallback ? master : undefined,
    weapon && !isJobFallback ? (weaponKindSymbols[master?.weaponKindCode] ?? "◆") : "+",
    `${master?.name ?? weapon?.nameHint ?? weapon?.weaponId ?? "武器"}の武器画像`,
  );
  art.prepend(
    createText("slot-badge", slot === 1 ? "MAIN" : String(slot)),
    createText("rarity-badge", isJobFallback ? "未選択" : master?.rarityCode === "4" ? "SSR" : master?.rarityCode === "3" ? "SR" : master?.rarityCode === "2" ? "R" : "—"),
  );
  choice.append(art);

  const info = document.createElement("span");
  info.className = "weapon-slot-info";
  info.append(
    createText("weapon-slot-name", weapon && !isJobFallback ? (master?.name ?? weapon.nameHint ?? weapon.weaponId) : "武器を選択"),
    createText(
      "weapon-slot-meta",
      isJobFallback
        ? `仮メイン: ${master?.name ?? weapon.nameHint ?? weapon.weaponId}`
        : weapon
          ? `${element?.name ?? "属性不明"}・${master ? "登録済み" : "未登録"}`
          : slot === 1
            ? "メイン武器"
            : `武器枠 ${slot}`,
    ),
  );
  choice.append(info);
  article.append(choice);

  if (weapon && !isJobFallback) {
    const controls = document.createElement("div");
    controls.className = "weapon-slot-controls";
    let stats;
    if (master?.levelStats) {
      const levelLabel = document.createElement("label");
      levelLabel.textContent = "Lv";
      const levelSelect = document.createElement("select");
      const currentLevel = weapon.level ?? master.levelStats.maximumLevel;
      const levelOptions = createEquipmentLevelOptions(master.levelStats, currentLevel);
      for (const levelOption of levelOptions) {
        const option = new Option(
          levelOption.verified ? String(levelOption.level) : `${levelOption.level}（未検証）`,
          String(levelOption.level),
        );
        option.disabled = !levelOption.verified;
        levelSelect.append(option);
      }
      levelSelect.value = String(currentLevel);
      levelSelect.setAttribute("aria-label", `${master.name}の検証済みレベル`);
      levelSelect.title = "実測または図鑑で確認できた境界Lvだけ選択できます";
      levelSelect.addEventListener("change", () => {
        const value = Number(levelSelect.value);
        if (!levelOptions.some((option) => option.verified && option.level === value)) return;
        weapon.level = value;
        applyCatalogWeaponLevelStats(weapon, master);
        writeDeckConfig(config);
        if (stats) {
          stats.textContent = `HP ${numberFormat.format(weapon.hpOverride)} / ATK ${numberFormat.format(weapon.attackOverride)}`;
        }
        void calculate();
      });
      levelLabel.append(levelSelect);
      controls.append(levelLabel);
    }
    const skillLabel = document.createElement("label");
    skillLabel.textContent = "SLv";
    const skillInput = document.createElement("input");
    skillInput.type = "number";
    skillInput.min = "1";
    skillInput.max = "20";
    skillInput.step = "1";
    skillInput.value = String(weapon.skillLevel ?? 15);
    skillInput.setAttribute("aria-label", `${master?.name ?? weapon.weaponId}のスキルレベル`);
    skillInput.addEventListener("change", () => {
      const value = Number(skillInput.value);
      if (!Number.isInteger(value) || value < 1 || value > 20) return;
      weapon.skillLevel = value;
      writeDeckConfig(config);
      void calculate();
    });
    skillLabel.append(skillInput);
    stats = createText("weapon-attack", `HP ${weapon.hpOverride == null ? "—" : numberFormat.format(weapon.hpOverride)} / ATK ${weapon.attackOverride == null ? "—" : numberFormat.format(weapon.attackOverride)}`);
    controls.append(
      skillLabel,
      createEquipmentPlusField(
        weapon,
        master?.name ?? weapon.weaponId,
        (currentConfig) => weaponForSlot(currentConfig, slot),
        (currentWeapon) => {
          stats.textContent = `HP ${currentWeapon.hpOverride == null ? "—" : numberFormat.format(currentWeapon.hpOverride)} / ATK ${currentWeapon.attackOverride == null ? "—" : numberFormat.format(currentWeapon.attackOverride)}`;
        },
      ),
      stats,
    );
    article.append(controls);
  } else if (isJobFallback) {
    const fallback = document.createElement("div");
    fallback.className = "weapon-slot-controls fallback-summary";
    fallback.append(
      createText("fallback-label", "仮武器を計算に反映"),
      createText("weapon-attack", `HP ${weapon.hpOverride == null ? "—" : numberFormat.format(weapon.hpOverride)} / ATK ${weapon.attackOverride == null ? "—" : numberFormat.format(weapon.attackOverride)}`),
    );
    article.append(fallback);
  }
  return article;
}

function renderWeaponEditor() {
  try {
    const config = readDeckConfig();
    applyEquipmentRules(config);
    applyCatalogWeaponLevelStatsToConfig(config);
    normalizeJobGrowthLevels(config.protagonist, catalogJob(config.protagonist.jobId));
    writeDeckConfig(config);
    renderJobEditor(config);
    renderCharacterEditor(config);
    renderMainWeaponCompatibility(config);
    const mainSlot = $("main-weapon-slot");
    const grid = $("weapon-grid");
    mainSlot.replaceChildren(createWeaponSlot(config, 1));
    grid.replaceChildren(...Array.from({ length: 9 }, (_, index) => createWeaponSlot(config, index + 2)));
    const equippedWeaponCount = config.weapons.filter((weapon) => weapon.isJobFallback !== true).length;
    $("weapon-count").textContent = `${equippedWeaponCount} / 10`;
    renderSummonEditor();
    $("deck-state").classList.remove("error-text");
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "編成JSONを読み込めません";
    $("deck-state").classList.add("error-text");
  }
}

function renderWeaponResults(query = "") {
  const normalized = query.trim().toLocaleLowerCase("ja");
  const matches = filterAndSortCatalog(
    weaponCatalog.filter((weapon) => {
      const searchable = [weapon.name, weapon.nameEn, weapon.weaponId, ...weapon.skills.map((skill) => skill.name)].filter(Boolean).join(" ").toLocaleLowerCase("ja");
      return searchable.includes(normalized);
    }),
    selectedWeaponElementCode,
    selectedWeaponRarity,
    "weaponId",
    selectedWeaponKindCode,
  );
  const results = $("weapon-results");
  results.replaceChildren();
  for (const weapon of matches.slice(0, weaponPickerResultLimit)) {
    const element = elementMeta[weapon.elementCode];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-weapon-card catalog-equipment-card";
    button.addEventListener("click", () => selectWeapon(weapon));
    const art = createEquipmentArt(
      `catalog-art ${element?.className ?? "unknown"}`,
      weapon,
      weaponKindSymbols[weapon.weaponKindCode] ?? "◆",
      `${weapon.name}の武器画像`,
    );
    const details = document.createElement("span");
    details.className = "catalog-weapon-details";
    details.append(
      createText("catalog-weapon-name", weapon.name),
      createText("catalog-weapon-meta", `${element?.name ?? "属性不明"} ・ ${rarityLabels[weapon.rarityCode] ?? "未設定"} ・ ${weapon.weaponId}`),
      createText("catalog-skill-list", weapon.skills.length ? weapon.skills.map((skill) => skill.name).join(" / ") : "武器スキルなし"),
    );
    const status = createText(`verification-chip ${weapon.verificationStatus === "検証済み" ? "verified" : "draft"}`, weapon.verificationStatus);
    button.append(art, details, status);
    results.append(button);
  }
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "picker-empty";
    empty.textContent = "一致する登録武器がありません。未登録武器はJSONから追加できます。";
    results.append(empty);
  }
  const displayed = Math.min(matches.length, weaponPickerResultLimit);
  $("catalog-count").textContent = `${displayed}件表示 / 該当${matches.length}件 / 全${weaponCatalog.length}件`;
}

function renderWeaponFilters() {
  renderCatalogFilters({
    catalog: weaponCatalog,
    selectedElementCode: selectedWeaponElementCode,
    selectedRarity: selectedWeaponRarity,
    rarities: catalogRarityFilterOptions("weapon"),
    elementContainerId: "weapon-element-filters",
    rarityContainerId: "weapon-rarity-filters",
    statusId: "weapon-filter-status",
    onChange: ({ elementCode, rarity }) => {
      selectedWeaponElementCode = elementCode;
      selectedWeaponRarity = rarity;
      renderWeaponFilters();
      renderWeaponResults($("weapon-search").value);
    },
  });

  const weaponKindContainer = $("weapon-kind-filters");
  weaponKindContainer.replaceChildren();
  for (const weaponKind of WEAPON_KIND_FILTER_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "weapon-kind-filter-button";
    button.textContent = weaponKind.name;
    button.setAttribute("aria-pressed", String(selectedWeaponKindCode === weaponKind.code));
    button.addEventListener("click", () => {
      selectedWeaponKindCode = selectedWeaponKindCode === weaponKind.code ? "" : weaponKind.code;
      renderWeaponFilters();
      renderWeaponResults($("weapon-search").value);
    });
    weaponKindContainer.append(button);
  }

  const elementLabel = selectedWeaponElementCode === ""
    ? "全属性"
    : elementMeta[selectedWeaponElementCode]?.name ?? "属性不明";
  const rarityLabel = selectedWeaponRarity === "" ? "全レアリティ" : selectedWeaponRarity;
  const weaponKindLabel = selectedWeaponKindCode === ""
    ? "全武器種"
    : WEAPON_KIND_FILTER_OPTIONS.find((weaponKind) => weaponKind.code === selectedWeaponKindCode)?.name ?? "武器種不明";
  $("weapon-filter-status").textContent = selectedWeaponElementCode === ""
    && selectedWeaponRarity === ""
    && selectedWeaponKindCode === ""
    ? "すべての属性・レアリティ・武器種を表示"
    : `選択中: ${elementLabel}・${rarityLabel}・${weaponKindLabel}`;
}

function openWeaponPicker(slot) {
  editingWeaponSlot = slot;
  $("picker-slot-label").textContent = slot === 1 ? "メイン武器を変更" : `武器枠 ${slot}を変更`;
  $("weapon-search").value = "";
  selectedWeaponElementCode = "";
  selectedWeaponRarity = "";
  selectedWeaponKindCode = "";
  const currentWeapon = weaponForSlot(readDeckConfig(), slot);
  $("remove-weapon").disabled = !currentWeapon || currentWeapon.isJobFallback === true;
  renderWeaponFilters();
  renderWeaponResults();
  $("weapon-picker").showModal();
  $("weapon-search").focus();
}

function selectWeapon(master) {
  if (editingWeaponSlot == null) return;
  const config = readDeckConfig();
  config.weapons = config.weapons.filter((weapon) =>
    editingWeaponSlot === 1 ? weapon.position !== "main" && weapon.slot !== 1 : weapon.slot !== editingWeaponSlot,
  );
  config.weapons.push({
    slot: editingWeaponSlot,
    position: editingWeaponSlot === 1 ? "main" : "grid",
    weaponId: master.weaponId,
    nameHint: master.name,
    level: master.levelStats?.maximumLevel ?? master.selectionDefaults?.level,
    uncapLevel: master.selectionDefaults?.uncapLevel ?? (master.levelStats ? 4 : undefined),
    skillLevel: master.selectionDefaults?.skillLevel ?? (master.skills.length ? 15 : undefined),
    plusMark: 0,
    attackOverride: master.selectionDefaults?.attack,
    hpOverride: master.selectionDefaults?.hp,
  });
  applyCatalogWeaponLevelStats(config.weapons.at(-1), master);
  writeDeckConfig(config);
  renderWeaponEditor();
  $("weapon-picker").close();
  void calculate();
}

function removeSelectedWeapon() {
  if (editingWeaponSlot == null) return;
  const config = readDeckConfig();
  config.weapons = config.weapons.filter((weapon) =>
    editingWeaponSlot === 1 ? weapon.position !== "main" : weapon.slot !== editingWeaponSlot,
  );
  writeDeckConfig(config);
  renderWeaponEditor();
  $("weapon-picker").close();
  void calculate();
}

function setEditorMode(mode) {
  if (mode === "visual") renderWeaponEditor();
  const visual = mode === "visual";
  $("visual-editor").hidden = !visual;
  $("json-editor").hidden = visual;
  $("visual-tab").classList.toggle("selected", visual);
  $("json-tab").classList.toggle("selected", !visual);
  $("visual-tab").setAttribute("aria-selected", String(visual));
  $("json-tab").setAttribute("aria-selected", String(!visual));
}

function catalogSummon(summonId) {
  return summonCatalog.find((summon) => summon.summonId === summonId);
}

function summonForSlot(config, position, slot) {
  return config.summons.find((summon) => summon.position === position && summon.slot === slot);
}

function summonSlotLabel(position, slot) {
  if (position === "main") return "メイン召喚石";
  if (position === "sub") return `サブ加護 ${slot}`;
  return `召喚石 ${slot}`;
}

function applyCatalogSummonLevelStats(summon, master) {
  if (!master?.levelStats || summon.level == null) return false;
  const point = master.levelStats.points.find((candidate) => candidate.level === summon.level);
  if (!point) return false;
  const stats = calculateEquipmentLevelStats(
    master.levelStats,
    summon.level,
    summon.plusMark ?? 0,
    { attack: equipmentPlusBonus.attackPerMark, hp: equipmentPlusBonus.hpPerMark },
  );
  summon.uncapLevel = point.uncapLevel;
  summon.attackOverride = stats.attack;
  summon.hpOverride = stats.hp;
  return true;
}

function createSummonSlot(config, position, slot) {
  const summon = summonForSlot(config, position, slot);
  const master = summon ? catalogSummon(summon.summonId) : undefined;
  const element = master ? elementMeta[master.elementCode] : undefined;
  const article = document.createElement("article");
  article.className = `weapon-slot summon-slot ${position === "main" ? "main-slot" : position === "sub" ? "sub-slot" : "grid-slot"} ${summon ? "occupied" : "empty"}`;

  const choice = document.createElement("button");
  choice.type = "button";
  choice.className = "weapon-choice";
  choice.setAttribute("aria-label", `${summonSlotLabel(position, slot)}を選択`);
  choice.addEventListener("click", () => openSummonPicker(position, slot));
  const art = createEquipmentArt(
    `weapon-art summon-art ${element?.className ?? "unknown"}`,
    master,
    summon ? "✦" : "+",
    `${master?.name ?? summon?.nameHint ?? summon?.summonId ?? "召喚石"}の召喚石画像`,
  );
  art.prepend(
    createText("slot-badge", position === "main" ? "MAIN" : position === "sub" ? `SUB ${slot}` : String(slot)),
    createText("rarity-badge", master?.rarityCode === "4" ? "SSR" : master?.rarityCode === "3" ? "SR" : master?.rarityCode === "2" ? "R" : "—"),
  );
  const info = document.createElement("span");
  info.className = "weapon-slot-info";
  info.append(
    createText("weapon-slot-name", summon ? (master?.name ?? summon.nameHint ?? summon.summonId) : "召喚石を選択"),
    createText("weapon-slot-meta", summon ? `${element?.name ?? "属性不明"}・${master ? "登録済み" : "未登録"}` : summonSlotLabel(position, slot)),
  );
  choice.append(art, info);
  article.append(choice);

  if (summon) {
    const controls = document.createElement("div");
    controls.className = "weapon-slot-controls";
    const levelLabel = document.createElement("label");
    levelLabel.textContent = "Lv";
    const levelSelect = document.createElement("select");
    const currentLevel = summon.level ?? master?.levelStats?.maximumLevel;
    const levelOptions = createEquipmentLevelOptions(master?.levelStats, currentLevel);
    if (levelOptions.length === 0 && currentLevel != null) {
      levelOptions.push({ level: currentLevel, verified: false });
    }
    for (const levelOption of levelOptions) {
      const option = new Option(
        levelOption.verified ? String(levelOption.level) : `${levelOption.level}（未検証）`,
        String(levelOption.level),
      );
      option.disabled = !levelOption.verified;
      levelSelect.append(option);
    }
    levelSelect.value = currentLevel == null ? "" : String(currentLevel);
    levelSelect.disabled = !master?.levelStats;
    levelSelect.setAttribute("aria-label", `${master?.name ?? summon.summonId}の検証済みレベル`);
    levelSelect.title = master?.levelStats
      ? "実測または図鑑で確認できた境界Lvだけ選択できます"
      : "この召喚石はレベル別ステータスが未登録です";
    let stats;
    levelSelect.addEventListener("change", () => {
      const value = Number(levelSelect.value);
      if (!levelOptions.some((option) => option.verified && option.level === value)) return;
      const previousSummons = config.summons.map((entry) => ({ ...entry }));
      summon.level = value;
      applyCatalogSummonLevelStats(summon, master);
      rebaseProtagonistForSummonChange(config, previousSummons);
      writeDeckConfig(config);
      if (stats) {
        stats.textContent = `HP ${numberFormat.format(summon.hpOverride)} / ATK ${numberFormat.format(summon.attackOverride)}`;
      }
      void calculate();
    });
    levelLabel.append(levelSelect);
    stats = createText("weapon-attack", `HP ${summon.hpOverride == null ? "—" : numberFormat.format(summon.hpOverride)} / ATK ${summon.attackOverride == null ? "—" : numberFormat.format(summon.attackOverride)}`);
    controls.append(
      levelLabel,
      createEquipmentPlusField(
        summon,
        master?.name ?? summon.summonId,
        (currentConfig) => currentConfig.summons.find(
          (currentSummon) => currentSummon.position === position && currentSummon.slot === slot,
        ),
        (currentSummon, currentConfig, previousSummon) => {
          const previousSummons = currentConfig.summons.map((entry) =>
            entry === currentSummon ? previousSummon : entry,
          );
          rebaseProtagonistForSummonChange(currentConfig, previousSummons);
          writeDeckConfig(currentConfig);
          stats.textContent = `HP ${currentSummon.hpOverride == null ? "—" : numberFormat.format(currentSummon.hpOverride)} / ATK ${currentSummon.attackOverride == null ? "—" : numberFormat.format(currentSummon.attackOverride)}`;
        },
      ),
      stats,
    );
    article.append(controls);
  }
  return article;
}

function renderSummonEditor() {
  try {
    const config = readDeckConfig();
    $("main-summon-slot").replaceChildren(createSummonSlot(config, "main", 1));
    $("summon-grid").replaceChildren(...Array.from({ length: 4 }, (_, index) => createSummonSlot(config, "grid", index + 2)));
    $("sub-summon-grid").replaceChildren(...Array.from({ length: 2 }, (_, index) => createSummonSlot(config, "sub", index + 1)));
    $("summon-count").textContent = `${config.summons.length} / 7`;
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "召喚石編成を読み込めません";
    $("deck-state").classList.add("error-text");
  }
}

function renderSupportSummonEditor() {
  const master = selectedSupportSummon
    ? catalogSummon(selectedSupportSummon.summonId)
    : undefined;
  const element = master ? elementMeta[master.elementCode] : undefined;
  const article = document.createElement("article");
  article.className = `weapon-slot summon-slot support-summon-card ${master ? "occupied" : "empty"}`;
  const choice = document.createElement("button");
  choice.type = "button";
  choice.className = "weapon-choice";
  choice.setAttribute("aria-label", "サポート召喚石を選択");
  choice.addEventListener("click", openSupportSummonPicker);
  const art = createEquipmentArt(
    `weapon-art summon-art ${element?.className ?? "unknown"}`,
    master,
    master ? "✦" : "+",
    `${master?.name ?? "召喚石"}の召喚石画像`,
  );
  art.prepend(
    createText("slot-badge", "SUPPORT"),
    createText("rarity-badge", master?.rarityCode === "4" ? "SSR" : master?.rarityCode === "3" ? "SR" : master?.rarityCode === "2" ? "R" : "—"),
  );
  const info = document.createElement("span");
  info.className = "weapon-slot-info";
  info.append(
    createText("weapon-slot-name", master?.name ?? "サポート召喚石を選択"),
    createText("weapon-slot-meta", master ? `${element?.name ?? "属性不明"}・${master.auraName}` : "クエスト開始前の選択枠"),
  );
  choice.append(art, info);
  article.append(choice);
  if (master) {
    const notes = document.createElement("div");
    notes.className = "support-summon-notes";
    notes.append(
      createText("", "1ターン目から召喚可能"),
      createText("", "ステータス・サブ効果なし"),
      createText("", "メイン装備時のみの効果なし"),
    );
    article.append(notes);
  }
  $("support-summon-slot").replaceChildren(article);
}

function renderSummonResults(query = "") {
  const normalized = query.trim().toLocaleLowerCase("ja");
  const availableSummons = availableSummonsForPicker();
  const matches = filterAndSortCatalog(
    availableSummons.filter((summon) =>
      [summon.name, summon.summonId, summon.auraName, summon.auraDescription]
        .join(" ")
        .toLocaleLowerCase("ja")
        .includes(normalized),
    ),
    selectedSummonElementCode,
    selectedSummonRarity,
    "summonId",
  );
  const results = $("summon-results");
  results.replaceChildren();
  for (const summon of matches) {
    const element = elementMeta[summon.elementCode];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-weapon-card catalog-equipment-card catalog-summon-card";
    button.addEventListener("click", () => selectSummon(summon));
    const art = createEquipmentArt(
      `catalog-art summon-catalog-art ${element?.className ?? "unknown"}`,
      summon,
      "✦",
      `${summon.name}の召喚石画像`,
    );
    const details = document.createElement("span");
    details.className = "catalog-weapon-details";
    details.append(
      createText("catalog-weapon-name", summon.name),
      createText("catalog-weapon-meta", `${element?.name ?? "属性不明"} ・ ${rarityLabels[summon.rarityCode] ?? "未設定"} ・ ${summon.summonId}`),
      createText("catalog-skill-list", `${summon.auraName}：${summon.auraDescription}`),
    );
    const status = createText(`verification-chip ${summon.verificationStatus === "検証済み" ? "verified" : "draft"}`, summon.verificationStatus);
    button.append(art, details, status);
    results.append(button);
  }
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "picker-empty";
    empty.textContent = "一致する登録召喚石がありません。未登録召喚石はJSONから追加できます。";
    results.append(empty);
  }
  $("summon-catalog-count").textContent = `${matches.length} / ${availableSummons.length}件`;
}

function availableSummonsForPicker() {
  return editingSummonSlot?.kind === "support"
    ? summonCatalog.filter((summon) => summon.supportSelectable)
    : summonCatalog;
}

function renderSummonFilters() {
  renderCatalogFilters({
    catalog: availableSummonsForPicker(),
    selectedElementCode: selectedSummonElementCode,
    selectedRarity: selectedSummonRarity,
    rarities: catalogRarityFilterOptions("summon"),
    elementContainerId: "summon-element-filters",
    rarityContainerId: "summon-rarity-filters",
    statusId: "summon-filter-status",
    onChange: ({ elementCode, rarity }) => {
      selectedSummonElementCode = elementCode;
      selectedSummonRarity = rarity;
      renderSummonFilters();
      renderSummonResults($("summon-search").value);
    },
  });
}

function openSummonPicker(position, slot) {
  editingSummonSlot = { kind: "deck", position, slot };
  $("summon-picker-slot-label").textContent = `${summonSlotLabel(position, slot)}を変更`;
  $("summon-search").value = "";
  selectedSummonElementCode = "";
  selectedSummonRarity = "";
  const removeButton = $("remove-summon");
  removeButton.disabled = position === "main" || !summonForSlot(readDeckConfig(), position, slot);
  removeButton.title = position === "main" ? "メイン召喚石は外せません" : "";
  renderSummonFilters();
  renderSummonResults();
  $("summon-picker").showModal();
  $("summon-search").focus();
}

function openSupportSummonPicker() {
  editingSummonSlot = { kind: "support" };
  $("summon-picker-slot-label").textContent = "クエスト開始前に選ぶサポート召喚石を変更";
  $("summon-search").value = "";
  selectedSummonElementCode = "";
  selectedSummonRarity = "";
  $("remove-summon").disabled = selectedSupportSummon === null;
  $("remove-summon").title = "";
  renderSummonFilters();
  renderSummonResults();
  $("summon-picker").showModal();
  $("summon-search").focus();
}

function selectSummon(master) {
  if (editingSummonSlot == null) return;
  if (editingSummonSlot.kind === "support") {
    if (!master.supportSelectable) return;
    selectedSupportSummon = { summonId: master.summonId, nameHint: master.name };
    renderSupportSummonEditor();
    $("summon-picker").close();
    void calculate();
    return;
  }
  const { position, slot } = editingSummonSlot;
  const config = readDeckConfig();
  const previousSummons = [...config.summons];
  config.summons = config.summons.filter((summon) =>
    position === "main" ? summon.position !== "main" : summon.position !== position || summon.slot !== slot,
  );
  config.summons.push({
    slot,
    position,
    summonId: master.summonId,
    nameHint: master.name,
    level: master.selectionDefaults?.level,
    uncapLevel: master.selectionDefaults?.uncapLevel,
    plusMark: master.selectionDefaults?.plusMark ?? 0,
    attackOverride: master.selectionDefaults?.attack,
    hpOverride: master.selectionDefaults?.hp,
  });
  rebaseProtagonistForSummonChange(config, previousSummons);
  writeDeckConfig(config);
  renderSummonEditor();
  $("summon-picker").close();
  void calculate();
}

function removeSelectedSummon() {
  if (editingSummonSlot == null) return;
  if (editingSummonSlot.kind === "support") {
    selectedSupportSummon = null;
    renderSupportSummonEditor();
    $("summon-picker").close();
    void calculate();
    return;
  }
  const { position, slot } = editingSummonSlot;
  if (position === "main") return;
  const config = readDeckConfig();
  const previousSummons = [...config.summons];
  config.summons = config.summons.filter((summon) => summon.position !== position || summon.slot !== slot);
  rebaseProtagonistForSummonChange(config, previousSummons);
  writeDeckConfig(config);
  renderSummonEditor();
  $("summon-picker").close();
  void calculate();
}

function numberValue(id) {
  const value = Number($(id).value);
  return Number.isFinite(value) ? value : 0;
}

function readMemorialItemSettings() {
  const defaults = defaultMemorialItemSettings();
  return {
    includeExtinctionCrestInLocalResults: $("include-extinction-crest-local")?.checked ?? true,
    items: Object.fromEntries(MEMORIAL_ITEM_DEFINITIONS.map((definition) => {
      const enabled = $(`memorial-enabled-${definition.id}`)?.checked ?? true;
      const levelField = $(`memorial-level-${definition.id}`);
      const amountField = $(`memorial-amount-${definition.id}`);
      return [definition.id, {
        enabled,
        ...(levelField === null ? {} : { level: Number(levelField.value) }),
        ...(amountField === null ? {} : { amountPercent: Number(amountField.value) }),
      }];
    })),
    ...($("memorial-item-editor") === null ? defaults : {}),
  };
}

function renderMemorialItemEditor(savedSettings) {
  const container = $("memorial-item-editor");
  if (container === null) return;
  const settings = savedSettings ?? defaultMemorialItemSettings();
  container.replaceChildren();

  $("include-extinction-crest-local").checked = settings.includeExtinctionCrestInLocalResults ?? true;

  for (const groupName of [...new Set(MEMORIAL_ITEM_DEFINITIONS.map((item) => item.group))]) {
    const group = document.createElement("section");
    group.className = "memorial-group";
    const heading = document.createElement("h3");
    heading.textContent = groupName;
    group.append(heading);
    for (const definition of MEMORIAL_ITEM_DEFINITIONS.filter((item) => item.group === groupName)) {
      const state = settings.items?.[definition.id] ?? {};
      const row = document.createElement("div");
      row.className = "memorial-item-row";
      const nameLabel = document.createElement("label");
      nameLabel.className = "memorial-name";
      const checkbox = document.createElement("input");
      checkbox.id = `memorial-enabled-${definition.id}`;
      checkbox.type = "checkbox";
      checkbox.checked = state.enabled ?? true;
      const name = document.createElement("span");
      name.textContent = definition.name;
      const effect = document.createElement("small");
      effect.className = "memorial-effect";
      effect.textContent = describeMemorialItemEffect(definition, state);
      name.append(effect);
      if (definition.kind === "character-deferred") {
        const deferred = document.createElement("small");
        deferred.className = "memorial-note";
        deferred.textContent = "設定のみ保存（キャラクター検証後に計算接続）";
        name.append(deferred);
      }
      nameLabel.append(checkbox, name);
      const controls = document.createElement("div");
      controls.className = "memorial-controls";
      if (definition.defaultLevel !== undefined) {
        const levelLabel = document.createElement("label");
        levelLabel.className = "number-field";
        const levelText = document.createElement("span");
        levelText.textContent = "Lv";
        const level = document.createElement("input");
        level.id = `memorial-level-${definition.id}`;
        level.type = "number";
        level.min = "0";
        level.max = String(definition.maxLevel);
        level.step = "1";
        level.value = String(state.level ?? definition.defaultLevel);
        levelLabel.append(levelText, level);
        controls.append(levelLabel);
      }
      if (definition.kind === "damage-dealt") {
        const amountLabel = document.createElement("label");
        amountLabel.className = "number-field";
        const amountText = document.createElement("span");
        amountText.textContent = "効果量";
        const amount = document.createElement("input");
        amount.id = `memorial-amount-${definition.id}`;
        amount.type = "number";
        amount.min = "0";
        amount.max = String(definition.maxAmountPercent);
        amount.step = "0.1";
        amount.value = String(state.amountPercent ?? definition.defaultAmountPercent);
        const unit = document.createElement("em");
        unit.textContent = "%";
        amountLabel.append(amountText, amount, unit);
        controls.append(amountLabel);
      }
      row.append(nameLabel, controls);
      group.append(row);
    }
    container.append(group);
  }
}

function buildRequest() {
  const deckConfig = readDeckConfig();
  const previousRank = deckConfig.protagonist.rank;
  deckConfig.protagonist.rank = numberValue("player-rank");
  rebaseProtagonistForRankChange(deckConfig, previousRank);
  applyEquipmentRules(deckConfig);
  const selectedJob = catalogJob(deckConfig.protagonist.jobId);
  normalizeJobGrowthLevels(deckConfig.protagonist, selectedJob);
  const growth = calculateJobGrowthBonuses(selectedJob, deckConfig.protagonist);
  deckConfig.protagonist.memorialItems = readMemorialItemSettings();
  deckConfig.protagonist.crewSupport = readCrewSupportSettings();
  const completion = renderJobCompletionSummary(readCompletedJobIds(), deckConfig);
  deckConfig.protagonist.completedJobIds = completion.selectedJobIds;
  rebaseProtagonistForCompletionBonusChange(
    deckConfig,
    completion.totals.attack ?? 0,
    completion.totals.hp ?? 0,
    mainWeaponCompletionAttackContribution(deckConfig, completion.totals.mainWeaponAttack ?? 0),
    growth.totals.attack,
    growth.totals.hp,
  );
  deckConfig.protagonist.masterBonusAttackPercent = completion.totals.attack ?? 0;
  deckConfig.protagonist.masterBonusHpPercent = completion.totals.hp ?? 0;
  deckConfig.protagonist.jobCompletionDoubleAttackRate = completion.totals.da ?? 0;
  deckConfig.protagonist.jobCompletionTripleAttackRate = completion.totals.ta ?? 0;
  writeDeckConfig(deckConfig);
  const memorialModifiers = calculateMemorialItemModifiers(
    deckConfig.protagonist.memorialItems,
    deckConfig.protagonist.elementCode,
    $("enemy-element").value,
  );
  const crewSupportEffects = calculateCrewSupportEffects(deckConfig.protagonist.crewSupport);
  return {
    schemaVersion: 1,
    deckConfig,
    protagonistCurrentHpPercent: numberValue("protagonist-hp-percent"),
    supportSummon: selectedSupportSummon ?? undefined,
    enemy: {
      name: $("enemy-name").value.trim() || undefined,
      elementCode: $("enemy-element").value,
      defense: numberValue("enemy-defense"),
    },
    modifiers: {
      ...memorialModifiers,
      shipAttackPercent: crewSupportEffects.shipAttackPercent,
      furnaceAttackPercent: crewSupportEffects.furnaceAttackPercent,
      jobNormalAttackDamagePercent: completion.totals.normalAttackDamage ?? 0,
    },
    random: {
      minimum: numberValue("random-min"),
      maximum: numberValue("random-max"),
      step: numberValue("random-step"),
    },
  };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "処理に失敗しました");
  return payload;
}

function formatDamage(value) {
  return Number.isFinite(value) ? numberFormat.format(value) : "—";
}

const advantageTargetByAttacker = {
  "1": "4",
  "2": "1",
  "3": "2",
  "4": "3",
  "5": "6",
  "6": "5",
};

function currentTargetRequest(request) {
  const attackerElement = request.deckConfig.protagonist?.elementCode;
  const advantageTarget = advantageTargetByAttacker[attackerElement];
  const appliesTargetDamage = request.enemy.elementCode === advantageTarget;
  return {
    ...request,
    modifiers: {
      ...request.modifiers,
      targetElementDamagePercent: appliesTargetDamage
        ? request.modifiers.targetElementDamagePercent
        : 0,
    },
  };
}

function predictionRequests(request) {
  const attackerElement = request.deckConfig.protagonist?.elementCode;
  const advantageTarget = advantageTargetByAttacker[attackerElement];
  if (advantageTarget === undefined) throw new Error("主人公属性から有利属性を解決できません");
  const advantageMemorial = calculateMemorialItemModifiers(
    request.deckConfig.protagonist?.memorialItems,
    attackerElement,
    advantageTarget,
  );
  return {
    normal: {
      ...request,
      enemy: { ...request.enemy, elementCode: attackerElement },
      modifiers: {
        ...request.modifiers,
        targetElementDamagePercent: 0,
        extinctionCrestDoubleAttackRatePercent: 0,
        extinctionCrestTripleAttackRatePercent: 0,
      },
    },
    advantage: {
      ...request,
      enemy: { ...request.enemy, elementCode: advantageTarget },
      modifiers: {
        ...request.modifiers,
        targetElementDamagePercent: advantageMemorial.targetElementDamagePercent,
        extinctionCrestDoubleAttackRatePercent: 0,
        extinctionCrestTripleAttackRatePercent: 0,
      },
    },
  };
}

const stageNames = {
  "normal-weapon-skill": "通常攻刃",
  "normal-stamina": "通常渾身",
  "magna-stamina": "方陣渾身",
  "normal-enmity": "通常背水",
  "elemental-attack": "属性攻撃",
  "crew-ship": "船",
  "crew-furnace": "炉",
  "normal-attack-damage": "ジョブ通常与ダメ",
  "damage-dealt": "与ダメージ",
  "target-element-damage": "対属性与ダメ",
};

const issueNames = {
  "damage-cap-unresolved": "ダメージ上限は未適用です",
  "rounding-order-unresolved": "厳密な途中丸めは未確定です",
  "independent-component-randomness-provisional": "本体と追撃は独立乱数として計算しています",
  "critical-probability-unresolved": "クリティカル発生率の抽選規則は未確定のため、合計期待値には含めていません",
};

const calculationModelNames = {
  "article-2026-07": "記事モデル（2026-07）",
  "staged-normal-attack-base": "防御先行モデル（旧）",
};

const roundingNames = {
  ceil: "切り上げ",
  floor: "切り捨て",
};

function appliedStageRow(stage) {
  const rounding = roundingNames[stage.rounding];
  return {
    name: `${stageNames[stage.stage] || stage.stage}${rounding ? `（${rounding}）` : ""}`,
    multiplier: stage.multiplier,
    output: stage.outputDamage,
  };
}

function calculationBreakdownRows(baseDamage) {
  if (baseDamage.model !== "article-2026-07" || baseDamage.articleTrace === undefined) {
    return [
      {
        name: `敵防御 ÷ ${numberFormat.format(baseDamage.enemyDefense)}（切り上げ）`,
        multiplier: 1 / baseDamage.enemyDefense,
        output: baseDamage.defenseAdjustedBaseAttack,
      },
      ...baseDamage.stages.map(appliedStageRow),
    ];
  }

  const trace = baseDamage.articleTrace;
  const rows = [
    { name: "表示攻撃力", multiplier: 1, output: trace.displayedAttack },
    { name: "精度処理 ÷ 10（切り上げ）", multiplier: 0.1, output: trace.precisionStep },
  ];
  for (const stage of baseDamage.stages) {
    rows.push(appliedStageRow(stage));
    if (stage.stage === "crew-furnace") {
      rows.push({ name: "精度を戻す × 10", multiplier: 10, output: trace.crewAdjustedAttack });
    }
    if (stage.stage === "elemental-attack") {
      rows.push({
        name: `敵防御 ÷ ${numberFormat.format(baseDamage.enemyDefense)}（丸めなし）`,
        multiplier: 1 / baseDamage.enemyDefense,
        output: trace.prePostCapDamage,
      });
    }
  }
  return rows;
}

function renderLocalResult(result) {
  const body = result.bodyDamageDistribution;
  const critical = result.criticalBodyDamage;
  const criticalToggle = $("weapon-critical-toggle");
  const useCritical = criticalToggle.checked && critical !== undefined;
  const distribution = useCritical ? critical.damageDistribution : body;

  $("body-card").classList.toggle("critical-mode", useCritical);
  $("body-icon").textContent = useCritical ? `×${numberFormat.format(critical.criticalDamageMultiplier)}` : "◇";
  $("body-expected").textContent = formatDamage(
    useCritical ? critical.nominalDamage : result.baseDamage.damageBeforeRandomAndCap,
  );
  $("body-range").textContent = `${formatDamage(distribution.minimumDamage)} — ${formatDamage(distribution.maximumDamage)}`;
  $("body-note").hidden = !useCritical;
  if (useCritical) {
    $("body-note").textContent = `武器スキル発生率 ${numberFormat.format(critical.weaponSkillCriticalRatePercent)}%`;
  }

  const hp = result.protagonistHp;
  $("protagonist-hp").textContent = hp === undefined ? "—" : formatDamage(hp.hp);
  if (hp === undefined) {
    $("protagonist-hp-note").textContent = "主人公HPが未設定です";
  } else {
    const notes = [`基礎HP ${formatDamage(hp.baseHp)}`];
    if (hp.weaponSkillHpPercent > 0) {
      notes.push(`武器スキル +${numberFormat.format(hp.weaponSkillHpPercent)}%`);
    }
    if (hp.summonAuraPercent > 0) {
      notes.push(`召喚石加護 +${numberFormat.format(hp.summonAuraPercent)}%`);
    }
    if (hp.weaponSkillHpPercent === 0 && hp.summonAuraPercent === 0) notes.push("補正なし");
    if (hp.issues.includes("fractional-rounding-unresolved")) notes.push("端数処理は暫定");
    if (hp.issues.includes("weapon-skill-hp-baseline-unresolved")) notes.push("基礎HPの基準は要検証");
    $("protagonist-hp-note").textContent = notes.join("・");
  }

  const criticalRate = critical?.weaponSkillCriticalRatePercent ?? 0;
  $("critical-rate").textContent = `${numberFormat.format(criticalRate)}%`;
  $("critical-rate-note").textContent = critical === undefined
    ? "現在の敵属性では発動なし"
    : "武器スキル・有利属性時";

  const multiattack = result.multiattackRates;
  $("da-rate").textContent = `${numberFormat.format(multiattack.doubleAttackRatePercent)}%`;
  $("ta-rate").textContent = `${numberFormat.format(multiattack.tripleAttackRatePercent)}%`;
  const multiattackNotes = [];
  if (multiattack.issues.includes("job-base-rate-unresolved")) multiattackNotes.push("ジョブ基礎率未解決");
  if (multiattack.issues.includes("character-effects-unresolved")) multiattackNotes.push("キャラ効果未反映");
  if (multiattack.issues.includes("battle-buffs-unresolved")) multiattackNotes.push("バトル中バフ未反映");
  $("multiattack-rate-note").textContent = multiattackNotes.length === 0
    ? "ジョブ・武器スキル"
    : multiattackNotes.join("・");
}

function selectWeaponCritical() {
  if (latestDamageResult === null) return;
  weaponCriticalManuallySelected = true;
  renderLocalResult(latestDamageResult);
}

function render(response, predictions) {
  const result = response.result;
  const critical = result.criticalBodyDamage;
  const criticalToggle = $("weapon-critical-toggle");
  const advantageCritical = predictions.advantage.result.criticalBodyDamage;
  const advantageUsesCritical =
    advantageCritical !== undefined && advantageCritical.weaponSkillCriticalRatePercent >= 100;

  latestDamageResult = result;
  $("game-normal-prediction").textContent = formatDamage(
    predictions.normal.result.baseDamage.damageBeforeRandomAndCap,
  );
  $("game-advantage-prediction").textContent = formatDamage(
    advantageUsesCritical
      ? advantageCritical.nominalDamage
      : predictions.advantage.result.baseDamage.damageBeforeRandomAndCap,
  );
  $("game-advantage-note").textContent = advantageUsesCritical
    ? `武器クリティカル ${numberFormat.format(advantageCritical.weaponSkillCriticalRatePercent)}%を反映`
    : "武器クリティカル未反映";

  criticalToggle.disabled = critical === undefined;
  if (critical === undefined) {
    criticalToggle.checked = false;
    weaponCriticalManuallySelected = false;
    $("critical-switch-note").textContent = "有利属性かつ対象スキルがある場合に利用できます";
  } else if (critical.weaponSkillCriticalRatePercent >= 100) {
    criticalToggle.checked = true;
    weaponCriticalManuallySelected = false;
    $("critical-switch-note").textContent = `発生率 ${numberFormat.format(critical.weaponSkillCriticalRatePercent)}%・自動有効`;
  } else {
    if (!weaponCriticalManuallySelected) criticalToggle.checked = false;
    $("critical-switch-note").textContent = `発生率 ${numberFormat.format(critical.weaponSkillCriticalRatePercent)}%`;
  }

  renderLocalResult(result);
  $("pattern-count").textContent = `${numberFormat.format(result.bodyDamageDistribution.patternCount)} patterns`;
  $("calculation-model").textContent = calculationModelNames[result.baseDamage.model] || result.baseDamage.model;

  const rows = calculationBreakdownRows(result.baseDamage);
  const stageRows = $("stage-rows");
  stageRows.replaceChildren();
  for (const row of rows) {
    const tableRow = document.createElement("tr");
    for (const value of [row.name, `×${numberFormat.format(row.multiplier)}`, formatDamage(row.output)]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      tableRow.append(cell);
    }
    stageRows.append(tableRow);
  }

  const notices = [
    ...result.issues.map((issue) => issueNames[issue] || issue),
    ...response.deckResolutionIssues.map((issue) => `${issue.path}: ${issue.message}`),
  ];
  $("notice-panel").hidden = notices.length === 0;
  const noticeList = $("notice-list");
  noticeList.replaceChildren();
  for (const notice of notices) {
    const item = document.createElement("li");
    item.textContent = notice;
    noticeList.append(item);
  }
  $("deck-state").textContent = response.deckResolutionIssues.length === 0
    ? "編成を正常に解決しました"
    : `編成を解決しました（確認事項 ${response.deckResolutionIssues.length}件）`;
  $("deck-state").classList.remove("error-text");
}

function applyRequestToForm(request) {
  deckField.value = JSON.stringify(request.deckConfig, null, 2);
  selectedSupportSummon = request.supportSummon ?? null;
  renderWeaponEditor();
  renderSupportSummonEditor();
  renderMemorialItemEditor(request.deckConfig.protagonist.memorialItems);
  renderCrewSupportEditor(request.deckConfig.protagonist.crewSupport ?? defaultCrewSupportSettings());
  renderJobCompletionEditor(request.deckConfig.protagonist.completedJobIds);
  $("player-rank").value = String(request.deckConfig.protagonist.rank ?? 1);
  $("enemy-element").value = request.enemy.elementCode;
  $("enemy-defense").value = String(request.enemy.defense);
  $("enemy-name").value = request.enemy.name || "";
  $("protagonist-hp-percent").value = String(request.protagonistCurrentHpPercent ?? 100);
  renderProtagonistHpPercent();
  $("random-min").value = String(request.random?.minimum ?? 0.95);
  $("random-max").value = String(request.random?.maximum ?? 1.05);
  $("random-step").value = String(request.random?.step ?? 0.001);
}

function renderProtagonistHpPercent() {
  $("protagonist-hp-percent-value").textContent = `${$("protagonist-hp-percent").value}%`;
}

function conciseResult(response) {
  const result = response.result;
  return {
    status: result.status,
    body: result.bodyDamageDistribution,
    critical: result.criticalBodyDamage,
    pursuit: result.pursuitDamage?.damageDistribution,
    total: result.totalDamageDistribution,
    issues: result.issues,
    deckResolutionIssues: response.deckResolutionIssues,
  };
}

function registerWebMcpTool() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const registration = context.registerTool(
    {
      name: "calculate_normal_attack_damage",
      title: "通常攻撃ダメージ計算",
      description: "編成、敵防御、環境倍率から通常攻撃本体・追撃・合計の101乱数分布を計算し、画面にも表示する。",
      inputSchema: {
        type: "object",
        properties: {
          schemaVersion: { const: 1 },
          deckConfig: { type: "object" },
          protagonistCurrentHpPercent: { type: "number", minimum: 1, maximum: 100, default: 100 },
          supportSummon: {
            type: "object",
            properties: {
              summonId: { type: "string", minLength: 1 },
              nameHint: { type: "string", minLength: 1, maxLength: 100 },
            },
            required: ["summonId"], additionalProperties: false,
          },
          enemy: {
            type: "object",
            properties: {
              id: { type: "string" }, name: { type: "string" },
              elementCode: { type: "string", enum: ["1", "2", "3", "4", "5", "6"] },
              defense: { type: "number", exclusiveMinimum: 0 },
            },
            required: ["elementCode", "defense"], additionalProperties: false,
          },
          modifiers: {
            type: "object",
            properties: {
              allElementAttackPercent: { type: "number", minimum: 0, maximum: 1000 },
              elementAttackPercent: { type: "number", minimum: 0, maximum: 1000 },
              shipAttackPercent: { type: "number", minimum: 0, maximum: 1000 },
              furnaceAttackPercent: { type: "number", minimum: 0, maximum: 1000 },
              jobNormalAttackDamagePercent: { type: "number", minimum: 0, maximum: 1000 },
              damageDealtPercent: { type: "number", minimum: 0, maximum: 1000 },
              targetElementDamagePercent: { type: "number", minimum: 0, maximum: 1000 },
              damageCapPercent: { type: "number", minimum: 0, maximum: 1000 },
              normalAttackDamageCapPercent: { type: "number", minimum: 0, maximum: 1000 },
              extinctionCrestDoubleAttackRatePercent: { type: "number", minimum: 0, maximum: 1000 },
              extinctionCrestTripleAttackRatePercent: { type: "number", minimum: 0, maximum: 1000 },
              chainBurstPerformancePercent: { type: "number", minimum: 0, maximum: 1000 },
            },
            additionalProperties: false,
          },
          random: {
            type: "object",
            properties: {
              minimum: { type: "number", exclusiveMinimum: 0 },
              maximum: { type: "number", exclusiveMinimum: 0 },
              step: { type: "number", exclusiveMinimum: 0 },
            },
            additionalProperties: false,
          },
        },
        required: ["schemaVersion", "deckConfig", "enemy"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const comparisonRequests = predictionRequests(input);
        const [response, normalPrediction, advantagePrediction] = await Promise.all([
          postJson("/api/calculate", input),
          postJson("/api/calculate", comparisonRequests.normal),
          postJson("/api/calculate", comparisonRequests.advantage),
        ]);
        applyRequestToForm(input);
        persistRequest(input);
        render(response, { normal: normalPrediction, advantage: advantagePrediction });
        return conciseResult(response);
      },
    },
    { signal: lifecycle.signal },
  );
  Promise.resolve(registration).catch(() => undefined);
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}

async function calculate() {
  const button = form.querySelector(".calculate-button");
  button.disabled = true;
  button.classList.add("loading");
  try {
    const request = buildRequest();
    persistRequest(request);
    const comparisonRequests = predictionRequests(request);
    const [response, normalPrediction, advantagePrediction] = await Promise.all([
      postJson("/api/calculate", currentTargetRequest(request)),
      postJson("/api/calculate", comparisonRequests.normal),
      postJson("/api/calculate", comparisonRequests.advantage),
    ]);
    render(response, { normal: normalPrediction, advantage: advantagePrediction });
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "計算に失敗しました";
    $("deck-state").classList.add("error-text");
  } finally {
    button.disabled = false;
    button.classList.remove("loading");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void calculate();
});
form.addEventListener("input", schedulePersistence);
form.addEventListener("change", schedulePersistence);
$("protagonist-hp-percent").addEventListener("input", () => {
  renderProtagonistHpPercent();
  schedulePersistence();
});
$("protagonist-hp-percent").addEventListener("change", () => void calculate());
$("memorial-item-editor").addEventListener("change", () => {
  renderMemorialItemEditor(readMemorialItemSettings());
  void calculate();
});
$("job-completion-editor").addEventListener("change", () => void calculate());
$("complete-all-jobs").addEventListener("click", () => {
  renderJobCompletionEditor(jobCatalog.map((job) => job.jobId));
  void calculate();
});
$("clear-completed-jobs").addEventListener("click", () => {
  renderJobCompletionEditor([]);
  void calculate();
});
$("include-extinction-crest-local").addEventListener("change", () => void calculate());
$("player-rank").addEventListener("change", () => void calculate());

$("config-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const content = await file.text();
    const parsed = JSON.parse(content);
    if (parsed?.format === CALCULATOR_FORMATION_FORMAT) {
      applyFormationToForm(parseCalculatorFormation(content));
    } else {
      deckField.value = JSON.stringify(parsed, null, 2);
      renderWeaponEditor();
    }
    selectProfile("");
    persistCurrentState("読み込んだ設定を端末に保存しました");
    void calculate();
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "設定を読み込めませんでした";
    $("deck-state").classList.add("error-text");
  } finally {
    event.target.value = "";
  }
});

$("game-deck-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const converted = await postJson("/api/convert-deck", JSON.parse(await file.text()));
    deckField.value = JSON.stringify(converted, null, 2);
    renderWeaponEditor();
    selectProfile("");
    $("deck-state").textContent = "deck.jsonを個人IDを含まない設定へ変換しました";
    $("deck-state").classList.remove("error-text");
    persistCurrentState("変換した編成を端末に保存しました");
    void calculate();
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "変換に失敗しました";
    $("deck-state").classList.add("error-text");
  }
});

$("save-local").addEventListener("click", () => {
  persistCurrentState("この端末に保存しました");
});

$("reset-formation").addEventListener("click", resetFormation);

$("profile-select").addEventListener("change", (event) => {
  selectProfile(event.target.value);
});

$("save-profile").addEventListener("click", saveNamedProfile);
$("load-profile").addEventListener("click", () => void loadNamedProfile());
$("rename-profile").addEventListener("click", renameNamedProfile);
$("delete-profile").addEventListener("click", deleteNamedProfile);

$("save-config").addEventListener("click", () => {
  try {
    const content = JSON.stringify(
      JSON.parse(serializeCalculatorFormation(createCalculatorFormation(buildRequest()))),
      null,
      2,
    );
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    anchor.download = "gbf-calculator-formation.v2.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "JSONを保存できませんでした";
    $("deck-state").classList.add("error-text");
  }
});

$("open-battle").addEventListener("click", () => {
  const configuredRequest = buildRequest();
  const request = currentTargetRequest(configuredRequest);
  persistRequest(configuredRequest);
  sessionStorage.setItem(
    "gbf-helper-battle-setup-v1",
    JSON.stringify({ schemaVersion: 1, request, enemyMaxHp: 1_000_000 }),
  );
  window.location.href = "/battle.html";
});

$("visual-tab").addEventListener("click", () => setEditorMode("visual"));
$("json-tab").addEventListener("click", () => setEditorMode("json"));
$("weapon-critical-toggle").addEventListener("change", selectWeaponCritical);
$("close-job-picker").addEventListener("click", () => $("job-picker").close());
$("remove-job").addEventListener("click", removeSelectedJob);
$("job-search").addEventListener("input", (event) => renderJobResults(event.target.value));
$("job-picker").addEventListener("click", (event) => {
  if (event.target === $("job-picker")) $("job-picker").close();
});
$("close-character-picker").addEventListener("click", () => $("character-picker").close());
$("remove-character").addEventListener("click", removeSelectedCharacter);
$("character-search").addEventListener("input", (event) => renderCharacterResults(event.target.value));
$("character-picker").addEventListener("click", (event) => {
  if (event.target === $("character-picker")) $("character-picker").close();
});
$("close-picker").addEventListener("click", () => $("weapon-picker").close());
$("remove-weapon").addEventListener("click", removeSelectedWeapon);
$("weapon-search").addEventListener("input", (event) => renderWeaponResults(event.target.value));
$("weapon-picker").addEventListener("click", (event) => {
  if (event.target === $("weapon-picker")) $("weapon-picker").close();
});
$("close-summon-picker").addEventListener("click", () => $("summon-picker").close());
$("remove-summon").addEventListener("click", removeSelectedSummon);
$("summon-search").addEventListener("input", (event) => renderSummonResults(event.target.value));
$("summon-picker").addEventListener("click", (event) => {
  if (event.target === $("summon-picker")) $("summon-picker").close();
});

async function initialize() {
  for (const key of LEGACY_CALCULATOR_STORAGE_KEYS) localStorage.removeItem(key);
  renderCrewSupportEditor(readDeckConfig().protagonist.crewSupport);
  renderMemorialItemEditor(readDeckConfig().protagonist.memorialItems);
  try {
    const [jobResponse, characterResponse, weaponResponse, fallbackWeaponResponse, summonResponse] = await Promise.all([
      fetch("/api/catalog/jobs"),
      fetch("/api/catalog/characters"),
      fetch("/api/catalog/weapons"),
      fetch("/api/catalog/job-fallback-weapons"),
      fetch("/api/catalog/summons"),
    ]);
    if (!jobResponse.ok || !characterResponse.ok || !weaponResponse.ok || !fallbackWeaponResponse.ok || !summonResponse.ok) throw new Error("編成カタログを読み込めませんでした");
    jobCatalog = (await jobResponse.json()).jobs;
    characterCatalog = (await characterResponse.json()).characters;
    weaponCatalog = (await weaponResponse.json()).weapons;
    fallbackWeaponCatalog = (await fallbackWeaponResponse.json()).weapons;
    summonCatalog = (await summonResponse.json()).summons;
    renderJobCompletionEditor(readDeckConfig().protagonist.completedJobIds);
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "編成カタログを読み込めませんでした";
    $("deck-state").classList.add("error-text");
  }
  restorePersistedState();
  restoreNamedProfiles();
  persistenceReady = true;
  renderWeaponEditor();
  renderSupportSummonEditor();
  registerWebMcpTool();
  await calculate();
}

void initialize();
