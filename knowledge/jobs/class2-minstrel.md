---
id: "class2-minstrel"
job_id: "180101"
name_jp: "ミンストレル"
name_en: "Minstrel"
class_tier: "ClassII"
series: "(要確認)"
weapon_type: "楽器/短剣"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# ミンストレル(Minstrel)
![ミンストレル](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/180101_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassII / (要確認) |
| 得意武器 | 楽器/短剣 |
| DA基礎率/TA基礎率 | 7%/3% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 防御力+10%、弱体耐性+10%(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: オーヴァチュア(Lv1で習得)
![オーヴァチュア](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/61_3.png)

- 効果(初期): 味方全体の回復性能UP　★メイン武器の武器種が楽器の時、性能UP
- 使用間隔: 7ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: チャームボイスII(Lv5で習得)
![チャームボイスII](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/62_4.png)

- 効果(初期): 敵に魅了効果　★メイン武器の武器種が楽器の時、性能UP
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: ミンストレルソング(Lv15で習得)
![ミンストレルソング](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/47_2.png)

- 効果(初期): 味方全体に再生効果　★メイン武器の武器種が楽器の時、性能UP
- 使用間隔: 8ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

なし(実機のジョブLv詳細レスポンスで`limit_ability`が空配列であることを確認)。

## サポートスキル(常時発動)

### カンタービレ(Lv1)

- 効果(初期): オーバードライブ時の敵からの被ダメージ減少
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 防御力+2%、弱体耐性+2% |
| 5 | 防御力+2%、弱体耐性+2% |
| 10 | 防御力+2%、弱体耐性+2% |
| 15 | 防御力+2%、弱体耐性+2% |
| 20 | 防御力+2%、弱体耐性+2% |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): 防御力+2%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Minstrel`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
