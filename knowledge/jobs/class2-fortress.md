---
id: "class2-fortress"
job_id: "110101"
name_jp: "フォートレス"
name_en: "Fortress"
class_tier: "ClassII"
series: "(要確認)"
weapon_type: "剣/槍"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# フォートレス(Fortress)
![フォートレス](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/110101_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassII / (要確認) |
| 得意武器 | 剣/槍 |
| DA基礎率/TA基礎率 | 7%/3% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 防御力+15%(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: ファランクス(Lv1で習得)
![ファランクス](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/37_3.png)

- 効果(初期): 参戦者の全属性ダメージカット(50%)
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: ドライブバーストII(Lv5で習得)
![ドライブバーストII](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/33_1.png)

- 効果(初期): オーバードライブ時の敵に4倍自属性ダメージ
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: センチュリオン(Lv15で習得)
![センチュリオン](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/29_3.png)

- 効果(初期): 自分の被ダメージ無効(1回)/攻撃DOWN
- 使用間隔: 8ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

なし(実機のジョブLv詳細レスポンスで`limit_ability`が空配列であることを確認)。

## サポートスキル(常時発動)

### 大盾(Lv1)

- 効果(初期): 確率で全属性ダメージカット(50%)
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 防御力+3% |
| 5 | 防御力+3% |
| 10 | 防御力+3% |
| 15 | 防御力+3% |
| 20 | 防御力+3% |

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

- 英語名(`Fortress`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
