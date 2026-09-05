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

deckField.value = JSON.stringify(defaultDeck, null, 2);

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
  void calculate();
});

$("game-deck-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const converted = await postJson("/api/convert-deck", JSON.parse(await file.text()));
    deckField.value = JSON.stringify(converted, null, 2);
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

registerWebMcpTool();
void calculate();
