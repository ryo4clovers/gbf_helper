---
id: "ex1-drum-master"
job_id: "270201"
name_jp: "ドラムマスター"
name_en: "Drum Master"
class_tier: "エクストラ"
series: "(要確認)"
weapon_type: "楽器/楽器"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# ドラムマスター(Drum Master)
![ドラムマスター](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/270201_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | エクストラ / (要確認) |
| 得意武器 | 楽器/楽器 |
| DA基礎率/TA基礎率 | 90%/90% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 攻撃力+1000、HP+1000(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: 極点(Lv1で習得)
![極点](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/144_3.png)

- 効果(初期): 味方全体の奥義ダメージUP/奥義ダメージ上限UP/チェインバースト上限UP
- 使用間隔: 8ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: 熱烈峻厳(Lv5で習得)
![熱烈峻厳](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/408_3.png)

- 効果(初期): 自分以外の味方全体に奥義ゲージを分配する/奥義ゲージ上昇量UP　◆◆奥義ゲージを30%消費
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: 闘志の残響(Lv15で習得)
![闘志の残響](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/409_4.png)

- 効果(初期): 敵全体に自属性防御DOWN　◆◆奥義ゲージを20%消費
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

### 律動共振(習得Lv不明)
![律動共振](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/529_3.png)

- 効果: 味方単体の奥義ゲージUP(40%)
- 使用間隔: 7ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## サポートスキル(常時発動)

### 太鼓叩き(Lv1)

- 効果(初期): 与ダメージが減少するが連続攻撃確率が高い
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 祭囃子(Lv1)

- 効果(初期): チェイン数に応じて奥義ゲージ上昇/味方全体に熱気効果付与/闘志の残響使用時、参戦者の数に応じて味方全体の攻防UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 攻撃力+200、HP+200 |
| 5 | 攻撃力+200、HP+200 |
| 10 | 攻撃力+200、HP+200 |
| 15 | 攻撃力+200、HP+200 |
| 20 | 攻撃力+200、HP+200 |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): トリプルアタック確率+1%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Drum Master`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
