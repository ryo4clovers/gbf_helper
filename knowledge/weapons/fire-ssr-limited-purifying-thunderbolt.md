---
id: "fire-ssr-limited-purifying-thunderbolt"
name_jp: "悪滅の雷"
name_en: "Purifying Thunderbolt"
weapon_id: "1040709000"
element: "火"
rarity: SSR
weapon_type: "弓"
series: "リミテッドシリーズ"
obtain: "リミテッドガチャ(グランデフェス)"
status: 下書き
last_updated: 2026-09-21
source: "本家ルリアノート武器図鑑の通常表示(2026-09-21確認) / gbf.wiki Cargo weaponsテーブル(r.jina.ai経由、2026-09-09取得) / GameWith https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/136479 (2026-09-21参照)。skill_idと効果量は未確認。"
---

# 悪滅の雷(Purifying Thunderbolt)
![悪滅の雷](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040709000.jpg)

## 概要

通常必殺と通常技巧を持つ火属性リミテッド弓。本家図鑑で武器ID・ステータス・スキル構成と効果文を確認済み。記載した効果量とskill_idは未確認。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ / 属性 / 武器種 | SSR / 火 / 弓 |
| 最大レベル / SLv上限 / 上限解放 | 150 / 15 / 4凸 |
| ステータス | Lv1: HP32/ATK508、Lv100: HP242/ATK2800、Lv150: HP295/ATK3373 |

## 武器スキル

### スキル1: 紅蓮の必殺

- skill_id: 要実機確認
- 本家図鑑表示: 「火属性キャラの奥義ダメージUP(大)/奥義ダメージ上限上昇(大)」
- 枠: 通常必殺(奥義ダメージ / 奥義ダメージ上限)
- 数値: 奥義ダメージはSLv1 5.5% / SLv10 10% / SLv15 12.5%、上限120%。奥義上限はSLv1 1.2% / SLv10 4.8% / SLv15 6.8%、上限75%(GameWith、要実機検証)
- 加護: アグニス・火六竜石の対象

### スキル2: 紅蓮の技巧

- skill_id: `86`(既存スキルカタログ由来、要実機照合)
- 解放レベル: Lv150
- 本家図鑑表示: 「火属性キャラのクリティカル確率上昇(大)」、習得Lv150
- 枠: 武器スキルクリティカル発動率
- 数値: SLv1 4.4% / SLv10 8% / SLv15 10%、上限100%、発動時ダメージ倍率+50%(GameWith、要実機検証)
- 加護: アグニス・火六竜石の対象

## 奥義

- 本家図鑑表示: ダガラハット「火属性ダメージ(特大)/自分のトリプルアタック確率UP/火属性追撃効果」
- 公開攻略情報: 火属性5.0倍、TA率15%UP・火属性20%追撃を奥義ターン含む4ターン。対象・数値・ターン数は要実機検証。

## 計算機接続

- 武器ID・ステータスは公開Wikiカタログから選択可能。
- `skillSlots`は未接続。必殺と技巧のskill_idを実機で確認後に接続する。

## 未確認・要検証事項

- 実skill_id、必殺・技巧の加護後端数、覚醒効果、奥義の数値と継続ターン。ルリアノート図鑑の`skill1`・`skill2`には数値IDが含まれない。
