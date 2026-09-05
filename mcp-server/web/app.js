const defaultDeck = {
  schemaVersion: 1,
  format: "gbf-helper-calculator-deck",
  name: "火属性・攻刃39%検証編成",
  protagonist: { elementCode: "1", attackOverride: 19484, hpOverride: 3851 },
  weapons: [
    { slot: 1, position: "main", weaponId: "1040201400", nameHint: "イフリートハルベルト", skillLevel: 15, attackOverride: 2170, hpOverride: 241 },
    { slot: 2, position: "grid", weaponId: "1040218900", nameHint: "オーバーライド", skillLevel: 15, attackOverride: 3609, hpOverride: 430 },
  ],
  summons: [],
  characters: [],
};

const $ = (id) => document.getElementById(id);
const form = $("calculator-form");
const deckField = $("deck-config");
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
let weaponCatalog = [];
let editingWeaponSlot = null;

deckField.value = JSON.stringify(defaultDeck, null, 2);

function readDeckConfig() {
  return JSON.parse(deckField.value);
}

function writeDeckConfig(config) {
  config.weapons.sort((left, right) => left.slot - right.slot);
  deckField.value = JSON.stringify(config, null, 2);
}

function createText(className, text) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

function catalogWeapon(weaponId) {
  return weaponCatalog.find((weapon) => weapon.weaponId === weaponId);
}

function weaponForSlot(config, slot) {
  if (slot === 1) return config.weapons.find((weapon) => weapon.position === "main");
  return config.weapons.find((weapon) => weapon.position === "grid" && weapon.slot === slot);
}

function createWeaponSlot(config, slot) {
  const weapon = weaponForSlot(config, slot);
  const master = weapon ? catalogWeapon(weapon.weaponId) : undefined;
  const element = master ? elementMeta[master.elementCode] : undefined;
  const article = document.createElement("article");
  article.className = `weapon-slot ${slot === 1 ? "main-slot" : "grid-slot"} ${weapon ? "occupied" : "empty"}`;

  const choice = document.createElement("button");
  choice.type = "button";
  choice.className = "weapon-choice";
  choice.setAttribute("aria-label", `${slot === 1 ? "メイン武器" : `武器${slot}`}を選択`);
  choice.addEventListener("click", () => openWeaponPicker(slot));

  const art = document.createElement("span");
  art.className = `weapon-art ${element?.className ?? "unknown"}`;
  art.append(
    createText("slot-badge", slot === 1 ? "MAIN" : String(slot)),
    createText("rarity-badge", master?.rarityCode === "4" ? "SSR" : master?.rarityCode === "3" ? "SR" : master?.rarityCode === "2" ? "R" : "—"),
    createText("weapon-symbol", master ? (weaponKindSymbols[master.weaponKindCode] ?? "◆") : "+"),
  );
  choice.append(art);

  const info = document.createElement("span");
  info.className = "weapon-slot-info";
  info.append(
    createText("weapon-slot-name", weapon ? (master?.name ?? weapon.nameHint ?? weapon.weaponId) : "武器を選択"),
    createText("weapon-slot-meta", weapon ? `${element?.name ?? "属性不明"}・${master ? "登録済み" : "未登録"}` : slot === 1 ? "メイン武器" : `武器枠 ${slot}`),
  );
  choice.append(info);
  article.append(choice);

  if (weapon) {
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
    const attack = createText("weapon-attack", `ATK ${weapon.attackOverride == null ? "—" : numberFormat.format(weapon.attackOverride)}`);
    controls.append(skillLabel, attack);
    article.append(controls);
  }
  return article;
}

function renderWeaponEditor() {
  try {
    const config = readDeckConfig();
    const mainSlot = $("main-weapon-slot");
    const grid = $("weapon-grid");
    mainSlot.replaceChildren(createWeaponSlot(config, 1));
    grid.replaceChildren(...Array.from({ length: 9 }, (_, index) => createWeaponSlot(config, index + 2)));
    $("weapon-count").textContent = `${config.weapons.length} / 10`;
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
  $("remove-weapon").disabled = !weaponForSlot(readDeckConfig(), slot);
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

function numberValue(id) {
  const value = Number($(id).value);
  return Number.isFinite(value) ? value : 0;
}

function buildRequest() {
  return {
    schemaVersion: 1,
    deckConfig: JSON.parse(deckField.value),
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

const stageNames = {
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
};

function render(response) {
  const result = response.result;
  const body = result.bodyDamageDistribution;
  const pursuit = result.pursuitDamage?.damageDistribution;
  const total = result.totalDamageDistribution;

  $("total-expected").textContent = formatDamage(total.expectedDamage);
  $("total-min").textContent = `最小 ${formatDamage(total.minimumDamage)}`;
  $("total-max").textContent = `最大 ${formatDamage(total.maximumDamage)}`;
  $("body-expected").textContent = formatDamage(body.expectedDamage);
  $("body-range").textContent = `${formatDamage(body.minimumDamage)} — ${formatDamage(body.maximumDamage)}`;
  $("pursuit-label").textContent = result.pursuitDamage
    ? `追撃 ${numberFormat.format(result.pursuitDamage.effectivePursuitPercentage)}%`
    : "追撃なし";
  $("pursuit-expected").textContent = pursuit ? formatDamage(pursuit.expectedDamage) : "0";
  $("pursuit-range").textContent = pursuit
    ? `${formatDamage(pursuit.minimumDamage)} — ${formatDamage(pursuit.maximumDamage)}`
    : "—";
  $("pattern-count").textContent = `${numberFormat.format(total.combinationCount)} patterns`;

  const rows = [
    { name: "通常攻刃", multiplier: result.attackPower.normalAttackMultiplier, output: result.attackPower.normalSkillAdjustedAttack },
    ...result.baseDamage.stages.map((stage) => ({
      name: stageNames[stage.stage] || stage.stage,
      multiplier: stage.multiplier,
      output: stage.outputDamage,
    })),
    { name: `敵防御 ÷ ${numberFormat.format(result.baseDamage.enemyDefense)}`, multiplier: 1 / result.baseDamage.enemyDefense, output: result.baseDamage.damageBeforeRandomAndCap },
  ];
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
  renderWeaponEditor();
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
        const response = await postJson("/api/calculate", input);
        applyRequestToForm(input);
        render(response);
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
    render(await postJson("/api/calculate", buildRequest()));
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

$("visual-tab").addEventListener("click", () => setEditorMode("visual"));
$("json-tab").addEventListener("click", () => setEditorMode("json"));
$("close-picker").addEventListener("click", () => $("weapon-picker").close());
$("remove-weapon").addEventListener("click", removeSelectedWeapon);
$("weapon-search").addEventListener("input", (event) => renderWeaponResults(event.target.value));
$("weapon-picker").addEventListener("click", (event) => {
  if (event.target === $("weapon-picker")) $("weapon-picker").close();
});

async function initialize() {
  try {
    const response = await fetch("/api/catalog/weapons");
    if (!response.ok) throw new Error("武器カタログを読み込めませんでした");
    weaponCatalog = (await response.json()).weapons;
  } catch (error) {
    $("deck-state").textContent = error instanceof Error ? error.message : "武器カタログを読み込めませんでした";
    $("deck-state").classList.add("error-text");
  }
  renderWeaponEditor();
  registerWebMcpTool();
  await calculate();
}

void initialize();
