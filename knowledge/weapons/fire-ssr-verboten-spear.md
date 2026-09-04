---
id: "fire-ssr-verboten-spear"
name_jp: "禁栄の禍槍"
name_en: "Verboten Spear (Fire)"
weapon_id: "1040220800"
element: "火"
rarity: SSR
weapon_type: "槍"
series: "禁禍武器"
obtain: "マルチバトル(禁禍武器ドロップ)。ドロップ時にランダムなデメリットスキルが付与される"
status: 下書き
last_updated: 2026-09-07
source: "実機の武器詳細レスポンス(ユーザー提供、2026-09-07。Lv1・凸0・退魔Lv1 のドロップ直後個体、デメリット『ターンダメージ Lv5 8% depth2』付き)。英語名・スキル数値は gbf.wiki(2026-09-07 参照)で暫定補完。"
---

# 禁栄の禍槍(Verboten Spear (Fire))
![禁栄の禍槍](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040220800.jpg)

## 概要

火属性の禁禍武器(gbf.wiki『Verboten Weapons』)の槍。第1スキル「神威IV」(EX攻刃+守護)+ 第2スキル「衝刃III」(与ダメージ上昇)の高性能な固定2スキルを持つ代わりに、**ドロップ時にランダムなデメリットスキル**(毎ターンダメージ等)が付く。デメリットは**退魔Lv**を上げることで軽減される(軽減量ランダム、`depth` が深いほど軽減が大きい傾向)。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | 火 |
| 武器種 | 槍 |
| シリーズ | 禁禍武器(gbf.wiki: Verboten Weapons)。`omega` = false |
| 入手方法 | マルチバトル ドロップ |
| 最大レベル | 4凸時 要確認(提供個体は凸0で `max_level` = 40) |
| スキルレベル上限 | 10(`max_weapon_skill_level`。他シリーズより低い) |
| 上限解放段階 | 4(`max_evolution_level` = 4) |
| 編成本数制限 | なし(`limit` = `[]`) |

## ステータス

<!-- 提供個体は Lv1 / evolution 0(ドロップ直後)。ATK420 / HP24 は Lv1 の値。 -->

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 初期 | 1 | 24 | 420 | 実機実測(凸0) |
| 4凸・最大 | 要確認 | 要検証 | 要検証 | |
| 超越 | — | — | — | 非対応 |

## 武器スキル

### スキル1: 終炎禁呪・神威IV

- skill_id: `2801`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: 神威(IV。EX攻刃 + 守護〈最大HP〉、大)。image `skill_god_k_1_4`(`_k_` = 禁禍/禁呪)
- 枠(frame): 攻撃力部分 = EX攻刃枠 / HP部分 = 守護枠(要検証)
- 効果: 火属性キャラの攻撃力と最大HPが上昇(大)
- スキルレベル別の数値: 神威IV(大)スキルLv10 時の攻撃力UP%・最大HP UP% は**要検証**
- 発動条件: 常時(火属性キャラ)
- 出典: 実機レスポンス / gbf.wiki
- ステータス: 未検証

### スキル2: 終炎禁呪・衝刃III

- skill_id: `2807`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: 衝刃(与ダメージ上昇。大)。image `skill_rise_k_1_3`
- 枠(frame): 与ダメージ上昇枠(要検証)
- 効果: 火属性キャラの与ダメージUP(大)
- スキルレベル別の数値: 衝刃III(大)スキルLv10 時の与ダメージUP% は**要検証**
- 発動条件: 常時(火属性キャラ)
- 出典: 実機レスポンス / gbf.wiki
- ステータス: 未検証

<!-- skill3 / skill4 は skill_id が null。 -->

## AUG / デメリットスキル(`augment_skill`)

- 付与状況(この個体): あり(`param.augment_id_list` = "253"、`param.augment_image` = `ex_skill_turn_damage`)
- 効果:
  - **ターンダメージ**(`skill_id` 2881、Lv5、`8%`、depth 2)— 味方全体が毎ターンダメージを受ける = **デメリットスキル**。image `ex_skill_turn_damage` / `icon_img` `bonus_39`
- この「デメリットスキル」はドロップ時にランダム付与され、**退魔Lv(下記)で軽減される**。`depth`(この個体は 2)が深いほど1回の退魔での軽減量が多くなる傾向(ユーザー談、要検証)。
- 通常AUG(エレメント)とは別。禁禍武器は通常AUGを付ける対象ではない可能性が高い(要確認)。

## 退魔(オーディアント)

- 対応: あり(`param.odiant.is_odiant_weapon` = true)
- 退魔Lv(この個体): 1 / 5(`exorcision_level` / `max_exorcision_level`)
- デメリット軽減値(`reduction_effect_value`): 0(退魔Lv1・軽減未反映の状態)
- 退魔Lvを上げるとデメリットスキルの効果量が軽減される。軽減量はランダムで、デメリットスキルの `depth` が深いほど1回あたりの軽減が大きくなる傾向(ユーザー談、要検証)。

## 奥義(チャージアタック)

- 名称: フルニヴァルラ
- 効果: 火属性ダメージ(特大)/灼熱効果/火属性キャラの火属性攻撃UP(累積)
- 数値/スケーリング: 奥義倍率、灼熱の値、火属性攻撃UP(累積)の1回あたりと上限は**要検証**
- 進化段階: `＋` 表記はこの個体には無い(凸0のため)。上限解放で付く可能性(要確認)
- 出典: 実機レスポンス
- ステータス: 未検証

## 上限解放・強化要素

- 上限解放: 4段階(`max_evolution_level` = 4)。
- スキルレベル: 上限10。`can_skillplus` = false。
- 装備制限: なし(`limit` = `[]`)。
- 退魔: 上記「退魔」セクション参照。
- 覚醒 / 超越: 非対応。
- **この武器は売却・餌化・分解が可能**(`can_sell` / `can_decompose` / `can_enhancement_material` = true)。特殊枠武器(終末・破壊等)と違い量産・入れ替え前提。

## 編成での役割

- 使用グリッド: 火属性グリッド(神威 = EX攻刃なので神石・マグナ両対応)。神威IV + 衝刃III の2スキルは強力だがデメリット付き。
- メイン装備時の恩恵: 奥義「フルニヴァルラ」(火ダメージ + 灼熱 + 火属性攻撃UP累積)。
- 使い分け: デメリットの軽さ(退魔で削れた `reduction_effect_value`)と種類で採用可否が変わる。良いデメリット個体を厳選する運用。

## 関連トピック

- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

- 英語名(`Verboten Spear (Fire)` は暫定。gbf.wiki 上は「Demon-〇〇 of 〇〇 Verboten」形式。正式名を要確認)。
- 4凸時の最大Lv・ステータス、初期以外のステータス。
- スキル1「神威IV」スキルLv10 時の攻撃力UP%・最大HP UP%、スキル2「衝刃III」の与ダメージUP%。
- デメリットスキルの抽選プール(ターンダメージ以外: HP上限DOWN / 弱体耐性DOWN / 奥義ゲージ上昇量DOWN 等?)と各効果量。
- 退魔Lv と `reduction_effect_value` の関係、`depth` と軽減量の関係の具体。退魔Lvの上げ方(素材)。
- 禁禍武器に通常AUG(エレメント)を付けられるか。
- 奥義「フルニヴァルラ」の倍率・各効果の値。
- `master.bonus_level` = "40" の意味。
