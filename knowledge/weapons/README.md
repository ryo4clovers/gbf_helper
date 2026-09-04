# 武器 ナレッジ

グランブルーファンタジーの武器を1武器=1ファイルでまとめるカテゴリ。
将来のダメージ計算機・グリッド編成ツールの素材とするため、**スキルの系統・枠・スキルレベル別の数値**を重視する。

## 収集方針

- 対象は SSR。ユーザーが Network Recorder で武器詳細レスポンスを収集し `draft/武器/{シリーズ名}/` に配置 → シリーズ単位で一括処理する。当初は「編成価値の高い最上位のみ」だったが、2026-09-08 以降はマグナ/レガリア(マグナII)/マグナリバース等のグリッド武器も網羅対象に含める(ダメージ計算機の素材として方陣スキルの skill_id を揃えるため)。
- ステータスやスキル倍率は「まず実機の武器詳細レスポンスで骨格を作り、倍率・スキルレベル別の数値を gbf.wiki / GameWith から補完する」流れ(abilities カテゴリと同じ)。
- 数値が未取得の箇所は「要検証」と明記し、断定しない。

## ファイル一覧

全124ファイル。シリーズ→属性順。すべて `status: 下書き`(数値未検証)。

### セラフィックウェポン

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-seraphic-weapon.md](./fire-ssr-seraphic-weapon.md) | 赤き熾炎の剣 / Sword of Michael | 火 |
| [water-ssr-seraphic-weapon.md](./water-ssr-seraphic-weapon.md) | 美と慈愛の杖 / Wand of Gabriel | 水 |
| [earth-ssr-seraphic-weapon.md](./earth-ssr-seraphic-weapon.md) | 揺るがぬ大地の拳 / Gauntlet of Uriel | 土 |
| [wind-ssr-seraphic-weapon.md](./wind-ssr-seraphic-weapon.md) | 果てぬ風呼の魔弓 / Ring of Raphael | 風 |
| [light-ssr-seraphic-weapon.md](./light-ssr-seraphic-weapon.md) | 永遠の知識求る竪琴 / Harp of the Teachers | 光 |
| [dark-ssr-seraphic-weapon.md](./dark-ssr-seraphic-weapon.md) | 闇の子の歯牙 / Scythe of Belial | 闇 |

### リミテッドシリーズ

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-limited-benedia.md](./fire-ssr-limited-benedia.md) | ベネディーア / Benedia | 火 |

### 終末の神器

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-dark-opus-scythe-magna.md](./fire-ssr-dark-opus-scythe-magna.md) | 永遠拒絶の大鎌 / Dark Opus Axe (Magna) | 火 |
| [fire-ssr-dark-opus-scythe-normal.md](./fire-ssr-dark-opus-scythe-normal.md) | 絶対否定の大鎌 / Dark Opus Axe (Normal ATK) | 火 |
| [water-ssr-dark-opus-cane-magna.md](./water-ssr-dark-opus-cane-magna.md) | 永遠拒絶の杖 / Dark Opus Cane (Magna) | 水 |
| [water-ssr-dark-opus-cane-normal.md](./water-ssr-dark-opus-cane-normal.md) | 絶対否定の杖 / Dark Opus Cane (Normal ATK) | 水 |
| [earth-ssr-dark-opus-harp-magna.md](./earth-ssr-dark-opus-harp-magna.md) | 永遠拒絶の竪琴 / Dark Opus Harp (Magna) | 土 |
| [earth-ssr-dark-opus-harp-normal.md](./earth-ssr-dark-opus-harp-normal.md) | 絶対否定の竪琴 / Dark Opus Harp (Normal ATK) | 土 |
| [wind-ssr-dark-opus-spear-magna.md](./wind-ssr-dark-opus-spear-magna.md) | 永遠拒絶の槍 / Dark Opus Spear (Magna) | 風 |
| [wind-ssr-dark-opus-spear-normal.md](./wind-ssr-dark-opus-spear-normal.md) | 絶対否定の槍 / Dark Opus Spear (Normal ATK) | 風 |
| [light-ssr-dark-opus-sword-magna.md](./light-ssr-dark-opus-sword-magna.md) | 永遠拒絶の剣 / Dark Opus Sword (Magna) | 光 |
| [light-ssr-dark-opus-sword-normal.md](./light-ssr-dark-opus-sword-normal.md) | 絶対否定の剣 / Dark Opus Sword (Normal ATK) | 光 |
| [dark-ssr-dark-opus-katana-magna.md](./dark-ssr-dark-opus-katana-magna.md) | 永遠拒絶の太刀 / Dark Opus Katana (Magna) | 闇 |
| [dark-ssr-dark-opus-katana-normal.md](./dark-ssr-dark-opus-katana-normal.md) | 絶対否定の太刀 / Dark Opus Katana (Normal ATK) | 闇 |

### 破壊の標

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-versacia-sword.md](./fire-ssr-versacia-sword.md) | 万象尽滅の宝剣 / Versacia Sword (Fire) | 火 |
| [water-ssr-versacia-dagger.md](./water-ssr-versacia-dagger.md) | 万象尽滅の鋭刃 / Versacia Dagger (Water) | 水 |
| [earth-ssr-versacia-spear.md](./earth-ssr-versacia-spear.md) | 万象尽滅の三又槍 / Versacia Spear (Earth) | 土 |
| [wind-ssr-versacia-fist.md](./wind-ssr-versacia-fist.md) | 万象尽滅の鎧腕 / Versacia Fist (Wind) | 風 |
| [light-ssr-versacia-bow.md](./light-ssr-versacia-bow.md) | 万象尽滅の貫弓 / Versacia Bow (Light) | 光 |
| [dark-ssr-versacia-harp.md](./dark-ssr-versacia-harp.md) | 万象尽滅の楽弦 / Versacia Harp (Dark) | 闇 |

### ドラゴニックウェポン・オリジン

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-draconic-origin-harp.md](./fire-ssr-draconic-origin-harp.md) | 雄渾と灼熱の調べ / Draconic Harp (Origin) | 火 |
| [water-ssr-draconic-origin-axe.md](./water-ssr-draconic-origin-axe.md) | 溟渤と激流の裁き / Draconic Axe (Origin) | 水 |
| [earth-ssr-draconic-origin-bow.md](./earth-ssr-draconic-origin-bow.md) | 豊穣と恩愛の寿ぎ / Draconic Bow (Origin) | 土 |
| [wind-ssr-draconic-origin-cane.md](./wind-ssr-draconic-origin-cane.md) | 狂飆と至高の祈り / Draconic Cane (Origin) | 風 |
| [light-ssr-draconic-origin-katana.md](./light-ssr-draconic-origin-katana.md) | 叡智と廻生の煌き / Draconic Katana (Origin) | 光 |
| [dark-ssr-draconic-origin-gun.md](./dark-ssr-draconic-origin-gun.md) | 暁闇と葬送の蝕み / Draconic Gun (Origin) | 闇 |

### 新世界の礎

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-nwf-heat-of-the-sun.md](./fire-ssr-nwf-heat-of-the-sun.md) | ヒート・オブ・ザ・サン / Heat of The Sun | 火 |
| [fire-ssr-nwf-kiss-of-the-devil.md](./fire-ssr-nwf-kiss-of-the-devil.md) | キス・オブ・ザ・デビル / Kiss of The Devil | 火 |
| [water-ssr-nwf-reflection-of-the-moon.md](./water-ssr-nwf-reflection-of-the-moon.md) | リフレクト・オブ・ザ・ムーン / Reflection of The Moon | 水 |
| [water-ssr-nwf-rise-of-justice.md](./water-ssr-nwf-rise-of-justice.md) | ライズ・オブ・ジャスティス / Rise of Justice | 水 |
| [earth-ssr-nwf-binds-of-the-hanged-man.md](./earth-ssr-nwf-binds-of-the-hanged-man.md) | タイ・オブ・ザ・ハングドマン / Binds of The Hanged Man | 土 |
| [earth-ssr-nwf-collapse-of-the-tower.md](./earth-ssr-nwf-collapse-of-the-tower.md) | クラッシュ・オブ・ザ・タワー / Collapse of The Tower | 土 |
| [wind-ssr-nwf-melody-of-judgement.md](./wind-ssr-nwf-melody-of-judgement.md) | メロディ・オブ・ジャッジメント / Melody of Judgement | 風 |
| [wind-ssr-nwf-theater-of-temperance.md](./wind-ssr-nwf-theater-of-temperance.md) | プレイ・オブ・テンペランス / Theater of Temperance | 風 |
| [light-ssr-nwf-shooting-of-the-star.md](./light-ssr-nwf-shooting-of-the-star.md) | ショット・オブ・ザ・スター / Shooting of The Star | 光 |
| [dark-ssr-nwf-pain-of-death.md](./dark-ssr-nwf-pain-of-death.md) | ペイン・オブ・デス / Pain of Death | 闇 |

### アストラルウェポン

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-astral-axe.md](./fire-ssr-astral-axe.md) | ソル・レムナント / Sol Remnant | 火 |
| [water-ssr-astral-sword.md](./water-ssr-astral-sword.md) | フェイトレス / Fateless | 水 |
| [earth-ssr-astral-staff.md](./earth-ssr-astral-staff.md) | ユグドラシル・ブランチ / Yggdrasil's Bough | 土 |
| [wind-ssr-astral-harp.md](./wind-ssr-astral-harp.md) | イノセント・ラヴ / Innocent Love | 風 |
| [light-ssr-astral-spear.md](./light-ssr-astral-spear.md) | ロンゴミニアド / Rhongomyniad | 光 |
| [dark-ssr-astral-fist.md](./dark-ssr-astral-fist.md) | 黒銀の滅爪 / Claws of Terror | 闇 |

### バハムートウェポン

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [dark-ssr-bahamut-axe.md](./dark-ssr-bahamut-axe.md) | バハムートアクス・フツルス / Axe of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-bow.md](./dark-ssr-bahamut-bow.md) | バハムートボウ・フツルス / Bow of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-dagger.md](./dark-ssr-bahamut-dagger.md) | バハムートダガー・フツルス / Dagger of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-fist.md](./dark-ssr-bahamut-fist.md) | バハムートナックル・フツルス / Fist of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-gun.md](./dark-ssr-bahamut-gun.md) | バハムートマズル・フツルス / Pistol of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-harp.md](./dark-ssr-bahamut-harp.md) | バハムートハープ・フツルス / Harp of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-katana.md](./dark-ssr-bahamut-katana.md) | バハムートブレイド・フツルス / Blade of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-spear.md](./dark-ssr-bahamut-spear.md) | バハムートスピア・フツルス / Spear of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-staff.md](./dark-ssr-bahamut-staff.md) | バハムートスタッフ・フツルス / Staff of Bahamut Fyutlus | 闇 |
| [dark-ssr-bahamut-sword.md](./dark-ssr-bahamut-sword.md) | バハムートソード・フツルス / Sword of Bahamut Fyutlus | 闇 |

### オメガウェポン

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [omega-ssr-sword.md](./omega-ssr-sword.md) | オメガスウォード / Ultima Sword | 火 |

### マグナシリーズ

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-magna-colossus-blade.md](./fire-ssr-magna-colossus-blade.md) | コロッサスブレード・マグナ | 火 |
| [fire-ssr-magna-colossus-cane.md](./fire-ssr-magna-colossus-cane.md) | コロッサスケーン・マグナ / Colossus Cane Omega | 火 |
| [fire-ssr-magna-colossus-carbine.md](./fire-ssr-magna-colossus-carbine.md) | コロッサスカービン・マグナ | 火 |
| [fire-ssr-magna-colossus-fist.md](./fire-ssr-magna-colossus-fist.md) | コロッサスフィスト・マグナ | 火 |
| [water-ssr-magna-levian-bow.md](./water-ssr-magna-levian-bow.md) | レヴィアンボウ・マグナ | 水 |
| [water-ssr-magna-levian-gaze.md](./water-ssr-magna-levian-gaze.md) | レヴィアンゲイズ・マグナ | 水 |
| [water-ssr-magna-levian-scepter.md](./water-ssr-magna-levian-scepter.md) | レヴィアンセプター・マグナ | 水 |
| [water-ssr-magna-levian-spear.md](./water-ssr-magna-levian-spear.md) | レヴィアンスピア・マグナ | 水 |
| [earth-ssr-magna-yggdrasil-crystal-blade.md](./earth-ssr-magna-yggdrasil-crystal-blade.md) | 世界樹の晶剣・マグナ | 土 |
| [wind-ssr-magna-tiamat-amood.md](./wind-ssr-magna-tiamat-amood.md) | ティアマトアムード・マグナ | 風 |
| [wind-ssr-magna-tiamat-bolt.md](./wind-ssr-magna-tiamat-bolt.md) | ティアマトボルト・マグナ | 風 |
| [wind-ssr-magna-tiamat-gauntlet.md](./wind-ssr-magna-tiamat-gauntlet.md) | ティアマトガントレ・マグナ | 風 |
| [light-ssr-magna-chevalier-bhuj.md](./light-ssr-magna-chevalier-bhuj.md) | シュヴァリエブージ・マグナ | 光 |
| [light-ssr-magna-chevalier-bolt.md](./light-ssr-magna-chevalier-bolt.md) | シュヴァリエボルト・マグナ | 光 |
| [light-ssr-magna-chevalier-harp.md](./light-ssr-magna-chevalier-harp.md) | シュヴァリエハープ・マグナ | 光 |
| [light-ssr-magna-chevalier-sword.md](./light-ssr-magna-chevalier-sword.md) | シュヴァリエソード・マグナ | 光 |
| [dark-ssr-magna-celeste-claw.md](./dark-ssr-magna-celeste-claw.md) | セレストクロー・マグナ | 闇 |
| [dark-ssr-magna-celeste-harp.md](./dark-ssr-magna-celeste-harp.md) | セレストハープ・マグナ | 闇 |
| [dark-ssr-magna-celeste-horn.md](./dark-ssr-magna-celeste-horn.md) | セレストホーン・マグナ | 闇 |
| [dark-ssr-magna-celeste-zaghnal.md](./dark-ssr-magna-celeste-zaghnal.md) | セレストザグナル・マグナ | 闇 |

### レガリアシリーズ

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-regalia-brahman-gauntlet.md](./fire-ssr-regalia-brahman-gauntlet.md) | ブラフマンガントレ | 火 |
| [fire-ssr-regalia-brahman-scimitar.md](./fire-ssr-regalia-brahman-scimitar.md) | ブラフマンシミター | 火 |
| [fire-ssr-regalia-brahman-trident.md](./fire-ssr-regalia-brahman-trident.md) | ブラフマントライデント | 火 |
| [fire-ssr-regalia-nilakantha.md](./fire-ssr-regalia-nilakantha.md) | ニーラカンタ | 火 |
| [water-ssr-regalia-spirit-of-mana.md](./water-ssr-regalia-spirit-of-mana.md) | スピリット・オブ・マナ | 水 |
| [water-ssr-regalia-tyros-bow.md](./water-ssr-regalia-tyros-bow.md) | テュロスボウ | 水 |
| [water-ssr-regalia-tyros-vignette.md](./water-ssr-regalia-tyros-vignette.md) | テュロスビネット | 水 |
| [water-ssr-regalia-tyros-wand.md](./water-ssr-regalia-tyros-wand.md) | テュロスワンド | 水 |
| [earth-ssr-regalia-gokushinken.md](./earth-ssr-regalia-gokushinken.md) | 極神剣 | 土 |
| [earth-ssr-regalia-nibelung-horn.md](./earth-ssr-regalia-nibelung-horn.md) | ニーベルン・ホルン | 土 |
| [earth-ssr-regalia-nibelung-klinge.md](./earth-ssr-regalia-nibelung-klinge.md) | ニーベルン・クリンゲ | 土 |
| [earth-ssr-regalia-nibelung-messer.md](./earth-ssr-regalia-nibelung-messer.md) | ニーベルン・メッサー | 土 |
| [wind-ssr-regalia-kiragosensen.md](./wind-ssr-regalia-kiragosensen.md) | 輝羅煌閃杖 | 風 |
| [wind-ssr-regalia-last-storm-blade.md](./wind-ssr-regalia-last-storm-blade.md) | ラストストームブレイド | 風 |
| [wind-ssr-regalia-last-storm-harp.md](./wind-ssr-regalia-last-storm-harp.md) | ラストストームハープ | 風 |
| [wind-ssr-regalia-last-storm-lance.md](./wind-ssr-regalia-last-storm-lance.md) | ラストストームランス | 風 |
| [light-ssr-regalia-mithra-bow.md](./light-ssr-regalia-mithra-bow.md) | ミトロンの弓 | 光 |
| [light-ssr-regalia-mithra-gauntlet.md](./light-ssr-regalia-mithra-gauntlet.md) | ミトロンの籠手 | 光 |
| [light-ssr-regalia-mithra-sword.md](./light-ssr-regalia-mithra-sword.md) | ミトロンの宝剣 | 光 |
| [light-ssr-regalia-pillar-of-flame.md](./light-ssr-regalia-pillar-of-flame.md) | 炎の柱 | 光 |
| [dark-ssr-regalia-abyss-rook.md](./dark-ssr-regalia-abyss-rook.md) | アビスルック | 闇 |
| [dark-ssr-regalia-abyss-spine.md](./dark-ssr-regalia-abyss-spine.md) | アビススパイン | 闇 |
| [dark-ssr-regalia-abyss-striker.md](./dark-ssr-regalia-abyss-striker.md) | アビスストライカー | 闇 |
| [dark-ssr-regalia-zechariah.md](./dark-ssr-regalia-zechariah.md) | ゼカリヤ | 闇 |

### マグナ・リバースシリーズ

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-magna-reverse-colossus-bomber-ira.md](./fire-ssr-magna-reverse-colossus-bomber-ira.md) | コロッサスボンバー・イラ | 火 |
| [fire-ssr-magna-reverse-colossus-buster-ira.md](./fire-ssr-magna-reverse-colossus-buster-ira.md) | コロッサスバスター・イラ | 火 |
| [fire-ssr-magna-reverse-colossus-cane-ira.md](./fire-ssr-magna-reverse-colossus-cane-ira.md) | コロッサスケーン・イラ | 火 |
| [water-ssr-magna-reverse-levian-blade-mare.md](./water-ssr-magna-reverse-levian-blade-mare.md) | レヴィアンブレード・マレ | 水 |
| [water-ssr-magna-reverse-levian-gaze-mare.md](./water-ssr-magna-reverse-levian-gaze-mare.md) | レヴィアンゲイズ・マレ | 水 |
| [water-ssr-magna-reverse-levian-head-mare.md](./water-ssr-magna-reverse-levian-head-mare.md) | レヴィアンヘッド・マレ | 水 |
| [earth-ssr-magna-reverse-yggdrasil-crystal-blade-arbos.md](./earth-ssr-magna-reverse-yggdrasil-crystal-blade-arbos.md) | 世界樹の晶剣・アルボス | 土 |
| [earth-ssr-magna-reverse-yggdrasil-string-arbos.md](./earth-ssr-magna-reverse-yggdrasil-string-arbos.md) | 世界樹の雫弦・アルボス | 土 |
| [earth-ssr-magna-reverse-yggdrasil-trunk-arbos.md](./earth-ssr-magna-reverse-yggdrasil-trunk-arbos.md) | 世界樹の幹甲・アルボス | 土 |
| [wind-ssr-magna-reverse-tiamat-bolt-aura.md](./wind-ssr-magna-reverse-tiamat-bolt-aura.md) | ティアマトボルト・アウラ | 風 |
| [wind-ssr-magna-reverse-tiamat-edge-aura.md](./wind-ssr-magna-reverse-tiamat-edge-aura.md) | ティアマトエッジ・アウラ | 風 |
| [wind-ssr-magna-reverse-tiamat-shot-aura.md](./wind-ssr-magna-reverse-tiamat-shot-aura.md) | ティアマトシュート・アウラ | 風 |
| [light-ssr-magna-reverse-chevalier-bolt-credo.md](./light-ssr-magna-reverse-chevalier-bolt-credo.md) | シュヴァリエボルト・クレド | 光 |
| [light-ssr-magna-reverse-chevalier-lance-credo.md](./light-ssr-magna-reverse-chevalier-lance-credo.md) | シュヴァリエランス・クレド | 光 |
| [light-ssr-magna-reverse-chevalier-saber-credo.md](./light-ssr-magna-reverse-chevalier-saber-credo.md) | シュヴァリエセイバー・クレド | 光 |
| [dark-ssr-magna-reverse-celeste-dagger-aeter.md](./dark-ssr-magna-reverse-celeste-dagger-aeter.md) | セレストダガー・アーテル | 闇 |
| [dark-ssr-magna-reverse-celeste-grace-aeter.md](./dark-ssr-magna-reverse-celeste-grace-aeter.md) | セレストグレース・アーテル | 闇 |
| [dark-ssr-magna-reverse-celeste-saber-aeter.md](./dark-ssr-magna-reverse-celeste-saber-aeter.md) | セレストセイバー・アーテル | 闇 |

### 禁禍武器

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-verboten-spear.md](./fire-ssr-verboten-spear.md) | 禁栄の禍槍 / Verboten Spear (Fire) | 火 |

### 英雄武器

| ファイル | 武器名 | 属性 |
| --- | --- | --- |
| [fire-ssr-job-chrysaor.md](./fire-ssr-job-chrysaor.md) | ヴァッサーシュパイアー / Wasserspeier | 火 |
| [water-ssr-job-boogeyman.md](./water-ssr-job-boogeyman.md) | ルクス・イン・デネブリス / Lux in Tenebris | 水 |
| [earth-ssr-job-monk.md](./earth-ssr-job-monk.md) | 金砕棒 / Kanabo | 土 |

## 命名規則

- ファイル名(= frontmatter `id`)は `{属性}-{レアリティ}-{識別名}` の kebab-case。例: `fire-ssr-seraphic-weapon`、`wind-ssr-tenseiki-katana`。
- 同シリーズで全属性版がある武器(セラフィック等)は属性で区別できるため識別名にシリーズ名を使う。個体名で区別が必要な場合は識別名にローマ字名を使う。
- ジョブ専用の英雄武器(`job_weapon` = true)は識別名を `job-{ジョブ英名kebab}` とする。例: `fire-ssr-job-chrysaor`。属性は作成時選択のため代表個体のものを `element` に置く。
- frontmatter `weapon_id` にはゲーム内の武器 `master_id`(実機レスポンス `master.id`。数値文字列)。
- サムネイル画像は `weapon_id` から機械的に組み立てる。見出し(`# {武器名}({英名})`)の直後に貼る:
  - 低解像度(既定): `https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/{weapon_id}.jpg`
  - 中解像度: 上の `img_low` を `img` に置換 / 大サイズ: さらに `weapon/m/` を `weapon/ls/` に置換

## 実機「武器詳細」レスポンスのフィールド対応

ユーザーが実機の武器詳細画面で取得する JSON の主なフィールド:

| レスポンス | 意味 | テンプレの反映先 |
| --- | --- | --- |
| `master.id` | 武器 master_id | frontmatter `weapon_id` |
| `master.name` | 武器名 | `name_jp` |
| `master.attribute` | 属性コード(下表) | `element` |
| `master.rarity` | レアリティコード(下表) | `rarity` |
| `master.kind` | 武器種コード(下表) | `weapon_type` |
| `master.series_id` / `series_name` | シリーズ | `series` |
| `master.max_evolution_level` | 上限解放段階数 | 基本情報「上限解放段階」 |
| `master.max_weapon_skill_level` | スキルレベル上限 | 基本情報「スキルレベル上限」 |
| `param.attack` / `param.hp` | **その所持インスタンスの現在値**(Lv・スキルLv・凸・+ を反映済み) | ステータス表(+値は除いた素の値で) |
| `param.bonus_attack` / `param.bonus_hp` | + による増分 | ステータス表には含めない |
| `param.level` / `max_level` | レベル | ステータス表 |
| `param.evolution` | 現在の上限解放段階 | ステータス表の段階 |
| `param.arousal.is_arousal_weapon` | 覚醒対応シリーズか(リミテッド等) | 「覚醒」セクション有無 |
| `param.arousal.form` / `form_name` | 現在選択中の覚醒タイプ(攻撃/防御/連撃/回復/奥義/スキルダメージ 等) | 「覚醒」セクション |
| `param.arousal.level` / `max_level` | 現在の覚醒Lv / 上限(リミテッド等は通常4、ClassV英雄武器は15)。ClassV英雄武器は最大Lvで固有スキルを習得(`arousal.skill[].acquired_awakening_level`)、`release_conditions` に武器Lv200 等の条件 | 「覚醒」セクション |
| `param.arousal.total_bonus` | 各覚醒Lvで**追加**されるボーナスの内訳(`name` 攻刃/D上限 等、`effect_value`) | 覚醒タイプ別効果の「Lv別内訳」 |
| `param.arousal.skill[]` | 現タイプ・現Lvでの実効果(`skill_id` / `name` / `comment` / `effect_value`) | 覚醒タイプ別効果 |
| `param.odiant` | **退魔(オーディアント)** — `is_odiant_weapon` = true は禁禍武器。`exorcision_level` / `max_exorcision_level`(退魔Lv)、`reduction_effect_value`(デメリット軽減値)。禁禍武器のデメリットスキルを軽減する | 「退魔」セクション |
| `param.level` / `max_level` | 最大150 / 200 / 250。200・250 は超越 | 「超越」セクション |
| `param.phase` | 超越段階(0〜5) | 「超越」セクション |
| `master.max_evolution_level` / `param.evolution` | 上限解放段階数 / 現在段階(超越込みで 5〜6 になる) | 「基本情報」「超越」 |
| `master.over_evolution_type` / `awakening_phase` | 5★以上・特殊上限解放のマーカー | 「超越」「上限解放」 |
| `can_release_transcendence` / `transcendence_pu_flag` | さらに超越解放できるか / 超越強化を持つか | 「超越」セクション |
| `special_skill.name` / `.comment` | 奥義(`＋` `＋＋` は上限解放での進化形。「スキルに応じた追加効果」は選択スキル連動) | 「奥義」セクション |
| `skill1`〜`skill4` の `skill_id` / `name` / `comment` / `level.release_level` | 武器スキル(`release_level` = 解放される武器Lv、文字列/数値どちらもあり) | 「武器スキル」セクション(`skill_id` は名寄せキー) |
| `skillN_display` | 表示スロットのフラグ(0/1)。**空スロットでも 1、逆に有効スロットでも 0 のことがある(終末の第2スキル=0)。スキル有無の判定は `skillN.skill_id` の null 判定で行う** | — |
| `bullet_info.set_bullets` | 銃(kind=6)のバレットスロット(`max_set_count` / 各 `bullet_N.slot_type`) | 「バレット」セクション |
| `limit` | 配列 `[]`(なし)または オブジェクト `{ display_comment }`(装備制限文)。**文言が「[A]と[B]の武器は、いずれかひとつだけ」でも A と B が相互排他とは限らない** — 実ルールは [../mechanics/team-building-basics.md](../mechanics/team-building-basics.md)(同一シリーズ1本まで、ドラゴニックのみ無印+オリジン合算1本) | 「上限解放・強化要素」の装備制限 |
| `augment_id_list`(例 "44:84")/ `augment_skill`(2次元配列)/ `param.augment_image` | `augment_skill[0][]` の各要素に `skill_id` / `name` / `comment` / `level` / `effect_value`(例 "+7%")/ `depth`。**通常AUG(エレメント)**= プレイヤー付与の追加効果(奥義ダメージ・渾身・攻撃力・連撃 等、マグナ/アンセスタル/プライマル対象)。**禁禍武器のデメリットスキル**= ドロップ時ランダム付与の不利効果(毎ターンダメージ等、`depth` を持ち退魔Lvで軽減) | 「AUG / デメリットスキル」セクション |
| `omega`(=オメガウェポン/Ultima)/ `moon` / `is_xeno_weapon` / `job_weapon` / `is_rusted_weapon` / `is_origin_numbers_weapon` / `series_id` | 武器カテゴリ判定フラグ | 「編成での役割」(グリッド分類) |
| `job_weapon` / `job_weapon_category` / `unique_weapon[]` / `master.change_attribute` | **英雄武器(ジョブ専用、`series_id` 19)**。`job_weapon` = true。`job_weapon_category`(例 "104")はコンパニオンウェポン系のみ入り、多くは空配列。`unique_weapon[]` = `{name, image}` はこの武器の特殊形態名(例: コンパニオンウェポン「クリュサオル」/ ジョブ名そのまま)。`change_attribute` = "1" は作成後も属性変更可(ClassV系で確認)、"" は不可。`master.archaic` = "1"(刷新後)。スキルレベルは固定(`max_weapon_skill_level` 1)。売却・分解不可 | 「ジョブ専用武器」セクション |

**注意**: 武器詳細レスポンスは所持インスタンス固有情報(+値・スキルレベル・所持数・編成使用中フラグ等)を含む。ナレッジには武器定義に関わる部分だけを反映し、生レスポンスは `tools/network-recorder/captures/`(git管理外)に保存する。

### コード表

| 属性 `attribute` | 1 火 / 2 水 / 3 土 / 4 風 / 5 光 / 6 闇 |
| --- | --- |
| **レアリティ `rarity`** | 2 R / 3 SR / 4 SSR |
| **武器種 `kind`** | 1 剣(確認済) / 2 短剣 / 3 槍(確認済) / 4 斧(確認済) / 5 杖(確認済) / 6 銃(確認済) / 7 格闘 / 8 弓 / 9 楽器(確認済) / 10 刀(未確認分はジョブの `weapon1/2` コードと同じと推定) |
| **シリーズ `series_id`** | 1 セラフィックウェポン / 2 リミテッドシリーズ / 3 終末の神器(gbf.wiki: Dark Opus)/ 7 レガリアシリーズ(マグナII)/ 8 マグナシリーズ(旧マグナ。gbf.wiki: Omega)/ 13 オメガウェポン(gbf.wiki: Ultima)/ 14 バハムートウェポン / 19 英雄武器(ジョブ専用。gbf.wiki: Class Champion Weapons)/ 26 アストラルウェポン / 30 新世界の礎(賢者/Evoker武器。gbf.wiki: New World Foundation Weapons)/ 40 ドラゴニックウェポン・オリジン / 42 マグナ・リバースシリーズ(マグナIII)/ 44 破壊の標(ヴェルサシア武器)/ 45 禁禍武器(gbf.wiki: Verboten)。連番ではないので実例で確認する |
| **`master.archaic`** | "1" = 刷新/進化後の形態のマーカー(セラフィック刷新版・ドラゴニックオリジンで確認)。進化前は取得不可のことがある |
| **`omega`(真偽値)** | true = **オメガウェポン(gbf.wiki『Ultima Weapons』)シリーズ**のフラグ。「マグナグリッド全般」の意味ではない |
| **`master.attribute`(オメガ)** | オメガウェポンは作成時に属性を選択(実質属性変更可能)。`attribute` はその選択結果。ファイルは武器種単位(`omega-ssr-{type}`)、`element` は代表個体のもの |

## スキル系統(damage-calc 用の軸)

武器スキルはダメージ計算上、系統(表示名)と枠(乗算グループ)で分類する。代表例:

- **攻刃系**: 通常攻刃(通常乗算枠 / 神石グリッドで乗る)、方陣攻刃(マグナ枠 / マグナグリッドで乗る。skill image に `_m_`)、神威(EX枠)、覚醒(神石で強化される枠)…
- **Exスキル**: マグナ/アンセスタル(六竜)/プライマル/オールドプライマルの武器は、ドロップ時にランダム抽選される追加スキルが skill2 以降に付くことがある(方陣HP・方陣三手〈連撃〉・方陣背水・無属性攻刃 等)。個体差。
- **AUG(エレメント)**: プレイヤーが素材で付与する別枠の追加効果(`augment_skill`)。Exスキルとは別。
- **特殊補正**: 背水(HPが低いほどUP)、渾身(HPが高いほどUP)、克己、技巧、真価、進境/プログレッション(経過ターンでUP)、神醒/神威(EX攻刃+守護の複合)…
- **守護・治癒・連撃・追撃・ダメージ上限(通常/アビ/奥義/CB)・クリティカル・与ダメージ上昇** など。
- **同一武器の「通常版」と「方陣(マグナ)版」**: 終末の神器・ドラゴニックウェポン等は、第1スキルの攻刃が通常攻刃か方陣攻刃かで**別の武器(別 `weapon_id`・別名)**として存在する。skill1 の image 接尾辞 `_m_` が方陣版の目印。ファイルは `-normal` / `-magna` で分ける。

正確な枠の対応は [../mechanics/damage-calculation.md](../mechanics/damage-calculation.md)・[../mechanics/damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md) を参照。各武器ファイルではスキルごとに「系統/カテゴリ」「枠」を明記する。

## 運用ルール

- 各ファイルは [_template.md](./_template.md) の形式に沿う。該当しないセクション(覚醒・超越等)は省略してよい。
- 情報源・取得方法の詳細は [docs/data-collection-notes.md](../../docs/data-collection-notes.md)。
