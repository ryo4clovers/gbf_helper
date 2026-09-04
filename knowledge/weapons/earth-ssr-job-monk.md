---
id: "earth-ssr-job-monk"
name_jp: "金砕棒"
name_en: "Kanabo"
weapon_id: "1040417400"
element: "土"
rarity: SSR
weapon_type: "杖"
series: "英雄武器"
obtain: "ジョブ「モンク」の英雄武器。ジョブ武器解放 → 属性選択 → ジョブトレジャーで上限解放・強化"
status: 下書き
last_updated: 2026-09-08
source: "実機の武器詳細レスポンス(ユーザー提供、2026-09-08。土属性・Lv200・5凸の個体)。英語名は gbf.wiki『Kanabo (Earth)』/『Class Champion Weapons』(2026-09-08 参照)。数値は未検証。"
---

# 金砕棒(Kanabo)
![金砕棒](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040417400.jpg)

## 概要

ClassIV ジョブ「[モンク](../jobs/class4-monk.md)」専用の英雄武器(gbf.wiki『Class Champion Weapons』)。杖。第1・第2スキルともにモンクのジョブアビリティ(「修験の構え」「武芸百般」)を強化する**固定スキル**で、[ヴァッサーシュパイアー](fire-ssr-job-chrysaor.md)のようなエンブレム(資質)変更枠は持たない。作成時に属性を選択する。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | 土(作成時選択。`master.change_attribute` = "" のため作成後変更不可の可能性、要検証) |
| 武器種 | 杖(`kind` = 5) |
| シリーズ | 英雄武器(`series_id` = 19。gbf.wiki: Class Champion Weapons) |
| 入手方法 | ジョブ武器解放 → 属性選択 → ジョブトレジャーで強化 |
| 最大レベル | 200(5凸。`max_evolution_level` = 5、提供個体 `param.level` = 200 / `evolution` = 5) |
| スキルレベル上限 | 1(固定。`max_weapon_skill_level` = 1) |
| 上限解放段階 | 5 |
| 編成本数制限 | なし(`limit` = `[]`)。主人公メイン専用 |
| 売却・分解 | 不可(`can_sell` / `can_decompose` = false) |

## ステータス

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 最終上限解放・最大 | 200 | 348 | 2872 | 実機実測(+0、evolution 5) |
| 初期 / 各凸段階 | 要検証 | 要検証 | 要検証 | |
| 超越 | — | — | — | 非対応 |

## 武器スキル

<!-- 両スキル image `skill_job_weapon`、固定、スキルLv固定。skill1/2_display = 0 だが skill_id は非 null。 -->

### スキル1: 修めし僧兵の賦性

- skill_id: `1557`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 効果(実機 comment): 「修験の構えの性能UP ◆メイン装備時」
- 系統/カテゴリ: ジョブアビリティ「修験の構え」の性能強化
- 発動条件: メイン装備時
- スキルレベル別の数値: 要検証
- 出典: 実機レスポンス
- ステータス: 未検証

### スキル2: 修めし僧兵の極み

- skill_id: `1558`
- 解放レベル: 武器Lv1
- 選択式: **いいえ(固定)** — Chrysaor の資質枠と違い変更不可
- 効果(実機 comment): 「武芸百般のダメージ回数UP ◆メイン装備時」
- 系統/カテゴリ: ジョブアビリティ「武芸百般」のダメージ回数増加
- 発動条件: メイン装備時
- スキルレベル別の数値: 要検証
- 出典: 実機レスポンス
- ステータス: 未検証

<!-- skill3 / skill4 は skill_id が null。 -->

## ジョブ専用武器(英雄武器)

- 対応: あり(`job_weapon` = true)
- 対象ジョブ: モンク(`job_weapon_category` = `[]` 空。`unique_weapon[].image` の接頭 `430301` がジョブ `job_id` → [class4-monk.md](../jobs/class4-monk.md))
- 真の姿 / 特殊形態: 「モンク」(`unique_weapon` = `[{ name: "モンク", image: "430301_me_1_01" }]`)
- 属性選択: 作成時に選択(`master.attribute` = "3" = 土)。`master.change_attribute` = "" のため作成後変更は不可の可能性(要検証)
- 変更枠: **なし**(第1・第2スキルとも固定)。「英雄武器 = 第2スキル変更可」ではない一例
- ジョブ側との連動: skill1/2 がモンクの「修験の構え」「武芸百般」を強化

## 奥義(チャージアタック)

- 名称: 涓滴岩穿(けんてきがんせん)
- 効果(実機 comment): 土属性ダメージ(特大)/4回自属性追加ダメージ
- 数値/スケーリング: 奥義倍率、追加ダメージ1回あたりは**要検証**
- 進化段階: この個体は `＋` 表記なし(名称のみ)。上限解放での進化有無は要確認
- 出典: 実機レスポンス
- ステータス: 未検証

## 上限解放・強化要素

- 上限解放: 5段階(`max_evolution_level` = 5)。
- スキルレベル: 固定(上限1)。`can_skillplus` = false。
- 装備制限: なし(`limit` = `[]`)。主人公メイン専用。
- 覚醒 / 超越 / オーディアント: 非対応(`arousal.is_arousal_weapon` = false)。ClassV 英雄武器と違い覚醒枠なし。
- `is_group` = "10"(意味は要検証)。

## 編成での役割

- 使用グリッド: グリッド外(主人公メイン武器)。モンクをメインジョブにする時のコア装備。
- メイン装備時の恩恵: 奥義「涓滴岩穿」+ 「修験の構え」「武芸百般」の強化。
- 使い分け: モンク運用ではほぼ必須。属性はパーティ属性に合わせて作成。

## 関連トピック

- [class4-monk.md](../jobs/class4-monk.md)
- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

- 属性ごとに `weapon_id` が分かれるのか(この個体は土 = 1040417400)。`change_attribute` = "" で属性変更不可か。
- スキル1「修験の構えの性能UP」の具体的な数値、スキル2「武芸百般のダメージ回数UP」の増加回数。
- 奥義「涓滴岩穿」の倍率・追加ダメージ値。
- 初期・各凸段階のステータス。
- `release_max_evolution_level` = 2、`is_group` = "10"、`master.bonus_level` = "40" の意味。
- gbf.wiki の英語表記(武器名は Kanabo (Earth) 等の属性別ページ)。
