---
id: "class2-kung-fu"
job_id: "160101"
name_jp: "クンフー"
name_en: "Kung Fu"
class_tier: "ClassII"
series: "(要確認)"
weapon_type: "格闘/格闘"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# クンフー(Kung Fu)
![クンフー](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/160101_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassII / (要確認) |
| 得意武器 | 格闘/格闘 |
| DA基礎率/TA基礎率 | 25%/5% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 攻撃力+2000、HP+200(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: カウンター(Lv1で習得)
![カウンター](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/23_1.png)

- 効果(初期): カウンター効果(回避/3回)/自分の攻撃UP
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: 捨身の型II(Lv5で習得)
![捨身の型II](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/35_3.png)

- 効果(初期): 自分の攻撃UP(特大)/防御DOWN
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: 内功(Lv15で習得)
![内功](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/50_2.png)

- 効果(初期): 自分のHPを回復/防御UP
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

なし(実機のジョブLv詳細レスポンスで`limit_ability`が空配列であることを確認)。

## サポートスキル(常時発動)

### 虎襲の構え(Lv1)

- 効果(初期): 攻撃UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 攻撃力+400、HP+40 |
| 5 | 攻撃力+400、HP+40 |
| 10 | 攻撃力+400、HP+40 |
| 15 | 攻撃力+400、HP+40 |
| 20 | 攻撃力+400、HP+40 |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): HP+2%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Kung Fu`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
