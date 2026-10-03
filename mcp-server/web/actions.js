import { BATTLE_SETUP_STORAGE_KEY } from "/battle-state.js?v=3";

const $ = (id) => document.getElementById(id);
const actors = [["protagonist", "主人公"], ["cidala", "シンダラ"], ["sariel", "サリエル"]];
let result;
let damageConditions = { enemy: { elementCode: "5", defense: 10, maxHp: 1000000000 }, modifiers: {},
  protagonistCurrentHpPercent: 100, characters: [1, 2, 3].map((characterSlot) => ({ characterSlot, currentHpPercent: 100 })) };
for (const [key, name] of actors) {
  const row = document.createElement("tr");
  const header = document.createElement("th"); header.scope = "row"; header.textContent = name; row.append(header);
  for (const field of ["da", "ta", "opening-da", "opening-ta"]) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.id = `${key}-${field}`; input.type = "number"; input.min = "0"; input.max = "100"; input.step = "any";
    input.setAttribute("aria-label", `${name} ${field.replace("opening-", "開幕 ").toUpperCase()}率`);
    cell.append(input); row.append(cell);
  }
  $("rate-rows").append(row);
}

function status(message, error = false) {
  $("action-status").textContent = message;
  $("action-status").classList.toggle("error", error);
}
try {
  const setup = JSON.parse(sessionStorage.getItem(BATTLE_SETUP_STORAGE_KEY) ?? "null");
  if (setup?.request?.deckConfig) $("deck-json").value = JSON.stringify(setup.request.deckConfig, null, 2);
  if (setup?.request?.enemy) damageConditions = { ...damageConditions, enemy: setup.request.enemy,
    supportSummon: setup.request.supportSummon, modifiers: setup.request.modifiers ?? {} };
} catch { status("保存済みの編成を読み込めませんでした。編成JSONを指定してください。", true); }
$("damage-conditions").value = JSON.stringify(damageConditions, null, 2);

$("deck-file").addEventListener("change", async () => {
  const file = $("deck-file").files[0];
  if (!file) return;
  try {
    if (file.size > 1_048_576) throw new Error("1 MiB以下の編成JSONを選んでください。Network Recorderの生exportは入力対象外です。");
    const value = JSON.parse(await file.text());
    $("deck-json").value = JSON.stringify(value.deckConfig ?? value, null, 2);
    if (value.automaticAbilityConditions) $("damage-conditions").value = JSON.stringify(value.automaticAbilityConditions, null, 2);
    status("編成を読み込みました。条件を確認して生成してください。");
  } catch (error) { status(error.message, true); }
});
$("mode").addEventListener("change", () => {
  if ($("mode").value === "sample") $("rates-details").open = true;
});

function readRates() {
  const anyInput = actors.some(([key]) => ["da", "ta", "opening-da", "opening-ta"].some((field) => $(`${key}-${field}`).value !== ""));
  if (!anyInput && $("mode").value !== "sample") return undefined;
  const rates = {};
  for (const [key, name] of actors) {
    const da = $(`${key}-da`).value, ta = $(`${key}-ta`).value;
    if (da === "" || ta === "") throw new Error(`${name}の実効DA率とTA率を両方入力してください。`);
    rates[key] = { doubleAttackRatePercent: Number(da), tripleAttackRatePercent: Number(ta) };
    const openingDa = $(`${key}-opening-da`).value, openingTa = $(`${key}-opening-ta`).value;
    if (openingDa !== "" || openingTa !== "") {
      if (openingDa === "" || openingTa === "") throw new Error(`${name}の開幕DA率とTA率を両方入力してください。`);
      rates[key].openingFourTurns = { doubleAttackRatePercent: Number(openingDa), tripleAttackRatePercent: Number(openingTa) };
    }
  }
  return rates;
}

function cell(text) { const element = document.createElement("td"); element.textContent = text; return element; }
function render(plan) {
  $("action-result").replaceChildren();
  for (const turn of plan.turns) {
    const details = document.createElement("details"); details.open = turn.turn <= 2;
    const summary = document.createElement("summary");
    summary.textContent = `ターン ${turn.turn} ／ TA ${turn.tripleAttackActions}回 ／ 終了時 神伝Lv${turn.endState.mythicalLancerLevel}`;
    details.append(summary);
    const wrapper = document.createElement("div"); wrapper.className = "actions-table-wrap";
    const table = document.createElement("table");
    const head = document.createElement("thead"), heading = document.createElement("tr");
    for (const title of ["行動", "回数", "直前の状態 / ダメージ / 効果"]) { const th = document.createElement("th"); th.textContent = title; heading.append(th); }
    head.append(heading); table.append(head);
    const body = document.createElement("tbody");
    for (const event of turn.events) {
      const row = document.createElement("tr");
      let count = "—", state = "";
      if (event.kind === "normal") {
        count = `${["", "SA", "DA", "TA"][event.attackCount]}：本体${event.bodyHitCount} + 追撃${event.pursuitHitCount} hit`;
        const effects = event.calculationPatch.battleEffects;
        state = `神伝Lv${event.calculationPatch.mythicalLancerLevel} / 防御DOWN ${effects.enemyDefenseDownPercent}% + 刑死${effects.enemyDefenseDownBeyondCapPercent}% / 敵被ダメ加算${effects.enemySupplementalDamage} / 他化自在${effects.enemyDamageTakenAmplificationPercent}%`;
      } else if (event.kind === "automatic-ability") {
        count = `${event.hitCount} hit`;
        const range = (value) => `${value.minimum.toLocaleString("ja-JP")}〜${value.maximum.toLocaleString("ja-JP")}`;
        state = event.damage ? `下書き：1hit ${range(event.damage.perHit)} ／ 1発動 ${range(event.damage.total)}` : "自動発動・ダメージ量未計算";
      }
      else { state = event.effect === "charge-ready" ? "奥義即時発動可能（奥義OFFを維持）" : `値 ${event.value}`; }
      row.append(cell(event.name), cell(count), cell(state)); body.append(row);
    }
    table.append(body); wrapper.append(table); details.append(wrapper); $("action-result").append(details);
  }
  $("limitations").replaceChildren();
  const damageIssues = plan.turns.flatMap((turn) => turn.events.flatMap((event) => event.damage?.issues ?? []));
  for (const text of new Set([...plan.assumptions, ...plan.unresolved, ...damageIssues, ...plan.deckResolutionIssues.map((issue) => issue.message)])) {
    const item = document.createElement("li"); item.textContent = text; $("limitations").append(item);
  }
  $("result-section").hidden = false;
}

$("action-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("generate").disabled = true; $("download").disabled = true; $("result-section").hidden = true; result = undefined;
  try {
    const value = JSON.parse($("deck-json").value);
    const request = { schemaVersion: 1, deckConfig: value.deckConfig ?? value, turns: Number($("turns").value),
      secondsPerTurn: Number($("seconds").value), chargeAttack: false, manualAbilities: false,
      multiattack: { mode: $("mode").value, seed: Number($("seed").value), rates: readRates() } };
    if ($("calculate-abilities").checked) request.automaticAbilityConditions = JSON.parse($("damage-conditions").value);
    status("行動を生成しています…");
    const response = await fetch("/api/generate-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "行動生成に失敗しました。");
    result = body; render(body); $("download").disabled = false;
    status(`${body.turns.length}ターンを生成しました（下書き）。`);
  } catch (error) { status(error.message, true); }
  finally { $("generate").disabled = false; }
});
$("download").addEventListener("click", () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "generated-battle-actions.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
