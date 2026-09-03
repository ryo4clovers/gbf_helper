---
id: "ex1-kenja"
job_id: "250201"
name_jp: "賢者"
name_en: "Kenja"
class_tier: "エクストラ"
series: "(要確認)"
weapon_type: "杖/杖"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# 賢者(Kenja)
![賢者](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/250201_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | エクストラ / (要確認) |
| 得意武器 | 杖/杖 |
| DA基礎率/TA基礎率 | 4%/1% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | HP+1000(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: 天眼陣(Lv1で習得)
![天眼陣](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/186_3.png)

- 効果(初期): 味方全体のステータス大幅UP/再使用で解除
◆◆MPを毎ターン3消費/自分の通常攻撃を単体化
◆再使用またはMP0で解除時に自分が弱体化
- 使用間隔: 2ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: 宿命陣(Lv5で習得)
![宿命陣](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/187_3.png)

- 効果(初期): 自分の奥義ゲージをMPに変換◆
◆奥義ゲージは0になる
- 使用間隔: 4ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: 他心陣(Lv15で習得)
![他心陣](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/188_3.png)

- 効果(初期): 自分のHPを奥義ゲージに変換◆
◆HPを現在値の最大50%消費
- 使用間隔: 8ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

### 三明(習得Lv不明)
![三明](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/580_3.png)

- 効果: 味方単体のトリプルアタック確率UP
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## サポートスキル(常時発動)

### 神足陣(Lv1)

- 効果(初期): 通常攻撃を全体化(天眼陣中は単体化)/奥義使用時にMPを全て消費してダメージUP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 開明(Lv1)

- 効果(初期): MPを毎ターン１ずつ回復
◆◆天眼陣中のMP0による解除で発生した弱体効果中は回復しない
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | HP+200 |
| 5 | HP+200 |
| 10 | HP+200 |
| 15 | HP+200 |
| 20 | HP+200 |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): 通常攻撃時奥義ゲージ上昇+1%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Kenja`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
