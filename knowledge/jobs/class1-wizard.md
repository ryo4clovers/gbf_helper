---
id: "class1-wizard"
job_id: "130001"
name_jp: "ウィザード"
name_en: "Wizard"
class_tier: "ClassI"
series: "(要確認)"
weapon_type: "杖/短剣"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-07
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得)およびジョブ概要レスポンス(job.master、DA/TA基礎率、コメント等)、いずれも2026-09-07にユーザーがdraftフォルダ経由で提供。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# ウィザード(Wizard)
![ウィザード](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/130001_01.jpg)

## 概要

大自然の精霊と契約し、属性攻撃を得意とする魔導士。攻撃タイプのジョブ(ジョブ概要レスポンスの説明文より)。同系統の上位ジョブとしてオリジンの「ウィザード・オリジン」(`super_job_class_id: 130501`、[origin1-wizard-origin.md](./origin1-wizard-origin.md))が存在する。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassI / (系列名は要確認) |
| 得意武器 | 杖/短剣 |
| DA基礎率/TA基礎率 | 7%/3%(ジョブ概要レスポンスの`da_odds`/`ta_odds`より) |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | アビリティダメージ+10%(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: エーテルブラスト(Lv1で習得)
![エーテルブラスト](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/60_1.png)

- 効果: 敵に2〜3倍自属性ダメージ
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: ファイア(Lv10で習得)
![ファイア](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/4_1.png)

- 効果: 敵全体に火属性ダメージ(小)(レスポンスの記載通り「火属性」。自属性ではなく火属性固定の可能性、要検証)
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

なし(実機のジョブLv詳細レスポンスで`limit_ability`が空配列であることを確認、2026-09-07)。

## サポートスキル(常時発動)

### 精霊の加護(Lv1)

- 効果: アビリティダメージUP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。ウィザードは各チェックポイントで
     同一内容(アビリティダメージ+2%)が繰り返し加算されるパターン。 -->

| Lv | 内容 |
| --- | --- |
| 1 | アビリティダメージ+2% |
| 5 | アビリティダメージ+2% |
| 10 | アビリティダメージ+2% |
| 15 | アビリティダメージ+2% |
| 20 | アビリティダメージ+2% |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): アビリティダメージ+3%(ジョブLv詳細レスポンス`master_bonus`、ジョブ概要レスポンス`master_bonus_of_job`より)。
- 進化元ジョブ側のマスターレベル強化: 無し(ClassIジョブのため進化元が存在しない、`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。
- 注: ジョブ概要レスポンスでは`is_open_master_level: false`(Class.IV/EX II式のマスターレベルは未解放)。この`master_bonus`はジョブLv最大到達で得られる「ジョブマスターボーナス」であり、Class.IV/EX IIの「マスターレベル」システムとは別物と考えられる(他ClassI〜IIIジョブファイルと同じ扱い。用語の整理は今後の課題)。

## 極致の証

(未確認。ジョブ概要レスポンスでは`is_released_perfection_proof: false`。ClassIジョブは対象外と考えられる)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム(ClassIは最大3枠: 基本2枠+自由選択1枠)
- [origin1-wizard-origin.md](./origin1-wizard-origin.md) — 同系統の上位(オリジン)ジョブ

## 未確認・要検証事項

- 英語名(`Wizard`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- アビリティ2「ファイア」がレスポンス上「火属性ダメージ」と記載されており、他属性の主人公でも火属性固定なのか自属性に変わるのかは未検証。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- このアカウントでは既にウィザード・オリジンへ進化済みだが、進化元のClassIウィザードのジョブステータス画面は引き続き参照可能だった(2026-09-07)。
