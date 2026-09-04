---
id: "class1-fighter"
job_id: "100001"
name_jp: "ファイター"
name_en: "Fighter"
class_tier: "ClassI"
series: "(要確認)"
weapon_type: "剣/斧"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-07
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得)およびジョブ概要レスポンス(job.master、DA/TA基礎率、コメント等)、いずれも2026-09-07にユーザーがdraftフォルダ経由で提供。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# ファイター(Fighter)
![ファイター](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/100001_01.jpg)

## 概要

剣や斧の扱いに長け、高い攻撃力を生かした戦いが得意な攻撃タイプのジョブ(ジョブ概要レスポンスの説明文より)。同系統の上位ジョブとしてオリジンの「ファイター・オリジン」(`super_job_class_id: 100501`、[origin1-fighter-origin.md](./origin1-fighter-origin.md))が存在する。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassI / (系列名は要確認) |
| 得意武器 | 剣/斧 |
| DA基礎率/TA基礎率 | 10%/5%(ジョブ概要レスポンスの`da_odds`/`ta_odds`より) |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 攻撃力+1500(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: ウェポンバースト(Lv1で習得)
![ウェポンバースト](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/18_3.png)

- 効果: 自分が即座に奥義発動可能
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: レイジ(Lv10で習得)
![レイジ](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/14_3.png)

- 効果: 参戦者の攻撃UP(小)(3ターン)
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

なし(実機のジョブLv詳細レスポンスで`limit_ability`が空配列であることを確認、2026-09-07)。

## サポートスキル(常時発動)

### アサルトステップ(Lv1)

- 効果: ダブルアタック確率UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。ファイターは各チェックポイントで
     同一内容(攻撃力+300)が繰り返し加算されるパターン。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 攻撃力+300 |
| 5 | 攻撃力+300 |
| 10 | 攻撃力+300 |
| 15 | 攻撃力+300 |
| 20 | 攻撃力+300 |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): 攻撃力+1%(ジョブLv詳細レスポンス`master_bonus`、ジョブ概要レスポンス`master_bonus_of_job`より)。
- 進化元ジョブ側のマスターレベル強化: 無し(ClassIジョブのため進化元が存在しない、`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。
- 注: ジョブ概要レスポンスでは`is_open_master_level: false`(Class.IV/EX II式のマスターレベルは未解放)。この`master_bonus`はジョブLv最大到達で得られる「ジョブマスターボーナス」であり、Class.IV/EX IIの「マスターレベル」システムとは別物と考えられる(他ClassI〜IIIジョブファイルと同じ扱い。用語の整理は今後の課題)。

## 極致の証

(未確認。ジョブ概要レスポンスでは`is_released_perfection_proof: false`。ClassIジョブは対象外と考えられる)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム(ClassIは最大3枠: 基本2枠+自由選択1枠)
- [origin1-fighter-origin.md](./origin1-fighter-origin.md) — 同系統の上位(オリジン)ジョブ

## 未確認・要検証事項

- 英語名(`Fighter`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- DA/TA基礎率(10%/5%)はジョブ概要レスポンスの`da_odds`/`ta_odds`より。他のClassIジョブファイルは暫定値「7%/3%」を記載しているものがあり、突き合わせ・是正は今後の課題。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- このアカウントでは既にファイター・オリジンへ進化済みだが、進化元のClassIファイターのジョブステータス画面は引き続き参照可能だった(2026-09-07)。
