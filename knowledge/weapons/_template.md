---
id: ""                 # ファイル名(拡張子なし)と完全一致させる。例: fire-ssr-seraphic-weapon
name_jp: ""
name_en: ""            # gbf.wiki 等の英語名。分からなければ空のまま
weapon_id: ""          # ゲーム内の武器 master_id(数値文字列、例: "1040017200")。実機レスポンス master.id
element: ""             # 火 | 水 | 土 | 風 | 光 | 闇 | 無属性
rarity: SSR            # SSR | SR | R
weapon_type: ""        # 剣 | 短剣 | 槍 | 斧 | 杖 | 銃 | 格闘 | 弓 | 楽器 | 刀
series: ""             # シリーズ名(例: セラフィックウェポン / ドラゴニックウェポン / 天星器 / オメガ〈マグナ〉/ 神石 / リミテッド / 十賢者 / 英雄武器〈ジョブ専用〉等)
obtain: ""             # 入手方法(ショップ交換 / 恒常ガチャ / リミテッドガチャ / マルチバトル / イベント 等)
status: 未着手         # 未着手 | 下書き | 検証済み
last_updated: YYYY-MM-DD
source: "要検証"       # 実機レスポンス取得日 / 参照した gbf.wiki・GameWith 等のURL+取得日
---

# {武器名}({英名})
![{武器名}](https://prd-game-a-granbluefantasy.akamaized.net/assets/img_low/sp/assets/weapon/m/{{weapon_id}}.jpg)

<!-- サムネイルは weapon_id から組み立てる。高解像度が必要なら `img/`(m: 中/ ls: 大)に差し替え可 -->

## 概要

(この武器の位置づけ・強みを1〜3行で。どの属性・どのグリッド〈オメガ/神石/特殊枠〉で使うか、主な採用理由)

<!-- 終末の神器・ドラゴニックウェポン等は、第1スキルの攻刃が「通常攻刃(神石向け)」か
     「方陣攻刃(マグナ向け)」かで別の武器(別 weapon_id・別名、skill1 image に `_m_`)。
     その場合ファイルを `{...}-normal` / `{...}-magna` に分け、概要で相互リンクする。 -->

## 基本情報

| 項目 | 内容 |
| --- | --- |
| レアリティ | {{rarity}} |
| 属性 | {{element}} |
| 武器種 | {{weapon_type}} |
| シリーズ | {{series}} |
| 入手方法 | {{obtain}} |
| 最大レベル | (例: 100 / 150 / 200〈超越〉) |
| スキルレベル上限 | (例: 10 / 15 / 20 / 25。`master.max_weapon_skill_level`。**1 の場合はスキルレベリング無し=固定値**) |
| 上限解放段階 | (例: 4凸〈max_evolution_level〉) |

## ステータス

<!-- 実機レスポンス param.attack / param.hp は「その所持インスタンスの現在値」なので、
     段階ごとの表を埋める際は最終上限解放・Lv最大・スキル最大・+0 の値を基準にする。
     bonus_attack / bonus_hp(+値ぶん)は含めない素の値を記載する。 -->

| 段階 | Lv | HP | ATK | 備考 |
| --- | --- | --- | --- | --- |
| 初期 | 1 | | | |
| 上限解放前・最大 | | | | |
| 最終上限解放・最大 | | | | |
| 超越(あれば) | | | | Lv上限ごとに追記 |

## 武器スキル

<!-- skill1〜skill4。実機レスポンスの各 skillN に name / skill_id / comment(効果文)がある。
     comment は効果の「種類」しか分からないことが多く、倍率・スキルレベル別の数値は
     gbf.wiki / GameWith から補完する。skill_id は名寄せキーとして必ず控える。
     終末の神器/ドラゴニックのように第2・第3スキルがプレイヤー選択式(ゴーフ・キー等)の武器は、
     レスポンスに「現在の選択」しか出ないので「選択式」と選択肢を明記する。
     マグナ/アンセスタル(六竜)/プライマル/オールドプライマルは、skill2 以降がドロップ時に
     ランダム抽選される「Exスキル」のことがある(方陣HP・方陣三手・方陣背水・無属性攻刃 等)。
     個体差なので「この個体のExスキル」と明記し、抽選プールが分かれば併記する。 -->

### スキル1: {スキル名}

- skill_id: (実機レスポンス skillN.skill_id)
- 解放レベル: (skillN.level.release_level。武器Lvいくつで解放/強化されるか)
- 選択式: いいえ / はい(はいの場合、選択手段〈ゴーフ・キー / アンクレット 等〉と選択肢一覧、現在の選択を記載)
- 系統/カテゴリ: (例: 攻刃〈通常攻刃〉/ 方陣攻刃〈オメガ〉/ 神威〈EX〉/ 背水 / 渾身 / 克己 / 技巧 / 守護 / 治癒 / 神醒 / 追撃 / 破壊属性追撃 / 特殊 …)
- 枠(frame): (ダメージ計算上の乗算枠。通常 / 別枠 / EX / オメガ / 神石 / アビ与ダメ 等。要検証で可)
- 効果: (実機 comment のまま + 補足)
- スキルレベル別の数値: (Lv1 / Lv10 / Lv15 / Lv20 / Lv25 等。gbf.wiki 出典。**スキルLv上限が1のシリーズ〈破壊の標等〉は固定値**。未取得なら「要検証」)
- 発動条件: (HP依存 / 得意武器数依存 / 常時 / **グリッドの攻刃効果量が合計◯◯%以上**〈comment の `◆` 以降〉 等)
- 出典:
- ステータス: 未検証

### スキル2: {スキル名}

- skill_id:
- 解放レベル:
- 選択式:
- 系統/カテゴリ:
- 枠(frame):
- 効果:
- スキルレベル別の数値:
- 発動条件:
- 出典:
- ステータス: 未検証

<!-- skill3 / skill4 は同じ形式で追加。スキル有無は skillN.skill_id が null かどうかで判定する
     (skillN_display は空スロットでも 1 のことがあり当てにならない)。 -->

## 奥義(チャージアタック)

- 名称: (実機レスポンス special_skill.name。上限解放で `＋` `＋＋` と進化する場合は最終形を記載)
- 効果: (special_skill.comment。属性ダメージ倍率〈小/中/大/特大/極大〉+ 追加効果)
- 数値/スケーリング: (奥義倍率・追加バフの%とターン。gbf.wiki 出典。未取得なら「要検証」)
- 進化段階: (無印 / ＋(◯凸) / ＋＋(◯凸) で効果が変わる場合は段階ごとに)
- 選択スキル連動(あれば): (終末等「スキルに応じた追加効果」の場合、第2スキルの選択で奥義追加効果が変わる旨)
- 出典:
- ステータス: 未検証

## ジョブ専用武器(英雄武器 / コンパニオンウェポン)

<!-- `job_weapon` = true / `series_id` = 19([英雄武器])のシリーズのみ。無い武器はセクション省略。
     各 ClassIV / エクストラII 等のジョブに1種、作成時に属性を選択する(実質属性変更可、属性ごとに別 weapon_id の可能性)。
     ・`job_weapon_category`: どのジョブの武器かを示すコード(例 "104")。ジョブ側 `job_id` とは別体系。
     ・`unique_weapon[]`: `{ name, image }`。この武器の「真の姿」名(例: クリュサオル)。コンパニオンウェポン等の特殊形態。
     ・`master.archaic` = "1": エンブレム適用後 / 刷新後の形態。
     ・スキルレベルは `max_weapon_skill_level` = 1 で固定(レベリング不可)。スキル強化は上限解放・エンブレム・ジョブ側の育成による。
     ・skill1 は「◆メイン装備時/主人公のみ」条件付きで、ジョブ固有アビリティの性能を強化することが多い。
     ・skill2 は「資質」= エンブレム枠。エンブレム未適用だと image `skill_blank`・効果文がプレースホルダー。適用でいずれかの発展形になる。
     ・`can_sell` / `can_decompose` = false(売却・分解不可)。`container.name` = "ジョブ武器"。 -->

- 対応: あり / なし(`job_weapon`)
- 対象ジョブ: (`job_weapon_category` = {コード} → ジョブ名。[../jobs/](../jobs/) の該当ファイルにリンク)
- 真の姿 / 特殊形態: (`unique_weapon[].name` / `image`。例: コンパニオンウェポン「クリュサオル」)
- 属性選択: 作成時に選択(`master.attribute` はその結果)
- エンブレム(`skill2` = 資質枠): (適用中のエンブレム名と効果。未適用なら「未適用」。推奨エンブレムがあれば注記)
- ジョブ側との連動: (skill1 が強化するジョブアビリティ名。`◆メイン装備時/主人公のみ` 等の条件)

## 覚醒(アローサル)

<!-- param.arousal.is_arousal_weapon = true のシリーズ(リミテッド等。無い武器はこのセクションごと省略)。
     覚醒タイプは武器ごとに選択・変更でき、レスポンスには「現在選択中のタイプ」しか出ない。
     全タイプを埋めるには各タイプに切り替えたレスポンスが必要。
     ・リミテッド等: max_level 4 前後。
     ・ClassV の英雄武器(job_weapon): max_level 15。Lv15 で固有スキル(`arousal.skill` の
       `acquired_awakening_level` = 15 のもの)を習得する。解放条件は `arousal.release_conditions`
       (例 condition_type "1" / value "200" = 武器Lv200 必須)。 -->

- 対応: あり / なし(`param.arousal.is_arousal_weapon`)
- 最大Lv: (`param.arousal.max_level`、例: 4 / ClassV英雄武器は 15)
- 解放条件: (`param.arousal.release_conditions`。例: 武器Lv200)
- 現在の取得状況(このインスタンス): タイプ「{form_name}」Lv{level}
- 最大Lv習得スキル(あれば): (`arousal.skill` で `acquired_awakening_level` が最大Lvのもの。`skill_id` / `name` / `comment`)

### 覚醒タイプ別効果

| タイプ | 最大Lv時の効果 | Lv別内訳 | 出典 |
| --- | --- | --- | --- |
| 攻撃 | (例: 攻刃+40% / ダメージ上限+5%) | (`total_bonus` の各Lv) | |
| 防御 | 要検証 | | |
| 連撃 | 要検証 | | |
| (その他: 回復 / 奥義 / スキルダメージ 等、武器による) | 要検証 | | |

<!-- 覚醒スキルの枠: 「攻刃」表記でも味方全体対象のことが多く、通常/方陣攻刃とは別の覚醒(EX系)枠。
     arousal.skill[].skill_id / name / effect_value / comment をそのまま控える。 -->

## バレット(銃のみ)

<!-- kind = 6(銃)の武器は bullet_info を持つ。ガンスリンガー / ソルジャーで、
     かつこの武器をメイン装備したときのみバレットの効果が発揮される。 -->

- バレットスロット数: (`bullet_info.set_bullets.max_set_count`、通常6)
- スロット種別: (各 `bullet_N.slot_type`。例: [2, 3, 2, 2, 3, 4] — スロットごとにセット可能なバレット種が制限される)
- 補足: 実効はガンスリンガー / ソルジャーのメイン武器時のみ。バレット個別のデータは別途(bullets カテゴリ未整備)。

## 超越(トランセンデンス)

<!-- 天星器 / 終末の神器 / ドラゴニック等で Lv150 超えの強化がある武器のみ。無い武器はセクションごと省略。
     実機: param.level が 200 / 250、master.max_evolution_level が 5〜6、param.phase(超越段階)、
     transcendence_pu_flag、master.awakening_phase。can_release_transcendence は「さらに解放できるか」。 -->

- 対応: あり / なし
- 最大レベル: (例: 200 / 250)
- 段階: (例: Lv200 で第3スキル解放、Lv200→250 は超越5段階で各スキルの数値強化・奥義に＋)
- 現在の取得状況(提供インスタンス): Lv{level} / evolution {evolution} / phase {phase}

## AUG / デメリットスキル(`augment_skill`)

<!-- `param.augment_id_list`(例 "44:84")と `augment_skill[0][]`。各要素に
     skill_id / name / comment / level / effect_value / depth。
     ・通常の AUG(エレメント): プレイヤーが素材で付与する追加効果(奥義ダメージ/渾身/攻撃力/連撃 等)。
     ・禁禍武器のデメリットスキル: ドロップ時にランダム付与される不利効果(毎ターンダメージ等)。
       `depth` を持ち、退魔Lv(下記)で軽減される。
     Exスキル(マグナ等が skill2 に持つランダム追加スキル)とは別物。 -->

- 付与状況(この個体): あり / なし
- 効果:
  - {name}(`skill_id` {id}、Lv{level}、{effect_value}、depth {depth})— {comment}(通常AUG / **デメリット**)
- 枠(frame): 通常AUGは別枠(EX/AUG枠)で乗る(要検証)

## 退魔(オーディアント)

<!-- `param.odiant.is_odiant_weapon` = true のシリーズ(禁禍武器)のみ。無い武器はセクション省略。
     禁禍武器のデメリットスキルを軽減するシステム。 -->

- 対応: あり / なし(`param.odiant.is_odiant_weapon`)
- 退魔Lv(この個体): {exorcision_level} / {max_exorcision_level}
- デメリット軽減値(`reduction_effect_value`): {値}(軽減量はランダム。デメリットスキルの `depth` が深いほど軽減量が多くなる傾向 — ユーザー談、要検証)

## 上限解放・強化要素

<!-- 該当しない項目はセクションごと省略してよい -->

- 上限解放: (各段階の解放内容。スキル追加・奥義進化〈＋/＋＋〉・Lv上限開放など)
- スキルレベル: (上げ方 / 上限。`master.max_weapon_skill_level`。第3スキルだけ上限が異なる場合は `max_weapon_skill_level_2` を注記)
- 装備制限(あれば): (`limit.display_comment` を引用。実際のルールは [../mechanics/team-building-basics.md](../mechanics/team-building-basics.md) 参照 — 基本は「同一シリーズは編成に1本まで」。ドラゴニックのみ強化前+オリジンで合算1本。マグナ/プライマル/禁禍等の通常グリッド武器は `limit: []` で制限なし。**display_comment が他シリーズ名を併記していても相互排他ではない**)

## 編成での役割

- 使用グリッド: (火オメガ / 火神石 / 特殊枠〈セラフィック等はグリッド外1本〉など)
- メイン装備時の恩恵: (奥義効果・スキル倍率アップ等)
- 同シリーズ/類似武器との使い分け:

## 関連トピック

- [damage-calculation.md](../mechanics/damage-calculation.md)
- [damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md)
- [team-building-basics.md](../mechanics/team-building-basics.md)

## 未確認・要検証事項

-
