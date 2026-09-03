---
id: "class3-bishop"
job_id: "120201"
name_jp: "ビショップ"
name_en: "Bishop"
class_tier: "ClassIII"
series: "(要確認)"
weapon_type: "杖/槍"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# ビショップ(Bishop)
![ビショップ](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/120201_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | ClassIII / (要確認) |
| 得意武器 | 杖/槍 |
| DA基礎率/TA基礎率 | 4%/1% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 回復力+20%(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: ヒールオールII(Lv1で習得)
![ヒールオールII](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/36_2.png)

- 効果(初期): 参戦者のHPを回復(中)
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: ディスペル(Lv5で習得)
![ディスペル](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/58_4.png)

- 効果(初期): 敵の強化効果を1つ無効化
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: リヴァイヴ(Lv15で習得)
![リヴァイヴ](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/46_2.png)

- 効果(初期): 味方単体を復活
- 使用間隔: 12ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

### ベール(習得Lv不明)
![ベール](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/53_3.png)

- 効果: 味方全体の弱体効果無効(1回)
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### ホワイトウォール(習得Lv不明)
![ホワイトウォール](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/52_3.png)

- 効果: 味方全体にバリア効果
- 使用間隔: 7ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## サポートスキル(常時発動)

### 慈悲(Lv1)

- 効果(初期): 回復効果UP/回復上限UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 救済の光(Lv1)

- 効果(初期): リヴァイヴの回復量UP/使用間隔短縮/自動復活時の回復量UP/ヒールオールII使用時攻撃UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 回復力+4% |
| 5 | 回復力+4% |
| 10 | 回復力+4% |
| 15 | 回復力+4% |
| 20 | 回復力+4% |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): 回復力+3%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Bishop`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
