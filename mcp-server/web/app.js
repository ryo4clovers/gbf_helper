const defaultDeck = {
  schemaVersion: 1,
  format: "gbf-helper-calculator-deck",
  name: "火属性・アグニス検証編成",
  protagonist: {
    elementCode: "1",
    jobId: "110001",
    jobNameHint: "ナイト",
    jobLevel: 20,
    masterLevel: 1,
    perfectionProofLevel: 0,
    attackOverride: 22801,
    hpOverride: 4877,
  },
  weapons: [
    { slot: 1, position: "main", weaponId: "1040201400", nameHint: "イフリートハルベルト", level: 150, skillLevel: 15, plusMark: 0, attackOverride: 2170, hpOverride: 241 },
    { slot: 2, position: "grid", weaponId: "1040218900", nameHint: "オーバーライド", level: 150, skillLevel: 15, plusMark: 0, attackOverride: 3114, hpOverride: 331 },
  ],
  summons: [
    { slot: 1, position: "main", summonId: "2040094000", nameHint: "アグニス", level: 250, uncapLevel: 6, plusMark: 0, attackOverride: 4157, hpOverride: 1414 },
  ],
  characters: [],
};

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
  "1": { name: "火", className: "fire" },
  "2": { name: "水", className: "water" },
  "3": { name: "土", className: "earth" },
  "4": { name: "風", className: "wind" },
  "5": { name: "光", className: "light" },
  "6": { name: "闇", className: "dark" },
};
const weaponKindSymbols = { "1": "⚔", "2": "⌁", "3": "♜", "4": "⌁", "5": "✣", "6": "⌖", "7": "◈", "8": "✧", "9": "♩", "10": "◒" };
const equipmentPlusBonus = { maximum: 99, attackPerMark: 5, hpPerMark: 1 };
const characterPlusBonus = { maximum: 99, attackPerMark: 3, hpPerMark: 1 };
const characterPickerResultLimit = 100;
let jobCatalog = [];
let characterCatalog = [];
let editingCharacterSlot = null;
let weaponCatalog = [];
let fallbackWeaponCatalog = [];
let editingWeaponSlot = null;
let summonCatalog = [];
let editingSummonSlot = null;
let selectedSupportSummon = null;
let latestDamageResult = null;
let weaponCriticalManuallySelected = false;

deckField.value = JSON.stringify(defaultDeck, null, 2);

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

function createText(className, text) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
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
    updateEquipmentPlusMark(currentEquipment, value);
    writeDeckConfig(config);
    onUpdated(currentEquipment);
    void calculate();
  });
  label.append(input);
  return label;
}

function catalogJob(jobId) {
  return jobCatalog.find((job) => job.jobId === jobId);
}

function createJobLevelField(config, key, label, maximum) {
  const field = document.createElement("label");
  field.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = String(maximum);
  input.step = "1";
  input.placeholder = "—";
  input.value = config.protagonist[key] == null ? "" : String(config.protagonist[key]);
  input.setAttribute("aria-label", `${label}を変更`);
  input.addEventListener("change", () => {
    const value = Number(input.value);
    if (input.value === "") delete config.protagonist[key];
    else if (Number.isInteger(value) && value >= 0 && value <= maximum) config.protagonist[key] = value;
    else return;
    writeDeckConfig(config);
    void calculate();
  });
  field.append(input);
  return field;
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
  const icon = createText("job-symbol", jobId ? "◆" : "+");
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
    const controls = document.createElement("div");
    controls.className = "job-level-controls";
    controls.append(
      createJobLevelField(config, "jobLevel", "Lv", 999),
      createJobLevelField(config, "masterLevel", "ML", 999),
      createJobLevelField(config, "perfectionProofLevel", "極致", 999),
    );
    card.append(controls);
  }
  $("job-editor").replaceChildren(card);
}

function renderJobResults(query = "") {
  const normalizeJobSearch = (value) => value.toLocaleLowerCase("ja").replace(/[\s・･._-]/g, "");
  const normalized = normalizeJobSearch(query.trim());
  const matches = jobCatalog.filter((job) =>
    normalizeJobSearch(
      [job.name, job.nameEn, job.jobId, job.classTier, ...job.weaponKinds.map((weapon) => weapon.name)].join(" "),
    ).includes(normalized),
  );
  const results = $("job-results");
  results.replaceChildren();
  for (const job of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-weapon-card catalog-job-card";
    button.addEventListener("click", () => selectJob(job));
    const icon = createText("catalog-art job-catalog-art", "◆");
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

function openJobPicker() {
  $("job-search").value = "";
  $("remove-job").disabled = !readDeckConfig().protagonist.jobId;
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
  const matches = characterCatalog.filter((character) => {
    const element = elementMeta[character.elementCode]?.name ?? "";
    return normalizeCharacterSearch(
      [character.name, character.nameEn, character.characterId, element, character.rarity].join(" "),
    ).includes(normalized);
  });
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

function openCharacterPicker(slot) {
  editingCharacterSlot = slot;
  $("character-picker-slot-label").textContent = slot <= 3 ? `前衛 ${slot}を変更` : `サブ ${slot - 3}を変更`;
  $("character-search").value = "";
  $("remove-character").disabled = !characterForSlot(readDeckConfig(), slot);
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

  const art = document.createElement("span");
  art.className = `weapon-art ${isJobFallback ? "unknown" : (element?.className ?? "unknown")}`;
  art.append(
    createText("slot-badge", slot === 1 ? "MAIN" : String(slot)),
    createText("rarity-badge", isJobFallback ? "未選択" : master?.rarityCode === "4" ? "SSR" : master?.rarityCode === "3" ? "SR" : master?.rarityCode === "2" ? "R" : "—"),
    createText("weapon-symbol", weapon && !isJobFallback ? (weaponKindSymbols[master?.weaponKindCode] ?? "◆") : "+"),
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
    const stats = createText("weapon-attack", `HP ${weapon.hpOverride == null ? "—" : numberFormat.format(weapon.hpOverride)} / ATK ${weapon.attackOverride == null ? "—" : numberFormat.format(weapon.attackOverride)}`);
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
  const matches = weaponCatalog.filter((weapon) => {
    const searchable = [weapon.name, weapon.weaponId, ...weapon.skills.map((skill) => skill.name)].join(" ").toLocaleLowerCase("ja");
    return searchable.includes(normalized);
  });
  const results = $("weapon-results");
  results.replaceChildren();
  for (const weapon of matches) {
    const element = elementMeta[weapon.elementCode];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-weapon-card";
    button.addEventListener("click", () => selectWeapon(weapon));
    const art = document.createElement("span");
    art.className = `catalog-art ${element?.className ?? "unknown"}`;
    art.append(createText("weapon-symbol", weaponKindSymbols[weapon.weaponKindCode] ?? "◆"));
    const details = document.createElement("span");
    details.className = "catalog-weapon-details";
    details.append(
      createText("catalog-weapon-name", weapon.name),
      createText("catalog-weapon-meta", `${element?.name ?? "属性不明"} ・ ${weapon.rarityCode === "4" ? "SSR" : weapon.rarityCode === "3" ? "SR" : "R"} ・ ${weapon.weaponId}`),
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
  $("catalog-count").textContent = `${matches.length} / ${weaponCatalog.length}件`;
}

function openWeaponPicker(slot) {
  editingWeaponSlot = slot;
  $("picker-slot-label").textContent = slot === 1 ? "メイン武器を変更" : `武器枠 ${slot}を変更`;
  $("weapon-search").value = "";
  const currentWeapon = weaponForSlot(readDeckConfig(), slot);
  $("remove-weapon").disabled = !currentWeapon || currentWeapon.isJobFallback === true;
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
    skillLevel: master.skills.length ? 15 : undefined,
    plusMark: 0,
  });
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
  const art = document.createElement("span");
  art.className = `weapon-art summon-art ${element?.className ?? "unknown"}`;
  art.append(
    createText("slot-badge", position === "main" ? "MAIN" : position === "sub" ? `SUB ${slot}` : String(slot)),
    createText("rarity-badge", master?.rarityCode === "4" ? "SSR" : master?.rarityCode === "3" ? "SR" : master?.rarityCode === "2" ? "R" : "—"),
    createText("weapon-symbol", summon ? "✦" : "+"),
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
    const levelInput = document.createElement("input");
    levelInput.type = "number";
    levelInput.min = "1";
    levelInput.max = "250";
    levelInput.step = "1";
    levelInput.placeholder = "—";
    levelInput.value = summon.level == null ? "" : String(summon.level);
    levelInput.setAttribute("aria-label", `${master?.name ?? summon.summonId}のレベル`);
    levelInput.addEventListener("change", () => {
      const value = Number(levelInput.value);
      if (levelInput.value === "") delete summon.level;
      else if (Number.isInteger(value) && value >= 1 && value <= 250) summon.level = value;
      else return;
      writeDeckConfig(config);
      void calculate();
    });
    levelLabel.append(levelInput);
    const stats = createText("weapon-attack", `HP ${summon.hpOverride == null ? "—" : numberFormat.format(summon.hpOverride)} / ATK ${summon.attackOverride == null ? "—" : numberFormat.format(summon.attackOverride)}`);
    controls.append(
      levelLabel,
      createEquipmentPlusField(
        summon,
        master?.name ?? summon.summonId,
        (currentConfig) => currentConfig.summons.find(
          (currentSummon) => currentSummon.position === position && currentSummon.slot === slot,
        ),
        (currentSummon) => {
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
  const art = document.createElement("span");
  art.className = `weapon-art summon-art ${element?.className ?? "unknown"}`;
  art.append(
    createText("slot-badge", "SUPPORT"),
    createText("rarity-badge", master?.rarityCode === "4" ? "SSR" : master?.rarityCode === "3" ? "SR" : master?.rarityCode === "2" ? "R" : "—"),
    createText("weapon-symbol", master ? "✦" : "+"),
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
  const availableSummons = editingSummonSlot?.kind === "support"
    ? summonCatalog.filter((summon) => summon.supportSelectable)
    : summonCatalog;
  const matches = availableSummons.filter((summon) =>
    [summon.name, summon.summonId, summon.auraName, summon.auraDescription]
      .join(" ")
      .toLocaleLowerCase("ja")
      .includes(normalized),
  );
  const results = $("summon-results");
  results.replaceChildren();
  for (const summon of matches) {
    const element = elementMeta[summon.elementCode];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-weapon-card catalog-summon-card";
    button.addEventListener("click", () => selectSummon(summon));
    const art = document.createElement("span");
    art.className = `catalog-art summon-catalog-art ${element?.className ?? "unknown"}`;
    art.append(createText("weapon-symbol", "✦"));
    const details = document.createElement("span");
    details.className = "catalog-weapon-details";
    details.append(
      createText("catalog-weapon-name", summon.name),
      createText("catalog-weapon-meta", `${element?.name ?? "属性不明"} ・ ${summon.rarityCode === "4" ? "SSR" : summon.rarityCode === "3" ? "SR" : "R"} ・ ${summon.summonId}`),
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

function openSummonPicker(position, slot) {
  editingSummonSlot = { kind: "deck", position, slot };
  $("summon-picker-slot-label").textContent = `${summonSlotLabel(position, slot)}を変更`;
  $("summon-search").value = "";
  $("remove-summon").disabled = !summonForSlot(readDeckConfig(), position, slot);
  renderSummonResults();
  $("summon-picker").showModal();
  $("summon-search").focus();
}

function openSupportSummonPicker() {
  editingSummonSlot = { kind: "support" };
  $("summon-picker-slot-label").textContent = "クエスト開始前に選ぶサポート召喚石を変更";
  $("summon-search").value = "";
  $("remove-summon").disabled = selectedSupportSummon === null;
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
  const config = readDeckConfig();
  config.summons = config.summons.filter((summon) => summon.position !== position || summon.slot !== slot);
  writeDeckConfig(config);
  renderSummonEditor();
  $("summon-picker").close();
  void calculate();
}

function numberValue(id) {
  const value = Number($(id).value);
  return Number.isFinite(value) ? value : 0;
}

function buildRequest() {
  const deckConfig = readDeckConfig();
  applyEquipmentRules(deckConfig);
  writeDeckConfig(deckConfig);
  return {
    schemaVersion: 1,
    deckConfig,
    supportSummon: selectedSupportSummon ?? undefined,
    enemy: {
      name: $("enemy-name").value.trim() || undefined,
      elementCode: $("enemy-element").value,
      defense: numberValue("enemy-defense"),
    },
    modifiers: {
      allElementAttackPercent: numberValue("all-element"),
      elementAttackPercent: numberValue("element-attack"),
      shipAttackPercent: numberValue("ship"),
      furnaceAttackPercent: numberValue("furnace"),
      jobNormalAttackDamagePercent: numberValue("job-damage"),
      damageDealtPercent: numberValue("damage-dealt"),
      targetElementDamagePercent: numberValue("target-damage"),
      accountDoubleAttackRatePercent: numberValue("account-da"),
      accountTripleAttackRatePercent: numberValue("account-ta"),
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
  return {
    normal: {
      ...request,
      enemy: { ...request.enemy, elementCode: attackerElement },
      modifiers: { ...request.modifiers, targetElementDamagePercent: 0 },
    },
    advantage: {
      ...request,
      enemy: { ...request.enemy, elementCode: advantageTarget },
    },
  };
}

const stageNames = {
  "normal-weapon-skill": "通常攻刃",
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
  $("enemy-element").value = request.enemy.elementCode;
  $("enemy-defense").value = String(request.enemy.defense);
  $("enemy-name").value = request.enemy.name || "";
  const modifierFields = {
    allElementAttackPercent: "all-element",
    elementAttackPercent: "element-attack",
    shipAttackPercent: "ship",
    furnaceAttackPercent: "furnace",
    jobNormalAttackDamagePercent: "job-damage",
    damageDealtPercent: "damage-dealt",
    targetElementDamagePercent: "target-damage",
    accountDoubleAttackRatePercent: "account-da",
    accountTripleAttackRatePercent: "account-ta",
  };
  for (const [property, fieldId] of Object.entries(modifierFields)) {
    $(fieldId).value = String(request.modifiers?.[property] ?? 0);
  }
  $("random-min").value = String(request.random?.minimum ?? 0.95);
  $("random-max").value = String(request.random?.maximum ?? 1.05);
  $("random-step").value = String(request.random?.step ?? 0.001);
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
              accountDoubleAttackRatePercent: { type: "number", minimum: 0, maximum: 1000 },
              accountTripleAttackRatePercent: { type: "number", minimum: 0, maximum: 1000 },
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

$("config-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  deckField.value = JSON.stringify(JSON.parse(await file.text()), null, 2);
  renderWeaponEditor();
  void calculate();
});

$("game-deck-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const converted = await postJson("/api/convert-deck", JSON.parse(await file.text()));
    deckField.value = JSON.stringify(converted, null, 2);
    renderWeaponEditor();
    $("deck-state").textContent = "deck.jsonを個人IDを含まない設定へ変換しました";
    $("deck-state").classList.remove("error-text");
    void calculate();
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "変換に失敗しました";
    $("deck-state").classList.add("error-text");
  }
});

$("save-config").addEventListener("click", () => {
  try {
    const content = JSON.stringify(JSON.parse(deckField.value), null, 2);
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    anchor.download = "calculator-deck.v1.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "JSONを保存できませんでした";
    $("deck-state").classList.add("error-text");
  }
});

$("open-battle").addEventListener("click", () => {
  const request = currentTargetRequest(buildRequest());
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
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "編成カタログを読み込めませんでした";
    $("deck-state").classList.add("error-text");
  }
  renderWeaponEditor();
  renderSupportSummonEditor();
  registerWebMcpTool();
  await calculate();
}

void initialize();
