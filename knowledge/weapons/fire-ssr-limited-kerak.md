---
id: "fire-ssr-limited-kerak"
name_jp: "ケラク"
name_en: "Kerak"
weapon_id: "1040812000"
element: "火"
rarity: SSR
weapon_type: "楽器"
series: "リミテッドシリーズ"
obtain: "リミテッドガチャ(グランデフェス)"
status: 下書き
last_updated: 2026-09-21
source: "gbf.wiki Cargo weaponsテーブル(r.jina.ai経由、2026-09-09取得) / GameWith https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/191452 (2026-09-21参照)。実機未確認。"
---

# ケラク(Kerak)
![ケラク](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040812000.jpg)

## 概要

通常進境と通常神威を持つ火属性リミテッド楽器。長期戦の属性攻撃力と攻撃・HPを同時に支える構成。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ / 属性 / 武器種 | SSR / 火 / 楽器 |
| 最大レベル / SLv上限 / 上限解放 | 150 / 15 / 4凸 |
| ステータス | Lv1: HP48/ATK416、Lv100: HP301/ATK2445、Lv150: HP364/ATK2952 |

## 武器スキル

### スキル1: 紅蓮の進境

- skill_id: 要実機確認
- 枠: 属性攻撃力
- 数値: SLv15は1ターンごと1.2%、最大15%、13ターン目に最大。合算上限75%(GameWith、要実機検証)
- 加護: アグニス・火六竜石の対象

### スキル2: 業火の神威

- skill_id: `764`(既存スキルカタログ由来、要実機照合)
- 解放レベル: Lv150
- 枠: 通常攻刃 + 武器スキルHP
- 数値: 攻撃・HPともSLv1 3% / SLv10 12% / SLv15 14.5%。HP上限400%(GameWith、要実機検証)
- 加護: アグニス・火六竜石の対象

## 奥義

- 名称: 浄刹焦土
- 公開情報: 火属性5.0倍、火属性キャラのダメージ上限15%UPと再生。実機未検証。

## 計算機接続

- 武器ID・ステータスは選択可能。`skillSlots`は未接続のため、進境・神威とも現在の試算へは未反映。

## 未確認・要検証事項

- 実skill_id、進境のターン計算・加護後端数、覚醒、奥義効果。
