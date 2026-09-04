# 武器 ナレッジ

グランブルーファンタジーの武器を1武器=1ファイルでまとめるカテゴリ。
将来のダメージ計算機・グリッド編成ツールの素材とするため、**スキルの系統・枠・スキルレベル別の数値**を重視する。

## 収集方針

- 対象は当面 **SSR の中でも編成価値の高い最上位のみ**(天星器 / セラフィック / ドラゴニック / アーカルム / リミテッド / 十賢者 / 各属性のグリッド主力 等)。収集対象リストはユーザーが指定する。
- ステータスやスキル倍率は「まず実機の武器詳細レスポンスで骨格を作り、倍率・スキルレベル別の数値を gbf.wiki / GameWith から補完する」流れ(abilities カテゴリと同じ)。
- 数値が未取得の箇所は「要検証」と明記し、断定しない。

## ファイル一覧

| ファイル | 武器名 | 属性 | シリーズ | ステータス |
| --- | --- | --- | --- | --- |
| [fire-ssr-seraphic-weapon.md](./fire-ssr-seraphic-weapon.md) | 赤き熾炎の剣 / Sword of Michael | 火 | セラフィックウェポン | 下書き |
| [fire-ssr-limited-benedia.md](./fire-ssr-limited-benedia.md) | ベネディーア / Benedia | 火 | リミテッドシリーズ | 下書き |

## 命名規則

- ファイル名(= frontmatter `id`)は `{属性}-{レアリティ}-{識別名}` の kebab-case。例: `fire-ssr-seraphic-weapon`、`wind-ssr-tenseiki-katana`。
- 同シリーズで全属性版がある武器(セラフィック等)は属性で区別できるため識別名にシリーズ名を使う。個体名で区別が必要な場合は識別名にローマ字名を使う。
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
| `param.arousal.level` / `max_level` | 現在の覚醒Lv / 上限(通常4) | 「覚醒」セクション |
| `param.arousal.total_bonus` | 各覚醒Lvで**追加**されるボーナスの内訳(`name` 攻刃/D上限 等、`effect_value`) | 覚醒タイプ別効果の「Lv別内訳」 |
| `param.arousal.skill[]` | 現タイプ・現Lvでの実効果(`skill_id` / `name` / `comment` / `effect_value`) | 覚醒タイプ別効果 |
| `param.odiant` | オーディアント/祓い(exorcision_level) | 「オーディアント」セクション |
| `can_release_transcendence` / `transcendence_*` | 超越(Lv100→200) | 「超越」セクション |
| `special_skill.name` / `.comment` | 奥義(`＋` `＋＋` は上限解放での進化形) | 「奥義」セクション |
| `skill1`〜`skill4` の `skill_id` / `name` / `comment` / `level.release_level` | 武器スキル(`release_level` = 解放される武器Lv) | 「武器スキル」セクション(`skill_id` は名寄せキー) |
| `skillN_display` | 表示スロットのフラグ(0/1)。**空スロットでも 1 のことがあるのでスキル有無の判定は `skillN.skill_id` の null 判定で行う** | — |
| `bullet_info.set_bullets` | 銃(kind=6)のバレットスロット(`max_set_count` / 各 `bullet_N.slot_type`) | 「バレット」セクション |
| `limit` | 上限解放スキル / リミットボーナス(配列) | 「上限解放・強化要素」 |
| `augment_skill` | エレメント/AUG | 「上限解放・強化要素」 |
| `omega` / `moon` / `is_xeno_weapon` / `job_weapon` / `is_rusted_weapon` / `is_origin_numbers_weapon` / `series_id` | 武器カテゴリ判定フラグ | 「編成での役割」(グリッド分類) |

**注意**: 武器詳細レスポンスは所持インスタンス固有情報(+値・スキルレベル・所持数・編成使用中フラグ等)を含む。ナレッジには武器定義に関わる部分だけを反映し、生レスポンスは `tools/network-recorder/captures/`(git管理外)に保存する。

### コード表

| 属性 `attribute` | 1 火 / 2 水 / 3 土 / 4 風 / 5 光 / 6 闇 |
| --- | --- |
| **レアリティ `rarity`** | 2 R / 3 SR / 4 SSR |
| **武器種 `kind`** | 1 剣 / 2 短剣 / 3 槍 / 4 斧 / 5 杖 / 6 銃(確認済) / 7 格闘 / 8 弓 / 9 楽器 / 10 刀(6以外はジョブの `weapon1/2` コードと同じと推定、要確認) |
| **シリーズ `series_id`** | 1 セラフィックウェポン / 2 リミテッドシリーズ(以降は実例が集まり次第追記) |

## スキル系統(damage-calc 用の軸)

武器スキルはダメージ計算上、系統(表示名)と枠(乗算グループ)で分類する。代表例:

- **攻刃系**: 通常攻刃(通常乗算枠)、方陣攻刃(オメガ/マグナ枠)、神威(EX枠)、覚醒(神石で強化される枠)…
- **特殊補正**: 背水(HPが低いほどUP)、渾身(HPが高いほどUP)、克己、真価、progression …
- **守護・治癒・連撃・ダメージ上限・クリティカル・与ダメージ上昇** など。

正確な枠の対応は [../mechanics/damage-calculation.md](../mechanics/damage-calculation.md)・[../mechanics/damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md) を参照。各武器ファイルではスキルごとに「系統/カテゴリ」「枠」を明記する。

## 運用ルール

- 各ファイルは [_template.md](./_template.md) の形式に沿う。該当しないセクション(覚醒・超越等)は省略してよい。
- 情報源・取得方法の詳細は [docs/data-collection-notes.md](../../docs/data-collection-notes.md)。
