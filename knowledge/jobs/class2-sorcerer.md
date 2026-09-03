---
id: "class2-sorcerer"
job_id: "130101"
name_jp: "ソーサラー"
name_en: "Sorcerer"
class_tier: "ClassII"
series: "(要確認)"
weapon_type: "杖/短剣"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# ソーサラー(Sorcerer)
![ソーサラー](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/130101_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassII / (要確認) |
| 得意武器 | 杖/短剣 |
| DA基礎率/TA基礎率 | 7%/3% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | アビリティダメージ+15%(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: エーテルブラスト(Lv1で習得)
![エーテルブラスト](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/60_1.png)

- 効果(初期): 敵に2～3倍自属性ダメージ
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: アイス(Lv5で習得)
![アイス](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/5_1.png)

- 効果(初期): 敵全体に水属性ダメージ(小)
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: ブラインド(Lv15で習得)
![ブラインド](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/39_4.png)

- 効果(初期): 敵に暗闇効果
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

なし(実機のジョブLv詳細レスポンスで`limit_ability`が空配列であることを確認)。

## サポートスキル(常時発動)

### 精霊の加護(Lv1)

- 効果(初期): アビリティダメージUP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | アビリティダメージ+3% |
| 5 | アビリティダメージ+3% |
| 10 | アビリティダメージ+3% |
| 15 | アビリティダメージ+3% |
| 20 | アビリティダメージ+3% |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): アビリティダメージ+5%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Sorcerer`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
