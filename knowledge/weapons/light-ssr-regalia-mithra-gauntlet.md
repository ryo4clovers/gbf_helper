---
id: "light-ssr-regalia-mithra-gauntlet"
name_jp: "ミトロンの籠手"
name_en: ""
weapon_id: "1040609900"
element: 光
rarity: SSR
weapon_type: "格闘"
series: "レガリアシリーズ"
obtain: "マグナII(HL)マルチのドロップ / 討伐章交換"
status: 下書き
last_updated: 2026-09-08
source: "実機の武器詳細レスポンス(ユーザー提供、2026-09-08。Lv150・4凸・+0)。英語名は gbf.wiki 未整備。数値は未検証。"
---

# ミトロンの籠手
![ミトロンの籠手](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040609900.jpg)

## 概要

光属性のレガリアシリーズ(マグナII / gbf.wiki: Regalia Weapons)(`series_id` = 7)の格闘。マグナIIグリッド用。第1・第2スキルとも方陣系(2枠)。複数積みで方陣グリッドを構成する。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | SSR |
| 属性 | 光 |
| 武器種 | 格闘 |
| シリーズ | レガリアシリーズ(マグナII / gbf.wiki: Regalia Weapons)(`series_id` = 7) |
| 最大レベル | 150(4凸) |
| スキルレベル上限 | 15 / 15 |
| 上限解放段階 | 4 |
| 編成本数制限 | なし(`limit` = `[]`。方陣武器は複数積み可) |

## ステータス

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 4凸・最大 | 150 | 270 | 2540 | 実機実測(+0、evolution 4) |
| その他段階 | | 要検証 | 要検証 | |
| 超越 | — | — | — | 非対応 |

## 武器スキル

### スキル1: 騎解方陣・見切II

- skill_id: `941`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: 方陣見切II。image `skill_counter_m_5_2`
- 枠(frame): 要検証
- 効果(実機 comment): 光属性キャラが稀に回避カウンター(ダメージ中)
- スキルレベル別の数値: **要検証**
- image: `skill_counter_m_5_2`
- 出典: 実機レスポンス
- ステータス: 未検証

### スキル2: 先制の白の結界

- skill_id: `277`
- 解放レベル: 武器Lv1
- 選択式: いいえ(固定)
- 系統/カテゴリ: その他(comment 参照)。image `skill_barrier_5`
- 枠(frame): 要検証
- 効果(実機 comment): バトル開始時、光属性キャラにバリア効果
- スキルレベル別の数値: **要検証**
- image: `skill_barrier_5`
- 出典: 実機レスポンス
- ステータス: 未検証

## 奥義(チャージアタック)

- 名称: 昴＋＋
- 効果(実機 comment): 光属性ダメージ(特大)/発動ターン中味方全体の被ダメージカット(30%)/味方全体の光属性攻撃UP
- 数値/スケーリング: **要検証**
- 出典: 実機レスポンス
- ステータス: 未検証

## 上限解放・強化要素

- 上限解放: 4段階。
- スキルレベル: 上限15。
- 装備制限: なし(方陣武器は複数積み可)。
- 覚醒 / 超越 / オーディアント: 非対応。

## 編成での役割

- 使用グリッド: **光マグナIIグリッド**の方陣スキル本数。
- メイン装備時の恩恵: 奥義「昴＋＋」。
- 使い分け: 方陣攻刃/背水/渾身/技巧/連撃 等、必要なスキル種で本数を調整。

## 関連トピック

- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

- 各スキルのスキルLv別の数値。
- 奥義「昴＋＋」の倍率・追加効果。
- 初期・途中段階のステータス。
- 英語名(gbf.wiki 未整備)。
