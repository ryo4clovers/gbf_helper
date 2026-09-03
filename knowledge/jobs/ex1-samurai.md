---
id: "ex1-samurai"
job_id: "220201"
name_jp: "侍"
name_en: "Samurai"
class_tier: "エクストラ"
series: "(要確認)"
weapon_type: "刀/弓"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# 侍(Samurai)
![侍](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/220201_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | エクストラ / (要確認) |
| 得意武器 | 刀/弓 |
| DA基礎率/TA基礎率 | 4%/1% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 攻撃力+3000(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: 画竜点睛(Lv1で習得)
![画竜点睛](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/76_3.png)

- 効果(初期): 連続攻撃確率UP
◆◆被ダメージまで効果継続
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: 瞑想(Lv5で習得)
![瞑想](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/77_3.png)

- 効果(初期): 自分の攻撃UP/クリティカル確率UP/弱体効果を全て回復　◆◆奥義ゲージを30％消費
- 使用間隔: 1ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: 鴉雀無声(Lv15で習得)
![鴉雀無声](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/78_3.png)

- 効果(初期): 自分の防御UP　◆刀：自分に幻影効果(1回)/自分の攻撃DOWN　弓：自分の攻撃UP/連続攻撃確率DOWN/奥義ゲージDOWN
- 使用間隔: 7ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

### 雲散霧消(習得Lv不明)
![雲散霧消](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/51_3.png)

- 効果: 敵の全ての攻撃を回避
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## サポートスキル(常時発動)

### 武士道(Lv1)

- 効果(初期): 奥義ゲージ最大値200
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 虚心坦懐(Lv1)

- 効果(初期): 鴉雀無声の効果UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 攻撃力+600 |
| 5 | 攻撃力+600 |
| 10 | 攻撃力+600 |
| 15 | 攻撃力+600 |
| 20 | 攻撃力+600 |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): 攻撃力+5%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Samurai`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
