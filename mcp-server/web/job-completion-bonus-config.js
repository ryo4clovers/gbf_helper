const effect = (key, label, amount, condition) => ({ key, label, amount, unit: "%", condition });
const bonus = (name, description, effects) => ({ name, description, effects });

const NON_CLASS_V = "non-class-v";

/**
 * Public-Wiki-derived completion bonuses. Values remain provisional until each
 * job is checked in game; names are joined to the server-provided job catalog.
 */
export const JOB_COMPLETION_BONUS_DEFINITIONS = [
  bonus("ファイター・オリジン", "攻撃力+3%、HP+2%", [effect("attack", "攻撃力", 3), effect("hp", "HP", 2)]),
  bonus("ウィザード・オリジン", "攻撃力+2%、アビリティダメージ+3%", [effect("attack", "攻撃力", 2), effect("abilityDamage", "アビリティダメージ", 3)]),
  bonus("ランサー・オリジン", "DA率+3%、TA率+2%", [effect("da", "DA率", 3), effect("ta", "TA率", 2)]),

  bonus("ファイター", "攻撃力+1%", [effect("attack", "攻撃力", 1)]),
  bonus("ナイト", "防御力+1%", [effect("defense", "防御力", 1)]),
  bonus("プリースト", "回復力+1%", [effect("healing", "回復力", 1)]),
  bonus("ウィザード", "アビリティダメージ+3%", [effect("abilityDamage", "アビリティダメージ", 3)]),
  bonus("シーフ", "オーバードライブ抑制+1%", [effect("overdriveSuppression", "OD抑制", 1)]),
  bonus("エンハンサー", "弱体耐性+3%", [effect("debuffResistance", "弱体耐性", 3)]),
  bonus("グラップラー", "HP+1%", [effect("hp", "HP", 1)]),
  bonus("レンジャー", "弱体成功率+1%", [effect("debuffSuccess", "弱体成功率", 1)]),
  bonus("ハーピスト", "防御力+1%", [effect("defense", "防御力", 1)]),
  bonus("ランサー", "HP+1%", [effect("hp", "HP", 1)]),

  bonus("ウォーリア", "攻撃力+2%", [effect("attack", "攻撃力", 2)]),
  bonus("フォートレス", "防御力+2%", [effect("defense", "防御力", 2)]),
  bonus("クレリック", "回復力+2%", [effect("healing", "回復力", 2)]),
  bonus("ソーサラー", "アビリティダメージ+5%", [effect("abilityDamage", "アビリティダメージ", 5)]),
  bonus("レイダー", "オーバードライブ抑制+2%", [effect("overdriveSuppression", "OD抑制", 2)]),
  bonus("アルカナソード", "弱体耐性+5%", [effect("debuffResistance", "弱体耐性", 5)]),
  bonus("クンフー", "HP+2%", [effect("hp", "HP", 2)]),
  bonus("マークスマン", "弱体成功率+2%", [effect("debuffSuccess", "弱体成功率", 2)]),
  bonus("ミンストレル", "防御力+2%", [effect("defense", "防御力", 2)]),
  bonus("ドラグーン", "HP+2%", [effect("hp", "HP", 2)]),

  bonus("ウェポンマスター", "攻撃力+3%", [effect("attack", "攻撃力", 3)]),
  bonus("ホーリーセイバー", "防御力+3%", [effect("defense", "防御力", 3)]),
  bonus("ビショップ", "回復力+3%", [effect("healing", "回復力", 3)]),
  bonus("ハーミット", "アビリティダメージ+7%", [effect("abilityDamage", "アビリティダメージ", 7)]),
  bonus("ホークアイ", "オーバードライブ抑制+3%", [effect("overdriveSuppression", "OD抑制", 3)]),
  bonus("ダークフェンサー", "弱体耐性+7%", [effect("debuffResistance", "弱体耐性", 7)]),
  bonus("オーガ", "HP+3%", [effect("hp", "HP", 3)]),
  bonus("サイドワインダー", "弱体成功率+3%", [effect("debuffSuccess", "弱体成功率", 3)]),
  bonus("スーパースター", "防御力+3%", [effect("defense", "防御力", 3)]),
  bonus("ヴァルキュリア", "HP+3%", [effect("hp", "HP", 3)]),
  bonus("グラディエーター", "DA率+2%", [effect("da", "DA率", 2)]),

  bonus("ベルセルク", "攻撃力+2%、HP+1%", [effect("attack", "攻撃力", 2), effect("hp", "HP", 1)]),
  bonus("スパルタ", "防御力+1%、HP+1%", [effect("defense", "防御力", 1), effect("hp", "HP", 1)]),
  bonus("セージ", "回復力+2%、弱体耐性+1%", [effect("healing", "回復力", 2), effect("debuffResistance", "弱体耐性", 1)]),
  bonus("ウォーロック", "攻撃力+1%、アビリティダメージ+2%", [effect("attack", "攻撃力", 1), effect("abilityDamage", "アビリティダメージ", 2)]),
  bonus("義賊", "攻撃力+1%、オーバードライブ抑制+1%", [effect("attack", "攻撃力", 1), effect("overdriveSuppression", "OD抑制", 1)]),
  bonus("カオスルーダー", "弱体耐性+1%、弱体成功率+1%", [effect("debuffResistance", "弱体耐性", 1), effect("debuffSuccess", "弱体成功率", 1)]),
  bonus("レスラー", "攻撃力+1%、HP+1%", [effect("attack", "攻撃力", 1), effect("hp", "HP", 1)]),
  bonus("ハウンドドッグ", "アビリティダメージ+1%、回避率+1%", [effect("abilityDamage", "アビリティダメージ", 1), effect("dodge", "回避率", 1)]),
  bonus("エリュシオン", "OD中被ダメージ軽減+1%、回復力+1%", [effect("overdriveDamageReduction", "OD中被ダメ軽減", 1), effect("healing", "回復力", 1)]),
  bonus("アプサラス", "オーバードライブ抑制+1%、DA率+1%", [effect("overdriveSuppression", "OD抑制", 1), effect("da", "DA率", 1)]),
  bonus("クリュサオル", "TA率+1%", [effect("ta", "TA率", 1)]),
  bonus("ランバージャック", "メイン武器が斧のときメイン武器攻撃力+3%", [effect("mainWeaponAttackAxe", "斧メイン武器攻撃力", 3, "main-axe")]),
  bonus("キャバルリー", "メイン武器が槍のときメイン武器攻撃力+3%", [effect("mainWeaponAttackSpear", "槍メイン武器攻撃力", 3, "main-spear")]),
  bonus("モンク", "アビリティダメージ上限+3%", [effect("abilityDamageCap", "アビリティダメージ上限", 3)]),
  bonus("ロビンフッド", "メイン武器が弓のときメイン武器攻撃力+3%", [effect("mainWeaponAttackBow", "弓メイン武器攻撃力", 3, "main-bow")]),
  bonus("レリックバスター", "メイン武器が剣のときメイン武器攻撃力+3%", [effect("mainWeaponAttackSword", "剣メイン武器攻撃力", 3, "main-sword")]),
  bonus("ヤマト", "攻撃力+1%、アビリティダメージ上限+2%", [effect("attack", "攻撃力", 1), effect("abilityDamageCap", "アビリティダメージ上限", 2)]),
  bonus("シールドスウォーン", "メイン武器が斧のときメイン武器攻撃力+3%", [effect("mainWeaponAttackAxe", "斧メイン武器攻撃力", 3, "main-axe")]),

  bonus("ヴァイキング", "Class V以外のジョブ時、ダメージ上限+3%", [effect("damageCap", "ダメージ上限", 3, NON_CLASS_V)]),
  bonus("パラディン", "Class V以外のジョブ時、防御力+5%", [effect("defense", "防御力", 5, NON_CLASS_V)]),
  bonus("パナケイア", "Class V以外のジョブ時、回復上限+3%", [effect("healingCap", "回復上限", 3, NON_CLASS_V)]),
  bonus("マナダイバー", "Class V以外のジョブ時、アビリティダメージ+3%", [effect("abilityDamage", "アビリティダメージ", 3, NON_CLASS_V)]),
  bonus("キング", "Class V以外のジョブ時、通常攻撃与ダメージ+3%", [effect("normalAttackDamage", "通常攻撃与ダメージ", 3, NON_CLASS_V)]),
  bonus("陰陽師", "Class V以外のジョブ時、弱体成功率+3%", [effect("debuffSuccess", "弱体成功率", 3, NON_CLASS_V)]),
  bonus("スマヒヒト", "弱体耐性+3%", [effect("debuffResistance", "弱体耐性", 3)]),
  bonus("ブギーマン", "メイン武器が銃のときメイン武器攻撃力+3%", [effect("mainWeaponAttackGun", "銃メイン武器攻撃力", 3, "main-gun")]),
  bonus("マリアッチ", "HP+3%", [effect("hp", "HP", 3)]),

  bonus("アルケミスト", "回復力+5%", [effect("healing", "回復力", 5)]),
  bonus("忍者", "アビリティダメージ+5%", [effect("abilityDamage", "アビリティダメージ", 5)]),
  bonus("侍", "攻撃力+5%", [effect("attack", "攻撃力", 5)]),
  bonus("剣聖", "攻撃力+2%", [effect("attack", "攻撃力", 2)]),
  bonus("ガンスリンガー", "回避率+1%", [effect("dodge", "回避率", 1)]),
  bonus("賢者", "通常攻撃時の奥義ゲージ上昇量+1", [{ key: "normalAttackChargeGain", label: "通常攻撃時奥義ゲージ上昇量", amount: 1, unit: "" }]),
  bonus("アサシン", "DA率+1%", [effect("da", "DA率", 1)]),
  bonus("ドラムマスター", "TA率+1%", [effect("ta", "TA率", 1)]),
  bonus("ダンサー", "回避率+1%", [effect("dodge", "回避率", 1)]),
  bonus("メカニック", "ダメージ上限+1%", [effect("damageCap", "ダメージ上限", 1)]),

  bonus("ドクター", "HP最大時、防御力+3%", [effect("defense", "防御力", 3, "full-hp")]),
  bonus("魔法戦士", "メイン武器が格闘のときメイン武器攻撃力+3%", [effect("mainWeaponAttackMelee", "格闘メイン武器攻撃力", 3, "main-melee")]),
  bonus("剣豪", "メイン武器が刀のときメイン武器攻撃力+3%", [effect("mainWeaponAttackKatana", "刀メイン武器攻撃力", 3, "main-katana")]),
  bonus("ザ・グローリー", "メイン武器が剣のときメイン武器攻撃力+3%", [effect("mainWeaponAttackSword", "剣メイン武器攻撃力", 3, "main-sword")]),
  bonus("ソルジャー", "メイン武器が銃のときメイン武器攻撃力+3%", [effect("mainWeaponAttackGun", "銃メイン武器攻撃力", 3, "main-gun")]),
  bonus("黒猫道士", "メイン武器が杖のときメイン武器攻撃力+3%", [effect("mainWeaponAttackStaff", "杖メイン武器攻撃力", 3, "main-staff")]),
  bonus("トーメンター", "メイン武器が短剣のときメイン武器攻撃力+3%", [effect("mainWeaponAttackDagger", "短剣メイン武器攻撃力", 3, "main-dagger")]),
  bonus("ライジングフォース", "メイン武器が楽器のときメイン武器攻撃力+3%", [effect("mainWeaponAttackHarp", "楽器メイン武器攻撃力", 3, "main-harp")]),
  bonus("マスカレード", "TA率+1%", [effect("ta", "TA率", 1)]),
];

const weaponConditionByCode = {
  "1": "main-sword", "2": "main-dagger", "3": "main-spear", "4": "main-axe", "5": "main-staff",
  "6": "main-gun", "7": "main-melee", "8": "main-bow", "9": "main-harp", "10": "main-katana",
};

export function defaultCompletedJobIds(jobCatalog) {
  const definitionNames = new Set(JOB_COMPLETION_BONUS_DEFINITIONS.map((entry) => entry.name));
  return jobCatalog.filter((job) => definitionNames.has(job.name)).map((job) => job.jobId);
}

export function normalizeCompletedJobIds(value, jobCatalog) {
  if (!Array.isArray(value)) return defaultCompletedJobIds(jobCatalog);
  const knownIds = new Set(jobCatalog.map((job) => job.jobId));
  return [...new Set(value.filter((id) => typeof id === "string" && knownIds.has(id)))];
}

function applies(effectEntry, selectedJob, mainWeaponKindCode) {
  if (effectEntry.condition === NON_CLASS_V) return selectedJob?.classTier !== "ClassV";
  if (effectEntry.condition?.startsWith("main-")) {
    return effectEntry.condition === weaponConditionByCode[mainWeaponKindCode];
  }
  return true;
}

export function calculateJobCompletionBonuses(completedJobIds, jobCatalog, selectedJob, mainWeaponKindCode) {
  const selectedIds = new Set(normalizeCompletedJobIds(completedJobIds, jobCatalog));
  const catalogByName = new Map(jobCatalog.map((job) => [job.name, job]));
  const totals = {};
  const inactiveConditionalEffects = [];
  for (const definition of JOB_COMPLETION_BONUS_DEFINITIONS) {
    const job = catalogByName.get(definition.name);
    if (!job || !selectedIds.has(job.jobId)) continue;
    for (const effectEntry of definition.effects) {
      if (!applies(effectEntry, selectedJob, mainWeaponKindCode)) {
        inactiveConditionalEffects.push({ jobName: definition.name, ...effectEntry });
        continue;
      }
      totals[effectEntry.key] = (totals[effectEntry.key] ?? 0) + effectEntry.amount;
    }
  }
  return { selectedJobIds: [...selectedIds], totals, inactiveConditionalEffects };
}
