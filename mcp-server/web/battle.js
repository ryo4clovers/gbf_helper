import {
  BATTLE_SETUP_STORAGE_KEY,
  SIMULATION_MODES,
  appendSystemEvent,
  applyAbility,
  applyAttack,
  applyItem,
  applySummon,
  createInitialBattleState,
  resolveAttackCount,
  resolveCritical,
  resolveDamageMultiplier,
  selectPartyMember,
} from "/battle-state.js";

const $ = (id) => document.getElementById(id);
const numberFormat = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const elementMeta = {
  "1": { name: "火", color: "#d84b3e" },
  "2": { name: "水", color: "#267dcc" },
  "3": { name: "土", color: "#9b6a28" },
  "4": { name: "風", color: "#278b5c" },
  "5": { name: "光", color: "#b98b10" },
  "6": { name: "闇", color: "#6b43a9" },
};
const itemDefinitions = {
  cure: { name: "キュアポーション", scope: "single", healPercent: 50, note: "選択中の味方を最大HPの50%回復（暫定）" },
  all: { name: "オールポーション", scope: "all", healPercent: 35, note: "味方全体を最大HPの35%回復（暫定）" },
  elixir: { name: "エリクシール", scope: "all", healPercent: 100, fullHeal: true, fullCharge: true, note: "味方全体を全回復し奥義ゲージを100%にする（暫定）" },
};

function loadSetup() {
  const saved = sessionStorage.getItem(BATTLE_SETUP_STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    schemaVersion: 1,
    enemyMaxHp: 1_000_000,
    request: {
      schemaVersion: 1,
      deckConfig: {
        schemaVersion: 1,
        format: "gbf-helper-calculator-deck",
        protagonist: { elementCode: "1", jobNameHint: "主人公", attackOverride: 1, hpOverride: 1 },
        weapons: [], summons: [], characters: [],
      },
      enemy: { name: "敵", elementCode: "4", defense: 10 },
      modifiers: {},
      random: { minimum: 0.95, maximum: 1.05, step: 0.001 },
    },
  };
}

async function postCalculation(request) {
  const response = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "通常攻撃を計算できませんでした");
  return payload.result;
}

function randomMultiplier(request, mode) {
  const minimum = request.random?.minimum ?? 0.95;
  const maximum = request.random?.maximum ?? 1.05;
  const step = request.random?.step ?? 0.001;
  return resolveDamageMultiplier(mode, minimum, maximum, step);
}

function roundCalculation(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function criticalBodyDamage(result, multiplier) {
  const critical = result.criticalBodyDamage;
  const targetStage = result.baseDamage.stages.find(
    (stage) => stage.stage === "target-element-damage" && stage.totalPercent !== 0,
  );
  const preTargetDamage = targetStage?.inputDamage ?? result.baseDamage.unroundedDamageBeforeRandomAndCap;
  const targetMultiplier = targetStage && targetStage.inputDamage > 0
    ? result.baseDamage.damageBeforeRandomAndCap / targetStage.inputDamage
    : 1;
  const afterCriticalFloor = Math.floor(
    roundCalculation(preTargetDamage * multiplier * critical.criticalDamageMultiplier),
  );
  return Math.floor(roundCalculation(afterCriticalFloor * targetMultiplier));
}

function damagePacketsForHit(result, request, mode, note) {
  const bodyMultiplier = randomMultiplier(request, mode);
  const bodyRounding = result.bodyDamageDistribution.finalRounding;
  const critical = result.criticalBodyDamage;
  const criticalTriggered = critical !== undefined
    && resolveCritical(mode, critical.weaponSkillCriticalRatePercent);
  const bodyRaw = result.baseDamage.unroundedDamageBeforeRandomAndCap * bodyMultiplier;
  const bodyDamage = criticalTriggered
    ? criticalBodyDamage(result, bodyMultiplier)
    : bodyRounding === "ceil" ? Math.ceil(bodyRaw) : Math.floor(bodyRaw);
  const criticalNote = criticalTriggered
    ? `・クリティカル ×${critical.criticalDamageMultiplier}`
    : "";
  const packets = [{
    kind: "damage",
    damage: bodyDamage,
    note: `${note}・乱数 ${bodyMultiplier.toFixed(3)}${criticalNote}`,
  }];
  if (result.pursuitDamage) {
    const pursuitMultiplier = randomMultiplier(request, mode);
    packets.push({
      kind: "pursuit",
      damage: Math.floor(result.pursuitDamage.nominalPursuitDamage * pursuitMultiplier),
      note: `追撃 ${numberFormat.format(result.pursuitDamage.effectivePursuitPercentage)}%・独立乱数 ${pursuitMultiplier.toFixed(3)}`,
    });
  }
  return packets;
}

function damagePackets(result, request, mode, attackCount, note) {
  const packets = [];
  for (let hit = 1; hit <= attackCount; hit += 1) {
    const hitNote = attackCount === 1 ? note : `${note} ${hit}/${attackCount}hit`;
    packets.push(...damagePacketsForHit(result, request, mode, hitNote));
  }
  return packets;
}

const setup = loadSetup();
const initialState = createInitialBattleState(setup);
let state = structuredClone(initialState);
let history = [];
let actionPending = false;
let simulationMode = SIMULATION_MODES.normal;

const modeGuidance = {
  normal: "通常：乱数・クリティカル・連続攻撃を発生率に従って抽選します。",
  downside: "下振れ：最低乱数。100%未満のクリティカルとDA/TAは発動しません。",
  upside: "上振れ：最高乱数。発生率が正のクリティカルとDA/TAは必ず発動します。",
};

function enteredRate(id) {
  const value = Number($(id).value);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

function percent(current, maximum) {
  return maximum <= 0 ? 0 : Math.max(0, Math.min(100, (current / maximum) * 100));
}

function effectList(container, effects) {
  container.replaceChildren();
  if (effects.length === 0) {
    const empty = document.createElement("span");
    empty.className = "effect-chip empty";
    empty.textContent = "なし";
    container.append(empty);
    return;
  }
  for (const effect of effects) {
    const chip = document.createElement("span");
    chip.className = "effect-chip";
    chip.textContent = effect.name ?? String(effect);
    container.append(chip);
  }
}

function commit(nextState) {
  if (nextState === state) return;
  history.push(structuredClone(state));
  state = nextState;
  render();
}

function renderEnemy() {
  const enemy = state.enemy;
  const hpPercent = percent(enemy.hp, enemy.maxHp);
  const element = elementMeta[enemy.elementCode] ?? { name: "不明", color: "#777" };
  $("enemy-name").textContent = enemy.name;
  $("enemy-element").textContent = element.name;
  $("enemy-element").style.background = element.color;
  $("enemy-percent").textContent = `${hpPercent.toFixed(1)}%`;
  $("enemy-hp").textContent = numberFormat.format(enemy.hp);
  $("enemy-max-hp").textContent = numberFormat.format(enemy.maxHp);
  $("enemy-hp-fill").style.width = `${hpPercent}%`;
  $("enemy-hp-fill").parentElement.setAttribute("aria-valuenow", String(Math.round(hpPercent)));
  effectList($("enemy-buffs"), enemy.buffs);
  effectList($("enemy-debuffs"), enemy.debuffs);
}

function renderParty() {
  const list = $("party-list");
  list.replaceChildren();
  for (const member of state.party) {
    const card = document.createElement("article");
    card.className = `party-member ${member.id === state.selectedPartyId ? "selected" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${member.name}を回復対象に選択`);
    const element = elementMeta[member.elementCode] ?? { name: "不明", color: "#777" };
    const hpPercent = percent(member.hp, member.maxHp);
    card.innerHTML = `
      <div class="party-member-header"><div><span class="element-chip" style="background:${element.color};color:white">${element.name}</span><span class="party-member-name"></span></div><strong>${hpPercent.toFixed(1)}%</strong></div>
      <div class="hp-bar party-hp"><span style="width:${hpPercent}%"></span></div>
      <div class="party-values"><span>HP ${numberFormat.format(member.hp)} / ${numberFormat.format(member.maxHp)}</span><span>${member.id === state.selectedPartyId ? "回復対象" : "選択"}</span></div>
      <div class="charge-row"><span>奥義</span><span class="charge-bar"><span style="width:${member.charge}%"></span></span><strong>${member.charge}%</strong></div>
      <div class="ability-row"></div>`;
    card.querySelector(".party-member-name").textContent = member.name;
    card.addEventListener("click", () => { state = selectPartyMember(state, member.id); renderParty(); });
    card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); state = selectPartyMember(state, member.id); renderParty(); } });
    const abilities = card.querySelector(".ability-row");
    for (let number = 1; number <= 4; number += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ability-button";
      button.textContent = `ABILITY ${number}`;
      button.addEventListener("click", (event) => { event.stopPropagation(); commit(applyAbility(state, member.id, number)); });
      abilities.append(button);
    }
    list.append(card);
  }
}

function renderSummons() {
  const container = $("summon-actions");
  container.replaceChildren();
  if (state.summons.length === 0) {
    const empty = document.createElement("span");
    empty.className = "supporting-text";
    empty.textContent = "召喚石が設定されていません";
    container.append(empty);
    return;
  }
  for (const summon of state.summons) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "summon-button";
    button.disabled = summon.used;
    button.textContent = summon.used ? `${summon.name}（使用済み）` : summon.name;
    button.addEventListener("click", () => commit(applySummon(state, summon.id)));
    container.append(button);
  }
}

function renderLog() {
  const log = $("battle-log");
  log.replaceChildren();
  $("event-count").textContent = `${state.events.length} actions`;
  if (state.events.length === 0) {
    const empty = document.createElement("div");
    empty.className = "log-empty";
    empty.textContent = "行動すると、ダメージと回復がここへ時系列で記録されます。";
    log.append(empty);
    return;
  }
  for (const event of state.events) {
    const entry = document.createElement("article");
    entry.className = `log-entry ${event.kind}`;
    const amount = event.amount == null ? "—" : `${event.kind === "heal" ? "+" : "−"}${numberFormat.format(event.amount)}`;
    entry.innerHTML = `<div class="log-topline"><span class="log-turn">TURN ${event.turn}</span><span class="log-amount">${amount}</span></div><div class="log-copy"></div><div class="log-note"></div>`;
    entry.querySelector(".log-copy").textContent = `${event.actor} → ${event.target}`;
    entry.querySelector(".log-note").textContent = event.note ?? "";
    log.append(entry);
  }
}

function render() {
  $("turn-number").textContent = String(state.turn);
  $("undo-action").disabled = history.length === 0 || actionPending;
  $("battle-status").textContent = state.enemy.hp === 0 ? "BATTLE FINISHED" : "BATTLE IN PROGRESS";
  $("attack-ougi-off").disabled = state.enemy.hp === 0 || actionPending;
  $("attack-ougi-on").disabled = state.enemy.hp === 0 || actionPending;
  $("action-guidance").textContent = modeGuidance[simulationMode];
  for (const button of document.querySelectorAll("[data-simulation-mode]")) {
    const selected = button.dataset.simulationMode === simulationMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  renderEnemy();
  renderParty();
  renderSummons();
  renderLog();
}

async function attack(ougiEnabled) {
  if (actionPending || state.enemy.hp === 0) return;
  const protagonist = state.party[0];
  if (ougiEnabled && protagonist.charge >= 100) {
    commit(appendSystemEvent(state, "奥義ダメージ計算は未実装のため、行動を確定していません"));
    return;
  }
  const selectedMode = simulationMode;
  const doubleAttackRate = enteredRate("double-attack-rate");
  const tripleAttackRate = enteredRate("triple-attack-rate");
  actionPending = true;
  render();
  try {
    const result = await postCalculation(setup.request);
    const note = ougiEnabled ? "奥義ゲージ不足のため通常攻撃" : "通常攻撃";
    const attackCount = resolveAttackCount(
      selectedMode,
      doubleAttackRate,
      tripleAttackRate,
    );
    commit(applyAttack(state, damagePackets(result, setup.request, selectedMode, attackCount, note)));
  } catch (error) {
    commit(appendSystemEvent(state, error instanceof Error ? error.message : "攻撃計算に失敗しました"));
  } finally {
    actionPending = false;
    render();
  }
}

$("attack-ougi-off").addEventListener("click", () => void attack(false));
$("attack-ougi-on").addEventListener("click", () => void attack(true));
for (const button of document.querySelectorAll("[data-simulation-mode]")) {
  button.addEventListener("click", () => {
    simulationMode = button.dataset.simulationMode;
    render();
  });
}
for (const input of [$("double-attack-rate"), $("triple-attack-rate")]) {
  input.addEventListener("change", () => { input.value = String(enteredRate(input.id)); });
}
$("undo-action").addEventListener("click", () => {
  const previous = history.pop();
  if (!previous) return;
  state = previous;
  render();
});
$("reset-battle").addEventListener("click", () => {
  state = structuredClone(initialState);
  history = [];
  render();
});
for (const button of document.querySelectorAll("[data-item]")) {
  button.addEventListener("click", () => commit(applyItem(state, itemDefinitions[button.dataset.item])));
}

render();
