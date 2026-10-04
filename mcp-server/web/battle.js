import {
  BATTLE_SETUP_STORAGE_KEY,
  battleSetupStatIssues,
  SIMULATION_MODES,
  applyGeneratedTurn,
  applyItem,
  createInitialBattleState,
  resolveCritical,
  resolveDamageMultiplier,
  resolveEnemyAttackDamage,
  selectPartyMember,
} from "/battle-state.js?v=9";
import { buildBattleTurnRequest, automaticAbilityPackets } from "/battle-turn-client.js?v=3";
import { scaleDamageCapThreshold, finalizeNormalAttackHit } from "/normal-attack-rounding.js";

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
  cure: { name: "キュアポーション", scope: "single", healPercent: 50, inventoryKey: "curePotion", note: "選択中の味方を最大HPの50%回復（暫定）" },
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

function bodyDamageForMultiplier(result, multiplier, criticalDamageBonusPercent, {
  pursuitPercent = 100, rawBaseDamage, finalRounding = result.bodyDamageDistribution.finalRounding,
  attenuation = result.bodyDamageAttenuation,
} = {}) {
  const inputDamage = (
    rawBaseDamage ?? (result.guaranteedCriticalBodyDamageDistribution ?? result.bodyDamageDistribution).preparedNominalDamage
    ?? result.baseDamage.articleTrace?.prePostCapDamage
    ?? result.baseDamage.unroundedDamageBeforeRandomAndCap
  ) * multiplier * (1 + criticalDamageBonusPercent / 100);
  let inputStart = 0;
  let attenuatedDamage = 0;
  for (let index = 0; inputStart < inputDamage; index += 1) {
    const line = attenuation.profile.lines[index];
    const inputEnd = Math.min(
      inputDamage,
      line === undefined ? inputDamage : scaleDamageCapThreshold(line.threshold, attenuation.damageCapUpPercent),
    );
    const passRate = index === 0 ? 1 : attenuation.profile.lines[index - 1].passRate;
    attenuatedDamage += (inputEnd - inputStart) * passRate;
    inputStart = inputEnd;
  }
  const supplementalDamage = attenuation.supplementalDamagePerHit ?? result.otherWeaponSkills?.supplementalDamage?.effectiveAmount ?? 0;
  const finalDamage = finalizeNormalAttackHit(attenuatedDamage, pursuitPercent, {
    ...attenuation, randomTargetHitCount: attenuation.randomTargetHitCount ?? 1,
    supplementalDamagePerHit: supplementalDamage,
  });
  return finalRounding === "ceil"
    ? Math.ceil(finalDamage)
    : Math.floor(finalDamage);
}

function damagePacketsForHit(result, request, mode, note, criticalBuff) {
  const bodyMultiplier = randomMultiplier(request, mode);
  const critical = result.criticalBodyDamage;
  const weaponCriticalTriggered = critical !== undefined
    && resolveCritical(mode, critical.effectiveWeaponSkillCriticalRatePercent);
  const limitBonusCriticalSources = result.protagonistLimitBonusCritical?.sources ?? [];
  const triggeredLimitBonusCriticals = limitBonusCriticalSources.filter(
    (source) => resolveCritical(mode, source.triggerRatePercent),
  );
  const weaponBuffCritical = criticalBuff && resolveCritical(mode, criticalBuff.ratePercent) ? criticalBuff.damagePercent : 0;
  const criticalDamageBonusPercent =
    (result.guaranteedCriticalBodyDamageDistribution ? result.protagonistNormalAttackSupport.criticalDamageBonusPercent : 0) +
    (weaponCriticalTriggered ? (critical.criticalDamageMultiplier - 1) * 100 : 0) +
    triggeredLimitBonusCriticals.reduce((sum, source) => sum + source.damageBonusPercent, 0) + (request.enemy.elementCode === "5" ? weaponBuffCritical : 0);
  const criticalTriggered = criticalDamageBonusPercent > 0;
  const bodyDamage = bodyDamageForMultiplier(
    result,
    bodyMultiplier,
    criticalDamageBonusPercent,
  );
  const criticalNote = criticalTriggered
    ? `・クリティカル ×${(1 + criticalDamageBonusPercent / 100).toLocaleString("ja-JP", { maximumFractionDigits: 3 })}`
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
      damage: result.pursuitDamage.stages
        ? bodyDamageForMultiplier(result, pursuitMultiplier, criticalDamageBonusPercent, {
          pursuitPercent: result.pursuitDamage.effectivePursuitPercentage, finalRounding: "floor",
          rawBaseDamage: result.pursuitDamage.damageDistribution.preparedNominalDamage, attenuation: result.pursuitDamage.stages,
        })
        : Math.floor(result.pursuitDamage.nominalPursuitDamage * pursuitMultiplier),
      note: `追撃 ${numberFormat.format(result.pursuitDamage.effectivePursuitPercentage)}%・独立乱数 ${pursuitMultiplier.toFixed(3)}`,
    });
  }
  if (result.abilityPursuitDamage) {
    const pursuit = result.abilityPursuitDamage, multiplier = randomMultiplier(request, mode);
    packets.push({ kind: "pursuit", damage: bodyDamageForMultiplier(result, multiplier, criticalDamageBonusPercent,
      { pursuitPercent: pursuit.effectivePursuitPercentage, rawBaseDamage: pursuit.baseDamage,
        finalRounding: "floor", attenuation: pursuit.stages }), note: "闇属性追撃20%（アビ通常枠）" });
  }
  if (result.destructionPursuitDamage) {
    const pursuit = result.destructionPursuitDamage;
    const multiplier = randomMultiplier(request, mode);
    packets.push({ kind: "pursuit", damage: bodyDamageForMultiplier(result, multiplier,
      pursuit.stages.criticalDamageBonusPercent + weaponBuffCritical, { pursuitPercent: pursuit.effectivePursuitPercentage,
        rawBaseDamage: pursuit.damageDistribution.preparedNominalDamage, finalRounding: "floor", attenuation: pursuit.stages }),
      note: `破壊属性追撃 ${numberFormat.format(pursuit.effectivePursuitPercentage)}%・独立乱数 ${multiplier.toFixed(3)}` });
  }
  return packets;
}

function damagePackets(result, request, mode, attackCount, note, criticalBuff) {
  const packets = [];
  for (let hit = 1; hit <= attackCount; hit += 1) {
    const hitNote = attackCount === 1 ? note : `${note} ${hit}/${attackCount}hit`;
    for (let randomHit = 0; randomHit < (result.bodyDamageAttenuation.randomTargetHitCount ?? 1); randomHit += 1) {
      packets.push(...damagePacketsForHit(result, request, mode,
        (result.bodyDamageAttenuation.randomTargetHitCount ?? 1) > 1 ? `${hitNote}・分割${randomHit + 1}/${result.bodyDamageAttenuation.randomTargetHitCount}` : hitNote, criticalBuff));
    }
  }
  return packets;
}

function enemyAttackFromResult(result, mode) {
  const incoming = result.incomingDamage;
  if (!incoming || incoming.enemyAttack <= 0) return undefined;
  const damage = resolveEnemyAttackDamage(
    mode,
    incoming.minimumDamage,
    incoming.maximumDamage,
  );
  return {
    damage,
    note: `通常攻撃・基礎攻撃力 ${numberFormat.format(incoming.enemyAttack)}・防御 ${numberFormat.format(incoming.defensePercent)}%・属性軽減 ${numberFormat.format(incoming.effectiveElementalDamageReductionPercent)}%`,
  };
}

const setup = loadSetup();
const setupStatIssues = battleSetupStatIssues(setup.request.deckConfig);
if (setup.request.deckConfig.characters.some(c => c.position === "front" && !Number.isSafeInteger(setup.characterMaxHp?.[c.slot]))) {
  setupStatIssues.push("戦闘最大HPが未計算です。編成画面から「戦闘シミュレーション」を開き直してください。");
}
// Single-hit actor selection is not the battle's protagonist.
delete setup.request.attacker;
delete setup.request.battleEffects;
delete setup.request.mythicalLancerLevel;
const initialState = createInitialBattleState(setup);
let state = structuredClone(initialState);
let history = [];
let actionPending = false;
let simulationMode = SIMULATION_MODES.downside;
let calculationPromise = null;
let calculatedMultiattackRates = null;

const modeGuidance = {
  normal: "通常：連撃と通常攻撃のクリティカルを抽選。キャラの実効DA/TA率は追加設定が必要です。",
  downside: "比較シナリオ（下振れ）：最低攻撃乱数・既知の確定連撃を使用。総ダメージの厳密な下限ではありません。",
  upside: "比較シナリオ（上振れ）：最高攻撃乱数・可能な最大連撃を使用。総ダメージの厳密な上限ではありません。",
};

async function getCalculationResult() {
  calculationPromise ??= postCalculation(setup.request).catch((error) => {
    calculationPromise = null;
    throw error;
  });
  return calculationPromise;
}

function acceptCalculatedRates(result) {
  calculatedMultiattackRates = result.multiattackRates;
}

function renderMultiattackRates() {
  const rates = calculatedMultiattackRates;
  if (!rates) {
    $("double-attack-rate").textContent = "計算中";
    $("triple-attack-rate").textContent = "計算中";
    return;
  }
  $("double-attack-rate").textContent = `${numberFormat.format(rates.doubleAttackRatePercent)}%`;
  $("triple-attack-rate").textContent = `${numberFormat.format(rates.tripleAttackRatePercent)}%`;
  const unresolved = rates.issues.includes("job-base-rate-unresolved");
  const characterEffects = rates.issues.includes("character-effects-unresolved");
  $("multiattack-scope").textContent = unresolved
    ? "ジョブ基礎率が未登録のため一部未反映"
    : characterEffects
      ? "ジョブ基礎・コンプリート・育成・武器から自動計算（キャラ効果未反映）"
      : "ジョブ基礎・コンプリート・育成・武器から自動計算";
  const breakdown = rates.contributions
    .map((contribution) => `${contribution.sourceName}: DA ${contribution.doubleAttackRatePercent}% / TA ${contribution.tripleAttackRatePercent}%`)
    .join("\n");
  $("multiattack-scope").title = breakdown;
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

function isIlsa(member) { return ["3040456000", "dark-ssr-ilsa-yukata"].includes(member.id); }

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
    const buffs = [];
    const weaponState = state.actionState?.weaponCharge;
    if (member.slot === 0 && weaponState) {
      if (weaponState.darkAttackStacks) buffs.push("闇攻撃+" + weaponState.darkAttackStacks * 10 + "%");
      if (state.turn < weaponState.criticalExpiresOnTurn) buffs.push("クリティカル（確率30%・倍率50%）");
      if (state.turn < weaponState.tripleAttackExpiresOnTurn) buffs.push("TA確定");
    }
    if (member.shield?.amount > 0 && state.turn < member.shield.expiresOnTurn) buffs.push("バリア " + numberFormat.format(member.shield.amount));
    if (buffs.length) { const label = document.createElement("p"); label.className = "section-note"; label.textContent = buffs.join(" / "); card.append(label); }
    if (member.slot > 0 && !setup.request.deckConfig.characters.find((entry) => entry.slot === member.slot)?.hpOverride) {
      card.querySelector(".party-values span").textContent = "表示HP 未入力";
      card.querySelector(".party-member-header strong").textContent = "—";
      card.querySelector(".hp-bar span").style.width = "0%";
    }
    card.addEventListener("click", () => { state = selectPartyMember(state, member.id); renderParty(); });
    card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); state = selectPartyMember(state, member.id); renderParty(); } });
    const abilities = card.querySelector(".ability-row");
    for (let number = 1; number <= (isIlsa(member) ? 3 : 4); number += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ability-button";
      button.textContent = `ABILITY ${number}`;
      button.disabled = true;
      button.title = "手動アビリティは未対応です。対応済みの自動アビリティは攻撃後に実行します";
      if (isIlsa(member)) {
        const remaining = Math.max(0, (state.actionState?.ilsa?.readyOnTurn[number - 1] ?? 1) - state.turn);
        const names = ["ウォー・エターナル", "ウェイジズ・オブ・シン", "ディヴァ・サタニカ"];
        button.textContent = `${number}アビ${remaining ? `（あと${remaining}T）` : ""}`;
        button.title = names[number - 1];
        button.disabled = setupStatIssues.length > 0 || actionPending || member.hp <= 0 || state.enemy.hp <= 0 || remaining > 0;
        button.addEventListener("click", (event) => { event.stopPropagation(); attack(false,
          { kind: "ilsa-ability", characterSlot: member.slot, ability: number }); });
        button.addEventListener("keydown", (event) => event.stopPropagation());
      }
      abilities.append(button);
    }
    const effects = document.createElement("div"); effects.className = "supporting-text";
    const ilsa = state.actionState?.ilsa;
    effects.textContent = [
      ...(isIlsa(member) ? [`不散花 ${ilsa?.flowers ?? 1} / 確定TA・3分割`,
        ...(ilsa?.multistrikeTurn === state.turn ? [`攻撃行動${ilsa.multistrikeActions}回`] : [])] : []),
      ...(member.elementCode === "6" && state.turn < (ilsa?.warEternalExpiresOnTurn ?? 0)
        ? [`1アビ強化 あと${ilsa.warEternalExpiresOnTurn - state.turn}T`] : []),
    ].join(" ／ ");
    card.append(effects);
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
    button.disabled = true;
    button.title = "召喚効果は未対応です";
    button.textContent = summon.used ? `${summon.name}（使用済み）` : summon.name;
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
  $("battle-status").textContent = setupStatIssues.length ? "編成の入力が必要です" : state.enemy.hp === 0 ? "BATTLE FINISHED" : "BATTLE IN PROGRESS";
  if (setupStatIssues.length) $("battle-error").textContent = setupStatIssues.join("\n");
  $("attack-ougi-off").disabled = setupStatIssues.length > 0 || state.enemy.hp === 0 || actionPending;
  $("attack-ougi-on").disabled = setupStatIssues.length > 0 || actionPending || state.enemy.hp === 0 || !state.party.some((member) => (member.slot === 0 || isIlsa(member)) && member.hp > 0);
  $("reset-battle").disabled = actionPending;
  for (const input of document.querySelectorAll(".battle-settings input, .battle-settings select")) input.disabled = actionPending || state.events.length > 0;
  $("action-guidance").textContent = modeGuidance[simulationMode];
  for (const button of document.querySelectorAll("[data-simulation-mode]")) {
    const selected = button.dataset.simulationMode === simulationMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = setupStatIssues.length > 0 || actionPending;
  }
  renderMultiattackRates();
  renderEnemy();
  renderParty();
  renderSummons();
  renderLog();
  for (const button of document.querySelectorAll("[data-item]")) {
    const item = itemDefinitions[button.dataset.item];
    button.disabled = setupStatIssues.length > 0 || actionPending;
    if (!item.inventoryKey) continue;
    const count = state.items?.[item.inventoryKey] ?? 0;
    button.disabled = setupStatIssues.length > 0 || count <= 0 || actionPending;
    button.querySelector("small").textContent = count > 0
      ? `残り${count}個・選択中の味方を50%回復`
      : "所持していません（ポーションメーカーで追加）";
  }
  if (state.warnings) $("battle-warnings").replaceChildren(...state.warnings.map((text) => {
    const item = document.createElement("li"); item.textContent = text; return item;
  }));
}

async function attack(ougiEnabled, action) {
  if (setupStatIssues.length || actionPending || state.enemy.hp === 0) return;
  const selectedMode = simulationMode;
  actionPending = true;
  $("battle-error").textContent = "";
  render();
  try {
    const request = buildBattleTurnRequest(setup, state, selectedMode, readSettings(), action, ougiEnabled);
    const response = await fetch("/api/simulate-turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
    const generated = await response.json();
    if (!response.ok) throw new Error(generated.error ?? "編成の行動を計算できませんでした");
    const packets = [];
    let protagonistResult = generated.protagonistCalculation;
    for (const event of generated.events) {
      if (event.kind === "normal") {
        if (event.actorPosition === 0) protagonistResult = event.calculation;
        packets.push(...damagePackets(event.calculation, setup.request, selectedMode, event.attackCount, "通常攻撃", event.criticalBuff)
          .map((packet) => ({ ...packet, actorPosition: event.actorPosition })));
      } else if (["automatic-ability", "manual-ability", "charge-attack"].includes(event.kind)) packets.push(...automaticAbilityPackets(event, selectedMode));
      else packets.push(event);
    }
    if (protagonistResult) acceptCalculatedRates(protagonistResult);
    commit(applyGeneratedTurn(state, generated, packets, { enemyAttack: protagonistResult && enemyAttackFromResult(protagonistResult, selectedMode) }));
  } catch (error) {
    $("battle-error").textContent = error instanceof Error ? error.message : "攻撃計算に失敗しました";
  } finally {
    actionPending = false;
    render();
  }
}

function renderSettings() {
  $("enemy-max-hp-setting").value = String(initialState.enemy.maxHp);
  const container = $("actor-settings");
  container.replaceChildren();
  for (const member of state.party.slice(1)) {
    const row = document.createElement("fieldset");
    const legend = document.createElement("legend"); legend.textContent = member.name; row.append(legend);
    for (const [key, label] of (isIlsa(member) ? [] : [["da", "DA率 (%)"], ["ta", "TA率 (%)"]])) {
      const element = document.createElement("label"); element.textContent = label;
      const input = document.createElement("input"); input.type = "number"; input.min = "0"; input.max = "100"; input.step = "any";
      input.placeholder = "未指定"; input.id = `${key}-${member.slot}`; element.append(input); row.append(element);
    }
    const artifactLabel = document.createElement("label"); artifactLabel.textContent = "開始時ランダム強化";
    const select = document.createElement("select"); select.id = `artifact-${member.slot}`;
    for (const [value, label] of [["", "未指定"], ["none", "攻撃・上限ともなし"], ["attack", "攻撃UP"], ["cap", "上限UP"], ["both", "攻撃・上限UP"]]) {
      const option = document.createElement("option"); option.value = value; option.textContent = label; select.append(option);
    }
    artifactLabel.append(select); row.append(artifactLabel); container.append(row);
  }
}

function readSettings() {
  const enemyMaxHp = Number($("enemy-max-hp-setting").value);
  if (!Number.isSafeInteger(enemyMaxHp) || enemyMaxHp < 1) throw new Error("敵最大HPは正の整数で入力してください");
  const characters = {};
  for (const member of state.party.slice(1)) {
    const da = $(`da-${member.slot}`)?.value ?? "", ta = $(`ta-${member.slot}`)?.value ?? "";
    if ((da === "") !== (ta === "")) throw new Error(`${member.name}のDA率・TA率を両方入力してください`);
    const artifact = $(`artifact-${member.slot}`).value;
    characters[member.slot] = {
      ...(da === "" ? {} : { rates: { doubleAttackRatePercent: Number(da), tripleAttackRatePercent: Number(ta) } }),
      ...(artifact === "" ? {} : { artifactStartBuffs: { attackUp: artifact === "attack" || artifact === "both", damageCapUp: artifact === "cap" || artifact === "both" } }),
    };
  }
  return { characters, secondsPerTurn: Number($("seconds-per-turn").value) };
}

$("attack-ougi-off").addEventListener("click", () => void attack(false));
$("attack-ougi-on").addEventListener("click", () => void attack(true));
for (const button of document.querySelectorAll("[data-simulation-mode]")) {
  button.addEventListener("click", () => {
    simulationMode = button.dataset.simulationMode;
    render();
  });
}
$("undo-action").addEventListener("click", () => {
  if (actionPending) return;
  const previous = history.pop();
  if (!previous) return;
  state = previous;
  render();
});
$("reset-battle").addEventListener("click", () => {
  if (actionPending) return;
  state = structuredClone(initialState);
  history = [];
  $("battle-error").textContent = "";
  $("battle-warnings").replaceChildren();
  render();
});
for (const button of document.querySelectorAll("[data-item]")) {
  button.addEventListener("click", () => { if (!actionPending) commit(applyItem(state, itemDefinitions[button.dataset.item])); });
}

renderSettings();
$("enemy-max-hp-setting").addEventListener("input", () => {
  if (actionPending || state.events.length > 0) return;
  const value = Number($("enemy-max-hp-setting").value);
  if (!Number.isSafeInteger(value) || value < 1) { $("battle-error").textContent = "敵最大HPは正の整数で入力してください"; return; }
  initialState.enemy.maxHp = initialState.enemy.hp = value;
  state.enemy.maxHp = state.enemy.hp = value;
  history = [];
  $("battle-error").textContent = "";
  render();
});
render();
void getCalculationResult()
  .then((result) => {
    acceptCalculatedRates(result);
    render();
  })
  .catch((error) => {
    $("multiattack-scope").textContent = error instanceof Error ? error.message : "連続攻撃率を計算できませんでした";
  });
