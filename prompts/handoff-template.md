# 引き継ぎプロンプト: gbf_helper プロジェクト

> このテキストは `prompts/generate-handoff.mjs` が生成した引き継ぎプロンプトです。
> 新しいセッション(Claude チャット / Codex)の最初のメッセージとして貼り付けてください。

---

## あなたの役割

`gbf_helper`(このリポジトリ)は、**グランブルーファンタジー(グラブル)の知識を構造化して蓄積する**リポジトリです。
最終目標は `knowledge/` を素材にした (1) 構造化 DB、(2) ユーザーと AI の両方から呼び出せる**ダメージ計算機 / 最適編成ツール**の 2 つ。
`knowledge/` はあくまで素材であり、フレーバーより**数値(効果量・倍率・確率・枠)**の優先度が高い。

作業の正本ルールは `AGENTS.md` と `CONTRIBUTING.md`。以下はその要約と、セッションをまたいで伝えるべき点。

## 絶対ルール(最優先)

1. **実機 API を直接叩かない。** `game.granbluefantasy.jp` 配下のエンドポイントを `fetch()` 等で呼び出すことは、1 回でも、ループでも、禁止。ゲーム内の操作はすべて人間(ユーザー)が行う(規約)。
   - ✅ OK: ユーザーが画面操作した結果として自然に発生した通信レスポンスや画面表示を、ユーザーが貼り付ける / Claude が DOM・画面から読み取る。
   - ❌ NG: Claude がリクエストを発行してレスポンスを取得する。
2. **データの入口は 2 つだけ**: ユーザーのチャット貼り付け / `draft/` フォルダ(ユーザーが Network Recorder で収集して配置)。
3. **`draft/` と `tools/network-recorder/captures/` はコミット・引用・公開しない**(ユーザーが明示的に依頼した場合を除く)。アカウント固有情報を含みうるローカル専用。
4. gbf.wiki は直接 WebFetch すると 403。`r.jina.ai/` プロキシ経由か WebSearch を使う。

## draft/ データの処理ルーティン(4 ステップ)

`draft/` にデータが置かれたら、そのシリーズ / カテゴリ単位で:

1. **`knowledge/` に反映**(カテゴリの `_template.md` と `README.md` に従う。カテゴリ README の索引を更新)。
2. **`docs/data-collection-notes.md` に日付見出しで記録**(`### ...(YYYY-MM-DD)`。出典・カバレッジ・確定した仕様・保留事項・生データ保存先)。
3. **生レスポンスを `tools/network-recorder/captures/<カテゴリ>/` に保存**(gitignore 済み。ファイル名は `YYYY-MM-DD_<種別>_<slug>.json`)。
4. **日本語でコミット**(`.gitmessage` の規約: `<スコープ>: <日本語要約>` 句点なし、本文は出典・件数・保留を箇条書き)。

処理が終わったら **`draft/<該当フォルダ>` の中身を空にする**(受け皿フォルダは残す)。
例外: `draft/ゲーム内HELP/` の 4 カテゴリ(イベント / クエスト / ショップアイテム / 共闘)は保留中。

## 品質ルール

- 確度を明示する。実機由来で確認できたものだけ断定し、二次情報・推測は「要検証」「仮説」等でマークする。ステータスは `未着手 → 下書き → 検証済み`。
- **数値は基本すべて「要検証」**。実機レスポンスで取れるのは skill_id・効果文・ステータス実測値・構成まで。倍率・スキルLv別の値・枠(frame)は gbf.wiki / GameWith / 神ゲー攻略で補完し、出典を書く。
- 相対日付は絶対日付に変換して記録する。
- ユーザーが共有した参考スプレッドシート(グラブルDBシート)は**参考**であり、転記元・全面信頼の対象ではない(作りかけ・未検証)。

## 検証コマンド

`knowledge/` か `mcp-server/` を変更したら、`mcp-server/` で:

```powershell
npm run check      # 実ナレッジ検証・型チェック・ユニットテスト
npm run build      # 配布用 JS 生成
```

Windows チェックアウトでは Windows 版 Node.js を使う(`esbuild` が OS 固有バイナリのため、WSL/Linux と `node_modules/` を共有しない)。

## エージェント間の排他

- **Codex と Claude はリポジトリを同時に編集しない。** 自分の編集を終えたら、相手に渡す前にコミットする。
- コミットの支援表記: Claude は `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`、Codex は `Assisted-by: OpenAI Codex`(実際に関与した場合のみ)。
- 編集の前後で `git status` を確認し、無関係な変更を巻き込まない。

---

## 現在の状態(自動生成: {{GENERATED_AT}})

- ブランチ: **{{BRANCH}}**
- 作業ツリー: {{WORKTREE_STATUS}}

### 直近のコミット

```
{{RECENT_COMMITS}}
```

### knowledge/ の規模

{{KNOWLEDGE_COUNTS}}

### draft/ の状況

{{DRAFT_STATUS}}

### docs/data-collection-notes.md の最新記録(見出しのみ)

{{NOTES_HEADINGS}}

---

## まず最初にやること

1. `docs/data-collection-notes.md` の末尾付近(上記「最新記録」の見出しの前後)と、触るカテゴリの `README.md` / `_template.md` を読んで現状を把握する。
2. `git status` と `git log --oneline -5` で直前の作業を確認する。

## 今回の依頼

{{TASK}}
