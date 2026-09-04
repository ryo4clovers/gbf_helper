---
id: "water-ssr-dark-opus-cane-magna"
name_jp: "永遠拒絶の杖"
name_en: "Dark Opus Cane (Magna)"
weapon_id: "1040415100"
element: 水
rarity: SSR
weapon_type: "杖"
series: "終末の神器(方陣攻刃)"
obtain: "ショップ(ヒヒイロカネ / 銀天の輝き等のトレジャー交換で作成)。第2・第3スキルはゴーフ・キーで選択"
status: 下書き
last_updated: 2026-09-08
source: "実機の武器詳細レスポンス(ユーザー提供、2026-09-08。Lv250・超越6段階・phase5・+0、第2/第3スキルは取得個体の選択内容)。数値・英語名は gbf.wiki『Dark Opus Weapons』(2026-09-08 参照)で補完。数値は未検証。"
---

# 永遠拒絶の杖(Dark Opus Cane (Magna))
![永遠拒絶の杖](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040415100.jpg)

## 概要

水属性の終末の神器(gbf.wiki『Dark Opus Weapons』)。第1スキルの攻刃が**方陣攻刃系**(マグナグリッド向け、image に `_m_`)。同じ杖の通常版は [water-ssr-dark-opus-cane-normal.md](water-ssr-dark-opus-cane-normal.md)。第2スキル(α/β/γ/Δ リベレイション)・第3スキル(渾身/背水/技巧/連撃/神水の極技・極破 等)はゴーフ・キーで**選択式**で、レスポンスには現在の選択のみ出る。超越Lv250。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | 水 |
| 武器種 | 杖 |
| シリーズ | 終末の神器(`series_id` = 3)。方陣攻刃版(永遠拒絶シリーズ) |
| 入手方法 | ショップ(トレジャー交換で作成・上限解放) |
| 最大レベル | 250(超越。Lv150→200→250) |
| スキルレベル上限 | 第1・第2 = 25(`max_weapon_skill_level`)/ 第3 = 15(`max_weapon_skill_level_2`) |
| 上限解放段階 | 6(`max_evolution_level` = 6、超越込み) |
| 編成本数制限 | 終末の神器は編成に1本まで(`limit.display_comment`: 「[終末の神器]と[ドラゴニックウェポン]の武器は、いずれかひとつだけ装備が可能です。」。ただし終末とドラゴニックは**相互排他ではない** — [team-building-basics.md](../mechanics/team-building-basics.md)) |

## ステータス

<!-- 提供個体は Lv250 / 超越phase5。途中段階は要検証。 -->

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 3凸・最大 | 150 | 要検証 | 要検証 | |
| 超越・最大 | 250 | 482 | 3605 | 実機実測(+0、evolution 6 / phase 5) |

## 武器スキル

### スキル1: 海神方陣・神醒III

- skill_id: `2199`
- 解放レベル: 武器Lv230
- 選択式: いいえ(固定)
- 系統/カテゴリ: 神醒(神醒III)。方陣攻刃 + 最大HP + 与ダメージUP の複合(image `skill_atk_hp_rise_m_2_3` の `_m_`)
- 枠(frame): 方陣攻刃枠 + HP + 与ダメージ上昇枠(複合、要検証)
- 効果(実機 comment): 水属性キャラの攻撃力と最大HPが上昇(大)/与ダメージUP(大)
- スキルレベル別の数値: 神醒III(大)スキルLv25 時の各%は**要検証**
- 発動条件: 常時(水属性キャラ)。武器Lv230(超越)で解放
- image: `skill_atk_hp_rise_m_2_3`
- 出典: 実機レスポンス
- ステータス: 未検証

### スキル2: アルファ・リベレイション・ルベルII

- skill_id: `2208`
- 解放レベル: 武器Lv1
- 選択式: はい(ゴーフ・キー)。この個体は「アルファ・リベレイション・ルベルII」(α = 通常攻撃ダメージ上限 + 連撃)
- 系統/カテゴリ: リベレイション(ダメージ上限系)。image `skill_normal_limit_3`
- 枠(frame): 各ダメージ上限枠(要検証)
- 効果(実機 comment): 通常攻撃のダメージ上限上昇/連続攻撃確率上昇
- スキルレベル別の数値: 要検証
- 発動条件: 常時
- image: `skill_normal_limit_3`
- 出典: 実機レスポンス
- ステータス: 未検証

### スキル3: 虚偽と詐術

- skill_id: `1726`
- 解放レベル: 武器Lv1
- 選択式: はい(ゴーフ・キー)。この個体は「虚偽と詐術」
- 系統/カテゴリ: 追撃(自属性追撃 + 奥義ゲージ上昇量DOWN のデメリット付き)。image `skill_job_weapon`
- 枠(frame): 要検証
- 効果(実機 comment): 自属性追撃効果/奥義ゲージ上昇量大幅DOWN
- スキルレベル別の数値: 要検証
- 発動条件: 常時
- image: `skill_job_weapon`
- 出典: 実機レスポンス
- ステータス: 未検証

<!-- 第2・第3スキルはゴーフ・キーで別のキーに変更可能。上の内容は取得個体の現在の選択。 -->

## 奥義(チャージアタック)

- 名称: アポカリプス・アーク・グレイシア＋
- 効果(実機 comment): 水属性ダメージ(極大)/味方全体に玉水の刻印を付与/攻防UP(累積)/スキルに応じた追加効果
- 「スキルに応じた追加効果」= 第2スキル(リベレイション)の選択で奥義の追加効果が変わる
- 数値/スケーリング: 奥義倍率、刻印・攻防UP(累積)の値は**要検証**
- 進化段階: `＋`(超越で付与)
- 出典: 実機レスポンス
- ステータス: 未検証

## 超越(トランセンデンス)

- 対応: あり。最大Lv250(`param.level` = 250 / `param.phase` = 5 / `max_evolution_level` = 6)
- 段階: Lv200 で第1スキル(神醒)が強化・解放(`release_level` = 230)。Lv200→250 の超越5段階で各スキルの数値強化・奥義に`＋`
- `can_release_transcendence` = false(この個体は超越済み・上限)
- `param.image_id` = `1040415100_03`(超越後の接尾辞)

## 上限解放・強化要素

- 上限解放: 6段階(超越込み)。
- スキルレベル: 第1・第2 = 25、第3 = 15。
- **装備制限**: 終末の神器は編成に1本まで([team-building-basics.md](../mechanics/team-building-basics.md))。
- 覚醒 / オーディアント: 非対応。`augment_skill` は空。

## 編成での役割

- 使用グリッド: 水マグナグリッドの主力枠。神醒(攻刃+HP+与ダメ)+ 選択スキルで火力と上限を両立。
- メイン装備時の恩恵: 奥義「アポカリプス・アーク・グレイシア＋」(刻印付与 + 攻防UP累積)。
- 使い分け: 第2・第3スキルのゴーフ・キーをコンテンツに合わせて変更。

## 関連トピック

- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

- スキル倍率・スキルLv別の数値(神醒III、リベレイション、第3スキル)。
- ゴーフ・キーの全選択肢一覧と各効果量。
- 途中の上限解放/超越段階のステータス。
- 奥義「アポカリプス・アーク・グレイシア＋」の倍率、刻印効果、攻防UP(累積)の上限。
- 各スキルの正確な枠(frame)。
- `master.bonus_level` = "40" の意味。
