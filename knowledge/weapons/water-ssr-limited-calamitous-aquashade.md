---
id: "water-ssr-limited-calamitous-aquashade"
name_jp: "水禍の麗傘"
name_en: "Calamitous Aquashade"
weapon_id: "1040315500"
element: "水"
rarity: SSR
weapon_type: "斧"
series: "リミテッドシリーズ"
obtain: "リミテッドガチャ(グランデフェス)"
status: 下書き
last_updated: 2026-09-21
source: "本家ルリアノート武器図鑑の通常表示(2026-09-21確認) / gbf.wiki Calamitous Aquashade / GameWith https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/359378 (2026-09-21参照)。skill_idと効果量は未確認。"
---

# 水禍の麗傘(Calamitous Aquashade)
![水禍の麗傘](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/1040315500.jpg)

## 概要

最大HP依存のEX攻刃・防御・ダメージ上限と通常神威を持つ水属性リミテッド斧。第1スキルの効果量はキャラごとのバトル開始時最大HPで決まると公開攻略情報で報告されている。

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ / 属性 / 武器種 | SSR / 水 / 斧 |
| 最大レベル / SLv上限 / 上限解放 | 150 / 15 / 4凸 |
| ステータス | Lv1: HP52/ATK400、Lv100: HP330/ATK2300、Lv150: HP400/ATK2775 |

## 武器スキル

### スキル1: コバルト・ヴァイタリティー

- skill_id: 未取得
- 本家図鑑表示: 「水属性キャラの最大HPが多いほど攻撃力/防御力/ダメージ上限上昇」
- 枠: EX攻刃 / 防御 / ダメージ上限(特殊)
- 数値: EX攻刃=`最大HP×0.045%`(1本上限40%)、防御=`最大HP×0.025%`(1本上限25%)、特殊枠上限=`最大HP×0.01%`(1本上限7%、合算20%)(GameWith、要実機検証)
- 発動条件: 水属性キャラ。バトル開始時の最大HPをキャラごとに参照するとされる
- 加護: 対象外

### スキル2: 水の神威

- skill_id: 未取得(同名スキルの実機確認済みIDは`366`だが、この武器では未照合)
- 解放レベル: Lv150
- 本家図鑑表示: 「水属性キャラの攻撃力と最大HPが上昇(小)」
- 枠: 通常攻刃 / 通常守護
- 数値: SLv15で攻撃力12%・最大HP12%(GameWith、要実機検証)
- 加護: ヴァルナ・水六竜石の対象

## 奥義

- 本家図鑑表示: 戦渦の霹靂「水属性ダメージ(特大)/水属性キャラにカウンター効果(被ダメージ/3回)」
- 公開攻略情報の4凸効果: 2倍カウンター3回と吸収(回復上限500)、各3ターン。要実機検証。

## 計算機接続

- 武器ID・ステータスは公開Wikiカタログから選択可能。
- `skillSlots`は未接続。最大HP参照タイミングを含む実機検証と`skill_id`確認後に接続する。

## 未確認・要検証事項

- この武器固有の`skill_id`、最大HP参照タイミング、複数本の合算・端数、奥義効果。
