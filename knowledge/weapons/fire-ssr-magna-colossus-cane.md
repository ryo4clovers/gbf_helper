---
id: "fire-ssr-magna-colossus-cane"
name_jp: "コロッサスケーン・マグナ"
name_en: "Colossus Cane Omega"
weapon_id: "1040401500"
element: "火"
rarity: SSR
weapon_type: "杖"
series: "マグナシリーズ"
obtain: "マルチバトル「コロッサス・マグナ」ドロップ / 討伐章交換"
status: 下書き
last_updated: 2026-09-07
source: "実機の武器詳細レスポンス(ユーザー提供、2026-09-07。AUG『奥義ダメージ+7%/渾身+3』付与済み個体)。系列情報・スキル数値は gbf.wiki『Weapon Lists/Omega』/ GameWith(2026-09-07 参照)。数値は未検証。"
---

# コロッサスケーン・マグナ(Colossus Cane Omega)
![コロッサスケーン・マグナ](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040401500.jpg)

## 概要

火属性のマグナシリーズ(gbf.wiki『Omega Weapons』)の杖。コロッサス・マグナ討伐でドロップ。スキルは方陣攻刃III のみのシンプルな構成で、火マグナグリッドの攻刃本数として複数積む。ドロップ時にExスキルが付くことがあり(この個体は無し)、エレメント素材でAUGを付与できる。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | 火 |
| 武器種 | 杖 |
| シリーズ | マグナシリーズ(gbf.wiki: Omega Weapons)。`omega` フラグ = **false**(オメガウェポン〈Ultima〉とは別) |
| 入手方法 | マルチ「コロッサス・マグナ」ドロップ / 討伐章交換 |
| 最大レベル | 200(5凸。Lv150→200 のマグナ上限解放) |
| スキルレベル上限 | 20(`max_weapon_skill_level`) |
| 上限解放段階 | 5(`max_evolution_level` = 5) |
| 編成本数制限 | なし(`limit` = `[]`。マグナ武器は複数積み可) |

## ステータス

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 初期 | 1 | 要検証 | 要検証 | |
| 3凸・最大 | 100 | 要検証 | 要検証 | |
| 4凸・最大 | 150 | 要検証 | 要検証 | |
| 5凸・最大 | 200 | 324 | 2450 | 実機実測(`param.hp` / `param.attack`、+0、evolution 5) |
| 超越 | — | — | — | 非対応 |

## 武器スキル

### スキル1: 機炎方陣・攻刃III

- skill_id: `94`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: **方陣攻刃(III)**。image `skill_atk_m_1_3`(`_m_` = マグナ)
- 枠(frame): **方陣攻刃枠(マグナ)** — マグナグリッド(コロッサス等の召喚石メイン)で乗る。通常攻刃・EX攻刃とは別枠
- 効果: 火属性キャラの攻撃力上昇(大)
- スキルレベル別の数値: 方陣攻刃III(大)スキルLv20 時の攻撃力UP% は**要検証**
- 発動条件: 常時(火属性キャラ)
- 出典: 実機レスポンス / gbf.wiki
- ステータス: 未検証

### スキル2〜4: なし(この個体)

- `skill2`〜`skill4` は `skill_id` が null。この武器はスキル1つのみ。
- **Exスキル**: マグナ/アンセスタル(六竜)/プライマル/オールドプライマルの武器は、ドロップ時に skill2 として**ランダムなExスキル**(方陣HP・方陣三手〈連撃〉・方陣背水・無属性攻刃 等)が付くことがある。**この個体は付いていない**。付いている個体は skill2 に `skill_id`/`name`/`comment` が入る。

## 奥義(チャージアタック)

- 名称: 次元断＋＋(最終上限解放後の形)
- 効果: 火属性ダメージ(特大)/防御DOWN
- 数値/スケーリング: 奥義倍率、防御DOWN の値・時間は**要検証**
- 進化段階: 上限解放で 無印 → ＋ → ＋＋
- 出典: 実機レスポンス
- ステータス: 未検証

## AUG(エレメント / `augment_skill`)

- 付与状況(この個体): **あり**(`param.augment_id_list` = "44:84")
- AUG効果:
  - **奥義ダメージ**(`skill_id` 1591、Lv8、`+7%`)— 味方全体の奥義ダメージ上昇。image `ex_skill_sp_atk`
  - **渾身**(`skill_id` 1600、Lv3、`+3`)— 味方全体のHPが多いほど攻撃力が上昇。image `ex_skill_whole`
- 枠(frame): AUGの効果は基本的に別枠(EX/AUG枠)で乗る(要検証)。「+3」の単位はレベル相当値(gbf.wiki 参照、要検証)

## 上限解放・強化要素

- 上限解放: 5段階(`max_evolution_level` = 5)。Lv150→200 のマグナ上限解放を含む。
- スキルレベル: 上限20。`can_skillplus` = false。
- 装備制限: なし(`limit` = `[]`)。マグナ武器は同一名を複数積める。
- 覚醒 / 超越 / オーディアント: 非対応。
- AUG: 上記「AUG」セクション参照。

## 編成での役割

- 使用グリッド: **火マグナ(コロッサス・マグナ召喚石)グリッド**の方陣攻刃本数。1本のスキルなので複数本で攻刃を積む古い運用。現在は上位の方陣武器(オールドプライマル等)に置き換わることが多い。
- メイン装備時の恩恵: 奥義「次元断＋＋」(火ダメージ + 防御DOWN)。
- 使い分け: 上位方陣攻刃武器が揃うまでのつなぎ、または方陣攻刃の本数調整。

## 関連トピック

- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

- 英語名(`Colossus Cane Omega` は gbf.wiki 慣例。要確認)。
- Lv1 / 各凸段階のステータス。
- スキル1「機炎方陣・攻刃III」スキルLv20 時の攻撃力UP%。
- Exスキルの抽選プール(方陣HP / 方陣三手 / 方陣背水 / 無属性攻刃 …)と各効果。
- AUG「奥義ダメージ Lv8 +7%」「渾身 Lv3 +3」の正確な意味(Lv と effect_value の関係、渾身「+3」の単位)。AUGがダメージ計算上乗る枠。
- 奥義「次元断」の倍率・防御DOWN の値。
- `master.bonus_level` = "40" の意味。
