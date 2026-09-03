---
id: "ex1-ninja"
job_id: "210201"
name_jp: "忍者"
name_en: "Ninja"
class_tier: "エクストラ"
series: "(要確認)"
weapon_type: "刀/格闘"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# 忍者(Ninja)
![忍者](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/210201_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | エクストラ / (要確認) |
| 得意武器 | 刀/格闘 |
| DA基礎率/TA基礎率 | 4%/1% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | ダブルアタック確率+25%(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: 忍術(Lv1で習得)
![忍術](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/73_3.png)

- 効果(初期): 印を結んで忍術を発動
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ2: 風魔手裏剣(Lv5で習得)
![風魔手裏剣](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/74_1.png)

- 効果(初期): 敵に自属性ダメージ/印に応じて追加効果発動　◆刀：自分の忍術再使用間隔短縮　格闘：自分のダブルアタック確率UP/攻撃UP
- 使用間隔: 8ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### アビリティ3: 朧(Lv15で習得)
![朧](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/75_1.png)

- 効果(初期): 敵に自属性ダメージ　◆刀：自分に暗闇効果/ダブルアタック確率UP　格闘：自分の攻撃UP/防御DOWN/奥義ゲージ上昇量UP
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

### 焙烙玉(習得Lv不明)
![焙烙玉](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/99_1.png)

- 効果: 5ターン後に敵全体に自属性ダメージ
- 使用間隔: 7ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## サポートスキル(常時発動)

### 隠密(Lv1)

- 効果(初期): 稀に敵の全ての攻撃を回避
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 打剣(Lv1)

- 効果(初期): 風魔手裏剣の効果UP
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | ダブルアタック確率+5% |
| 5 | ダブルアタック確率+5% |
| 10 | ダブルアタック確率+5% |
| 15 | ダブルアタック確率+5% |
| 20 | ダブルアタック確率+5% |

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

- 英語名(`Ninja`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
