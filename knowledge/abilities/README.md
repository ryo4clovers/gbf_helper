# アビリティ ナレッジ

主人公(ジョブ)および(将来的に)キャラクターのアビリティを、ゲーム内部IDで名寄せして扱うカテゴリ。
ダメージ計算機・パーティ編成ツールの素材とすることを目的とする。

## ファイル

| ファイル | 内容 | ステータス |
| --- | --- | --- |
| [free-slot-candidates.json](./free-slot-candidates.json) | 主人公の自由選択枠にセット可能なアビリティ候補一覧(全77ジョブ、`action_id`で名寄せ) | 下書き(実機レスポンス由来、倍率・効果量は外部ソースから紐付け中) |
| [status-effects.json](./status-effects.json) | ステータス効果ID(内部コード)カタログ。302種、`status`→名称/説明/派生バリアント/traits/使用アビリティ | 下書き(説明文は実機テキストのまま) |
| [ability-effects.json](./ability-effects.json) | 各アビリティの倍率・効果量・効果時間(gbf.wiki等の外部ソースから)。`action_id`で free-slot-candidates.json と結合 | 下書き(ジョブアビリティ 293/309件。リミット239・極致・ベース10は全件、EXは60中44件) |
| [_sources/gbfwiki-class-skills-2026-09-07.md](./_sources/gbfwiki-class-skills-2026-09-07.md) | gbf.wiki『Class Skills』の全文抜粋(ジョブアビリティ400件超の効果量・倍率・CT)。ability-effects.json の一次資料 | 参考資料 |

## free-slot-candidates.json の構造

```
{
  "_meta": { ... 説明・カバレッジ・kind対応表 ... },
  "abilities": {
    "<action_id>": {
      "name", "kind", "category",        // kind: 1-4=EX / 5=リミット / 6=ベース
      "class_name",                       // アイコンキー兼系統(上位版と共通)
      "recast",                           // 使用間隔(ターン)
      "comment",                          // 効果テキスト(HTMLタグ除去済み)
      "unlock_job_level",                 // EXアビリティのみ: 習得に必要なジョブLv
      "status_effects": [                 // 付与する強化/弱体
        { "kind": "buff|debuff", "status": "<統一ステータスID>", "detail", "effect" }
      ]
    }
  },
  "jobs": {
    "<job-slug>": {
      "total_candidates",
      "slot_caps": { "ex", "base", "zenith_limit" },   // カテゴリ別の同時セット上限
      "counts": { "ex", "limit", "base" },
      "ex_ability_ids": [ ... ],      // abilities のキーへの参照
      "limit_ability_ids": [ ... ],
      "base_ability_ids": [ ... ]
    }
  }
}
```

## 取得元・カバレッジ

- 実機 `/party_ability_subaction/all/...` レスポンス(アビリティ選択画面)。ユーザーが実機操作で取得し `draft/` 経由で提供(2026-09-06〜2026-09-07)。
- 全77ジョブ(取得可能な全ジョブ)。ClassI版ファイター/ランサー/ウィザードはオリジン進化済みで取得不可 — ただしリミットアビリティ候補は他ClassIジョブと同じ「同系列のClassIII+IV+V」ルールで導出可能。
- 生レスポンス(ページ送り)は `tools/network-recorder/captures/ability-subaction/{slug}/page-*.json`(git管理外)。

## 候補の構成ルール(2026-09-07、全77ジョブで確認)

種別は各エントリの `kind` で判別する(1=EXダメージ / 2=EX強化 / 3=EX弱体 / 4=EX回復 / 5=リミット / 6=ベース)。
詳細は [../mechanics/abilities.md](../mechanics/abilities.md) の「自由選択枠の候補一覧を実データで確認」を参照。

- **EXアビリティ(kind 1-4)**: アカウント共通のプール(この取得アカウントでは60種)。ジョブごとに自ジョブの基本アビリティ相当分などが数個除外され、候補数は58〜60。
- **リミットアビリティ(kind 5)**: 同系列(`job_id` 接頭2桁が共通)の特定クラスのリミットアビリティの和集合。**極致の証(段階6)で習得するアビリティもリミットアビリティ(kind 5)として扱われる**。

  | ジョブ種別 | リミットアビリティ候補(同系列) |
  | --- | --- |
  | ClassI / II / III / V | ClassIII + ClassIV + ClassV の各リミットアビリティ(ClassIVの極致の証由来は**含まない**) |
  | ClassIV(標準系列) | ClassIII + ClassIV + ClassV + **自身の極致の証** |
  | ClassIV(単独系列: グラディエーター系・単独ClassIV) | (あれば)ClassIII + ClassIV + **自身の極致の証** |
  | オリジン | ClassIII + ClassIV + **ClassIVの極致の証** + そのオリジン自身(**ClassV は含まない**) |
  | エクストラ(Ex1) | 自身 + 対になるエクストラII(Ex2) |
  | エクストラII(Ex2) | 自身 + **自身の極致の証** + 対になるEx1 |

- **ベースアビリティ(kind 6)**: **エクストラII(Ex2)ジョブのみ** 候補を持つ。対になるEx1ジョブの基本アビリティ(全10種: ダブルアサシン/剣神共鳴/集気/トライン/バレットリロード/宿命陣/闘志の残響/熱烈峻厳/プリンシパル・クラシック/リンガリング・セント)。ClassI〜V・オリジンはベースアビリティ候補ゼロ。

## status-effects.json の構造

```
{ "_meta": {...},
  "status_effects": {
    "<status_id>": {
      "status_id", "base_id",              // base_id はサフィックスを除いた族ID
      "type": "buff|debuff|both",
      "name",                              // 説明文からの暫定名(要精査、curated=false)
      "game_description",                  // 実機テキストのまま
      "description_variants": [ ... ],     // 同一IDで文言違いがある場合
      "durations_seen": [ "3ターン", ... ],
      "occurrences", "seen_on_abilities": [ ... ],
      "traits": [ "累積(stackable)", "Lv制", "消去不可", "回復不可", "回数制" ]  // 説明文から機械抽出
    }
  }
}
```

内部コードの読み方: ベースID + `_サフィックス`。例 `1019`=防御UP/ダメージカット族、`1019_0_50`=被ダメージ50%カット、`1019_4_80`=風属性被ダメージ80%カット、`7435_1`=調律Lv1。

**枠(frame)について**: 攻撃UP/防御DOWN等のダメージ計算上の枠(通常/別枠/EX/背水/渾身…)は付与元アビリティに依存するため、status_id 単位では持たない。ability-effects.json 側および [../mechanics/buffs-debuffs.md](../mechanics/buffs-debuffs.md)・[../mechanics/damage-cap-modifiers.md](../mechanics/damage-cap-modifiers.md) で扱う。

## ability-effects.json の構造(収集中)

```
{ "_meta": {...},
  "abilities": {
    "<action_id>": {
      "name_jp", "name_en",                // gbf.wiki 突き合わせ用
      "source": "gbf.wiki" 等, "source_url",
      "effects": [ "25% ATK Up (3T)", ... ],// 記載のまま(倍率・%・ターン)
      "multiplier", "damage_cap",           // ダメージアビリティの場合
      "notes"
    }
  }
}
```

## ability-effects.json の紐付け方法・進捗

- 一次資料: gbf.wiki『Class Skills』(`_sources/` に全文)。英語スキル名 ↔ 実機の日本語 `action_id` を、名称・効果内容・習得ジョブLvで照合する。GameWith はジョブアビリティの数値が「小中大」止まりで精度不足のため使わない。
- `match_confidence`: high=名称/効果/習得Lv一致、medium=英名と実機名は大きく異なるが効果・EMP消費量等で一致確認、low=要再確認。
- gbf.wiki の EMP(Extended Mastery)= リミットアビリティ、UM(Ultimate Mastery)= 極致の証、Lv1〜15 の base skill = EXアビリティ/ベースアビリティ。
- **進捗**: 全27系列(Fighter〜Mechanic)照合済み。リミット239件・極致の証・ベース10件は全件反映。EXアビリティは60中44件(残り16件は gbf.wiki 該当スキルの特定が未了、`_meta.todo`)。

## 未収集・今後

- ability-effects.json の未特定EXアビリティ10件(オーラ/羅喉阿修羅陣/かばう/ミンストレルソング/メディク/士気向上/闘気/トレジャーハント×3。多くは非ダメージ系の旧EX)。
- status-effects.json の `name` 精査(説明文からの暫定名が多い)。
- medium 判定39件・low 1件(ツープラトン)の再確認。
- 各アビリティ・バフの「枠」の付与(mechanics 側と連携)。
- キャラクターアビリティのID化(NPC詳細レスポンスの収集)は別タスク。
