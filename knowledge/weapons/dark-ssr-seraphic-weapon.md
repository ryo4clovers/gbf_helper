---
id: "dark-ssr-seraphic-weapon"
name_jp: "闇の子の歯牙"
name_en: "Scythe of Belial"
weapon_id: "1040310800"
element: 闇
rarity: SSR
weapon_type: "斧"
series: "セラフィックウェポン"
obtain: "ショップ(トレジャー交換で作成・上限解放)"
status: 下書き
last_updated: 2026-09-08
source: "実機の武器詳細レスポンス(ユーザー提供、2026-09-08。Lv150・4凸・+0 の個体)。英語名は gbf.wiki『Seraphic Weapons』(2026-09-08 参照、刷新前の名称の可能性)。数値は未検証。"
---

# 闇の子の歯牙(Scythe of Belial)
![闇の子の歯牙](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040310800.jpg)

## 概要

闇属性のセラフィックウェポン。編成に1本のみ装備でき、有利属性(闇→光)の敵に対する闇パーティの与ダメージを底上げする特殊枠。グリッド火力より「与ダメージ上昇」と奥義の闇属性攻撃UP/不利属性ダメージ軽減が目的で、有利古戦場・高難易度で1枠採用される。火版は [fire-ssr-seraphic-weapon.md](fire-ssr-seraphic-weapon.md)。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | 闇 |
| 武器種 | 斧 |
| シリーズ | セラフィックウェポン(`series_id` = 1) |
| 入手方法 | ショップ(トレジャー交換) |
| 最大レベル | 150 |
| スキルレベル上限 | 15 |
| 上限解放段階 | 4凸(`max_evolution_level` = 4) |
| 編成本数制限 | 編成に1本まで(`limit` は空だが本数制限あり) |

## ステータス

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 初期 | 1 | 要検証 | 要検証 | |
| 最終上限解放・最大 | 150 | 230 | 3100 | 実機実測(`param.hp`/`param.attack`、+0、evolution 4) |
| 超越 | — | — | — | 非対応(`can_release_transcendence` = false) |

## 武器スキル

### スキル1: 堕落のすゝめIII

- skill_id: `1253`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: セラフィック(有利属性の敵に対する与ダメージ上昇)。image `skill_seraphic_6_3`
- 枠(frame): 与ダメージ上昇枠(他の与ダメージUP系と加算される独立枠、要検証)
- 効果(実機 comment): 闇属性のキャラが光属性の敵に対して与ダメージUP
- スキルレベル別の数値: 刷新後・スキルLv15 時の与ダメージUP% は**要検証**(gbf.wiki は刷新前『祝福II』基準)
- 発動条件: 闇属性キャラ かつ 敵が光属性のとき
- image: `skill_seraphic_6_3`
- 出典: 実機レスポンス
- ステータス: 未検証

### スキル2: 闇の神威

- skill_id: `379`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: 神威(EX攻刃 + 最大HP UP、小)。image `skill_god_6`
- 枠(frame): EX攻刃枠(攻撃力) + HP。通常攻刃・方陣攻刃とは別枠(要検証)
- 効果(実機 comment): 闇属性キャラの攻撃力と最大HPが上昇(小)
- スキルレベル別の数値: 「(小)」表記。具体値は**要検証**
- 発動条件: 常時(闇属性キャラ)
- image: `skill_god_6`
- 出典: 実機レスポンス
- ステータス: 未検証

<!-- skill3 / skill4 は null。この武器のスキルは2つ。 -->

## 奥義(チャージアタック)

- 名称: ウェルカム・トゥ・パレイド
- 効果(実機 comment): 闇属性ダメージ(特大)/味方全体の闇属性攻撃UP/光属性ダメージ軽減
- 数値/スケーリング: 奥義倍率、闇属性攻撃UP・光属性ダメージ軽減の % とターン数は**要検証**
- 出典: 実機レスポンス
- ステータス: 未検証

## 上限解放・強化要素

- 上限解放: 4凸(トレジャー交換)。段階ごとの解放内容は要検証。
- スキルレベル: 上限15。
- **装備制限**: セラフィックウェポンは編成に1本まで([team-building-basics.md](../mechanics/team-building-basics.md))。
- 覚醒 / 超越 / オーディアント: 非対応。`augment_skill` は空。
- `master.archaic` = "1"(刷新後形態のマーカー)。

## 編成での役割

- 使用グリッド: 編成に1本のみの特殊枠。オメガ/神石どちらの編成でも1枠を使う。
- メイン装備時の恩恵: 基本的にメイン装備しない。
- 使い分け: 有利属性の敵と戦うコンテンツで採用。不利・等倍ではスキル1が発動せず非採用。

## 関連トピック

- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

- 刷新後の正式英語名(gbf.wiki が旧版名のままか要確認。武器種も旧版と異なる可能性: 弓↔リング、斧↔サイズ)。
- Lv1・上限解放途中のステータス。
- スキル1の刷新後・Lv15 与ダメージUP%、スキル2の攻撃力/最大HP UP%。
- 奥義『ウェルカム・トゥ・パレイド』の倍率・各効果の値とターン数。
- スキルの正確な枠(frame)。
