---
id: "fire-ssr-limited-ixaba"
name_jp: "イクサバ"
name_en: "Ixaba"
weapon_id: "1040906400"
element: "火"
rarity: SSR
weapon_type: "刀"
series: "リミテッドシリーズ"
obtain: "リミテッドガチャ(グランデフェス)"
status: 下書き
last_updated: 2026-09-21
source: "gbf.wiki Cargo weaponsテーブル(r.jina.ai経由、2026-09-09取得) / GameWith https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/72189 (2026-09-21参照)。実機未確認。"
---

# イクサバ(Ixaba)
![イクサバ](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040906400.jpg)

## 概要

通常攻刃IIIと通常渾身を持つ火属性リミテッド刀。公開情報から骨格と数値を作った下書きで、実機のスキルID・効果表示は未確認。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ / 属性 / 武器種 | SSR / 火 / 刀 |
| 最大レベル / SLv上限 / 上限解放 | 150 / 15 / 4凸 |
| ステータス | Lv1: HP30/ATK502、Lv100: HP195/ATK3000、Lv150: HP236/ATK3620 |

## 武器スキル

### スキル1: 紅蓮の攻刃III

- skill_id: `626`(既存スキルカタログ由来、要実機照合)
- 解放レベル: Lv120で紅蓮の攻刃IIから強化
- 枠: 通常攻刃
- 数値: SLv1 8% / SLv10 17% / SLv15 22%(GameWith、要実機検証)
- 加護: アグニス・火六竜石の対象

### スキル2: 業火の渾身

- skill_id: `914`(既存スキルカタログ由来、要実機照合)
- 解放レベル: Lv150
- 枠: 通常渾身
- 数値: SLv15・加護なしでHP100% 9.56%、75% 5.34%、50% 3.10%、25% 2.23%。HP25%未満は0%(GameWith、要実機検証)
- 加護: アグニス・火六竜石の対象

## 奥義

- 名称: 無双閃++
- 公開情報: 火属性5.0倍、自身にクリティカル率UPと攻撃大幅UP。倍率・上限・ターン数は実機未検証。

## 計算機接続

- 武器ID・ステータスは公開Wikiカタログから選択可能。
- `skillSlots`は未接続。実機でskill_idを確認後に接続する。

## 未確認・要検証事項

- 武器詳細レスポンスによるskill_id、効果文、4凸Lv150+0ステータス。
- 渾身曲線・端数処理、覚醒タイプ別効果、奥義効果。
