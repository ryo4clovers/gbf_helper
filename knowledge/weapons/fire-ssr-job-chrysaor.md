---
id: "fire-ssr-job-chrysaor"
name_jp: "ヴァッサーシュパイアー"
name_en: "Wasserspeier"
weapon_id: "1040018100"
element: "火"
rarity: SSR
weapon_type: "剣"
series: "英雄武器"
obtain: "ジョブ「クリュサオル」の英雄武器。ショップ「ヒヒイロカネ」等のジョブ武器解放 → 属性選択 → ジョブトレジャーで上限解放・強化"
status: 下書き
last_updated: 2026-09-08
source: "実機の武器詳細レスポンス(ユーザー提供、2026-09-08。火属性・Lv200・5凸・エンブレム未適用の個体)。英語名・スキル数値は gbf.wiki『Wasserspeier』/『Class Champion Weapons』(2026-09-08 参照)で補完。数値は未検証。"
---

# ヴァッサーシュパイアー(Wasserspeier)
![ヴァッサーシュパイアー](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040018100.jpg)

## 概要

ClassIV ジョブ「[クリュサオル](../jobs/class4-chrysaor.md)」専用の英雄武器(gbf.wiki『Class Champion Weapons』)。クリュサオル自身が**コンパニオンウェポン**として運用し(装備画面左上枠)、メイン装備時にジョブアビリティ「アナザーブレードII」の性能を強化する。`unique_weapon` の「クリュサオル」がこの武器の真の姿(コンパニオンウェポン形態)。作成時に属性を選択する。第2スキルは**エンブレム(資質)枠**で、適用するエンブレムにより効果が変わる(この個体は未適用)。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | 火(作成時選択。属性ごとに別 `weapon_id` の可能性あり、要検証) |
| 武器種 | 剣(`kind` = 1。gbf.wiki 表記は Sabre) |
| シリーズ | 英雄武器(`series_id` = 19、`series_name` = "[英雄武器]"。gbf.wiki: Class Champion Weapons) |
| 入手方法 | ジョブ武器解放 → 属性選択 → ジョブトレジャーで強化 |
| 最大レベル | 200(5凸。`max_evolution_level` = 5、提供個体 `param.level` = 200 / `evolution` = 5) |
| スキルレベル上限 | **1(固定。`max_weapon_skill_level` = 1)** — スキルレベリング不可。強化は上限解放・エンブレム・ジョブ育成による |
| 上限解放段階 | 5 |
| 編成本数制限 | なし(`limit` = `[]`)。主人公メイン専用のため実質1本 |
| 売却・分解 | 不可(`can_sell` / `can_decompose` / `can_enhancement_material` = false)。`container.name` = "ジョブ武器" |

## ステータス

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 最終上限解放・最大 | 200 | 275 | 3218 | 実機実測(`param.hp` / `param.attack`、+0、evolution 5) |
| 初期 / 各凸段階 | 要検証 | 要検証 | 要検証 | |
| 超越 | — | — | — | 非対応 |

## 武器スキル

<!-- 全スキル image `skill_job_weapon`。スキルレベルは固定(max 1)。
     skill1_display / skill2_display = 0 だが skill_id は非 null(表示フラグは当てにならない)。 -->

### スキル1: 双剣の賦性(Dual Blade's Nature)

- skill_id: `1276`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: ジョブアビリティ強化 + 主人公バフ。「アナザーブレードII」の性能UP
- 効果(実機 comment): 「アナザーブレードIIの性能UP ◆メイン装備時/主人公のみ」
- スキルレベル別の数値: gbf.wiki では「奥義ダメージ+20% / 奥義ダメージ上限+10%、強化段階最大で +30% / +15% + 奥義ゲージ+30%」とされる(**要検証**。ゲーム内はスキルLv固定のため、この段階差は上限解放/エンブレム由来と思われる)
- 発動条件: メイン装備時 / 主人公のみ
- 枠(frame): 奥義ダメージ / 奥義ダメージ上限(要検証)
- 出典: 実機レスポンス / gbf.wiki
- ステータス: 未検証

### スキル2: 双剣の資質(エンブレム枠 / Dual Blade's ―)

- skill_id: `1275`
- 解放レベル: 武器Lv1
- 選択式: **はい(エンブレム枠)**。「様々な力に発展する資質。エンブレムによって力を得る。」(実機 comment、image `skill_blank` = 未適用状態)
- この個体: **エンブレム未適用**
- エンブレム候補(gbf.wiki / GameWith):
  - 推奨は「魔獄」= 自分の奥義に追加ダメージ
  - 他に「発展形」により与ダメージ上昇 / スキル型(スキルダメージ倍率・上限UP + 敵最大HP依存の追加ダメージ)/ 連撃型(ダブルストライク + 固定与ダメージ)等(**各効果量・正式名称は要検証**)
- 出典: 実機レスポンス / gbf.wiki
- ステータス: 未検証

<!-- skill3 / skill4 は skill_id が null。 -->

## ジョブ専用武器(英雄武器 / コンパニオンウェポン)

- 対応: あり(`job_weapon` = true)
- 対象ジョブ: クリュサオル(`job_weapon_category` = ["104"]。ジョブ側 `job_id` は 300301 → [class4-chrysaor.md](../jobs/class4-chrysaor.md))
- 真の姿 / 特殊形態: コンパニオンウェポン「クリュサオル」(`unique_weapon` = `[{ name: "クリュサオル", image: "300301_sw_1_01" }]`)
- 属性選択: 作成時に選択(`master.attribute` = "1" = 火)。`master.change_attribute` = "" のため作成後の属性変更は不可の可能性(要検証)
- エンブレム(`skill2` = 資質枠): 未適用。推奨「魔獄」(奥義追加ダメージ)
- ジョブ側との連動: skill1 が「アナザーブレードII」を強化。クリュサオルはコンパニオンウェポン装備時のみ本領を発揮するジョブで、この武器がその中核

## 奥義(チャージアタック)

- 名称: 金碧輝煌(Dazzling Radiance)
- 効果(実機 comment): 火属性ダメージ(特大)/自分の攻撃UP(累積)/連続攻撃確率UP(累積)
- 数値/スケーリング: gbf.wiki では「攻撃+10%(累積 / 最大50%)、DA UP、TA UP(いずれも累積・永続)」(**要検証**)
- 進化段階: この個体の `special_skill.name` は `＋` 表記なし(名称のみ)。上限解放での進化有無は要確認
- 出典: 実機レスポンス / gbf.wiki
- ステータス: 未検証

## 上限解放・強化要素

- 上限解放: 5段階(`max_evolution_level` = 5)。`release_max_evolution_level` = 2 の意味は要検証。
- スキルレベル: 固定(上限1)。`can_skillplus` = true だが `param.skill_level` = "1" で頭打ち(意味は要検証)。
- 装備制限: なし(`limit` = `[]`)。ただし主人公メイン専用。
- 覚醒 / 超越 / オーディアント: 非対応(`arousal.is_arousal_weapon` = false、`odiant.is_odiant_weapon` = false)。ClassV の英雄武器と違い覚醒枠は持たない。
- `is_group` = "10"(武器グルーピングID、意味は要検証。ジョブ `domain` と同値かは未確認)。

## 編成での役割

- 使用グリッド: グリッド外(主人公のメイン武器)。クリュサオルをメインジョブにする時のコア装備。
- メイン装備時の恩恵: 奥義「金碧輝煌」+ アナザーブレードII 強化 + エンブレム効果。
- 使い分け: クリュサオル運用ではほぼ必須。属性はパーティ属性に合わせて作成。

## 関連トピック

- [class4-chrysaor.md](../jobs/class4-chrysaor.md)
- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

- 属性ごとに `weapon_id` が分かれるのか(この個体は火 = 1040018100)。`change_attribute` = "" だが後から属性変更可能か。
- 各スキル・奥義の正確な数値。スキルLv固定なのに gbf.wiki が「強化段階最大で」と書く根拠(上限解放段階 or エンブレムLv)。
- 第2スキル「資質」のエンブレム全種類と各効果量、正式名称。
- 初期・各凸段階のステータス。
- `release_max_evolution_level` = 2、`is_group` = "10"、`master.bonus_level` = "40" の意味。
- gbf.wiki の英語表記(武器名 Wasserspeier、スキル名 Dual Blade's Nature 等)の最終確認。
