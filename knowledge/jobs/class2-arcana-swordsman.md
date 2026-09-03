---
id: "class2-arcana-swordsman"
job_id: "150101"
name_jp: "アルカナソード"
name_en: "Arcana Swordsman"
class_tier: "ClassII"
series: "(要確認)"
weapon_type: "剣/短剣"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# アルカナソード(Arcana Swordsman)
![アルカナソード](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/150101_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassII / (要確認) |
| 得意武器 | 剣/短剣 |
| DA基礎率/TA基礎率 | 7%/3% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 弱体成功率+15%(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: ディレイ(Lv1で習得)
![ディレイ](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/32_1.png)

- 効果(初期): 敵に自属性ダメージ/スロウ効果
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: エレメンタルフォースII(Lv5で習得)
![エレメンタルフォースII](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/20_3.png)

- 効果(初期): 参戦者のアビリティダメージUP(大)
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: クイック(Lv15で習得)
![クイック](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/24_3.png)

- 効果(初期): 味方全体の連続攻撃確率UP
- 使用間隔: 7ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

なし(実機のジョブLv詳細レスポンスで`limit_ability`が空配列であることを確認)。

## サポートスキル(常時発動)

### サボタージ(Lv1)

- 効果(初期): 弱体成功率UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 弱体成功率+3% |
| 5 | 弱体成功率+3% |
| 10 | 弱体成功率+3% |
| 15 | 弱体成功率+3% |
| 20 | 弱体成功率+3% |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): 弱体耐性+5%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Arcana Swordsman`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
