---
id: "ex2-kengo"
job_id: "220301"
name_jp: "剣豪"
name_en: "Kengo"
class_tier: "エクストラII"
series: "(要確認)"
weapon_type: "刀/弓"
obtain: "(要確認、詳細はGameWith記事等を参照)"
has_master_level: true
has_kokuchi: false
status: 下書き
last_updated: 2026-09-06
source: "実機(グランブルーファンタジー公式サイト)より取得。ジョブLv詳細レスポンス(ability/limit_ability/level_up_bonus等がジョブLv別に整理された形、ジョブリスト→ジョブステータス画面より取得、2026-09-06、ユーザー提供、draftフォルダ経由)。GameWith/gbf.wikiでのクロスチェックは未実施。"
---

# 剣豪(Kengo)
![剣豪](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/leader/m/220301_01.jpg)

## 概要

(このジョブの位置づけ・強みを1〜3行で記載。実機データからは把握できないため要加筆)

## 基本情報

| 項目 | 内容 |
| --- | --- |
| クラス/系列 | エクストラII / (要確認) |
| 得意武器 | 刀/弓 |
| DA基礎率/TA基礎率 | 4%/1% |
| ジョブレベル上限 | 20 |
| 習得条件 | (要確認、詳細はGameWith記事等を参照) |
| ジョブLvアップボーナス(Lv20到達時点の合計) | 攻撃力+3000、HP+1000、通常攻撃時奥義ゲージ上昇+1(内訳は下記「ジョブLvアップボーナス(レベル別)」参照) |
| コンプリートボーナス | (要確認) |

## アビリティ構成

### アビリティ1: 剣禅一如(Lv1で習得)
![剣禅一如](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/608_3.png)

- 効果(初期): 自分に特殊強化(連続攻撃確率UP)/クリティカル確率UP
◆◆特殊強化は被ダメージまで効果継続
- 使用間隔: 5ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## リミットアビリティ

### 大鷲返し(習得Lv不明)
![大鷲返し](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/23_1.png)

- 効果: カウンター効果(回避・被ダメージ/2回)
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 無明斬(習得Lv不明)
![無明斬](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/609_3.png)

- 効果: 効果中ターン進行時に攻撃行動を3回行う
◆◆奥義ゲージを40%消費
- 使用間隔: 7ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 烈刀一閃(習得Lv不明)
![烈刀一閃](https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/ui/icon/ability/m/610_3.png)

- 効果: 敵に自属性ダメージ/自分の奥義性能UP
◆◆奥義ゲージを60%消費
- 使用間隔: 6ターン
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## サポートスキル(常時発動)

### 心空(Lv1)

- 効果(初期): 奥義ゲージ最大値200
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

### 雲耀(Lv1)

- 効果(初期): 奥義発動時自分に雲耀効果(雲耀Lvに応じて攻撃性能UP/奥義ダメージUP)
- 出典: 実機(グランブルーファンタジー公式サイト、ジョブLv詳細レスポンス)

## ジョブLvアップボーナス(レベル別)

<!-- 各行はそのLvで新たに加算される内容(累積ではない)。 -->

| Lv | 内容 |
| --- | --- |
| 1 | 攻撃力+1000 |
| 5 | HP+1000 |
| 10 | 攻撃力+1000 |
| 15 | 通常攻撃時奥義ゲージ上昇+1 |
| 20 | 攻撃力+1000 |

## マスターレベル強化

- ジョブ固有のマスターレベル強化(Lv20到達時): メイン武器が刀の時、メイン武器の攻撃力UP+3%
- 進化元ジョブ側のマスターレベル強化: 無し(`base_job_master_bonus`が空)。
- 全ジョブ共通のマスターレベル強化(攻撃力/防御力/HP等の底上げ)は本ファイルでは省略(別途まとめて記載予定)。

## 極致の証

(未確認。対象ジョブかどうか含め要検証)

## 関連トピック

- [character-growth.md](../mechanics/character-growth.md)
- [buffs-debuffs.md](../mechanics/buffs-debuffs.md)
- [abilities.md](../mechanics/abilities.md) — アビリティ枠システム

## 未確認・要検証事項

- 英語名(`Kengo`)は一般的な訳語からの暫定表記、正式名称は要検証。
- 系列名(正式名称)、習得条件、コンプリートボーナスは実機APIのこの取得範囲では確認できず未記載。
- マスターレベル強化の全ジョブ共通項目(攻撃力/防御力/HP等)は別途まとめて記載する方針のため、本ファイルには未記載。
- 極致の証(Class4/EX2等の追加強化)の対象か否か、対象の場合の内容は未確認。
