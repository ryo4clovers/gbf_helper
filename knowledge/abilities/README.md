# アビリティ ナレッジ

主人公(ジョブ)および(将来的に)キャラクターのアビリティを、ゲーム内部IDで名寄せして扱うカテゴリ。
ダメージ計算機・パーティ編成ツールの素材とすることを目的とする。

## ファイル

| ファイル | 内容 | ステータス |
| --- | --- | --- |
| [free-slot-candidates.json](./free-slot-candidates.json) | 主人公の自由選択枠にセット可能なアビリティ候補一覧(全77ジョブ、`action_id`で名寄せ) | 下書き(実機レスポンス由来、倍率・効果量は未収集) |

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

## 未収集・今後

- 各アビリティの**倍率・効果量(小中大の実値)、ダメージ上限、多段ヒット数、バフの枠(通常/別枠/EX等)** はこのレスポンスに含まれず、GameWith/gbf.wiki/検証ブログ等の外部ソースからの紐付けが必要。
- ステータス効果IDの名称・分類カタログ(`status` → 名称/枠/説明)は未整備。
- キャラクターアビリティのID化(NPC詳細レスポンスの収集)は別タスク。
