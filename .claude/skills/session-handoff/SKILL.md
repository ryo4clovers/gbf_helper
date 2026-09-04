---
name: session-handoff
description: >-
  Generate a handoff prompt for continuing gbf_helper work in a fresh session
  (new Claude Code chat, or Codex). Use when the user asks to "引き継ぎ", "handoff",
  "新しいチャットに渡す", "次のセッション用のプロンプト", "generate a handoff", or is
  about to hand the repo to Codex. Produces a paste-ready prompt with the project's
  fixed rules plus the current repo state.
---

# session-handoff

このリポジトリ(`gbf_helper`)の作業を新しいセッションへ引き継ぐためのプロンプトを生成する。

Claude Code / Codex には「prompts 機能」が無いので、雛形 + 生成スクリプトを
`prompts/` に置き、このスキルからそれを呼び出す。

## 手順

1. ユーザーの依頼から「今回の依頼」を 1〜3 行にまとめる(次のセッションが最初に取り組む内容)。
   はっきりしなければユーザーに一言確認する。省略も可(その場合は記入欄プレースホルダが入る)。

2. リポジトリルートで生成スクリプトを実行する:

   ```bash
   node prompts/generate-handoff.mjs --task "まとめた依頼文"
   ```

   - `--task` を省くと末尾に記入欄プレースホルダが入る。
   - スクリプトは雛形 [`prompts/handoff-template.md`](../../../prompts/handoff-template.md) の
     `{{...}}` を現在のリポジトリ状態で埋める(ブランチ / 直近コミット / `knowledge/` 各カテゴリ件数 /
     `draft/` の未処理 json 数 / `docs/data-collection-notes.md` の最新見出し)。
   - どのディレクトリから実行してもよい(スクリプトが自分の位置からルートを解決する)。

3. 標準出力の全文をユーザーに提示する。コードブロックに入れて、そのまま次のセッションの
   最初のメッセージに貼れる形にする。

4. ユーザーが「ファイルにも保存して」と言ったら:

   ```bash
   node prompts/generate-handoff.mjs --task "..." > handoff.txt
   ```

   `handoff.txt` は `.gitignore` 済み(コミットしない)。

## 実行前の注意

- **未コミットの変更があるまま引き継がない。** `git status` を確認し、変更があれば
  「先にコミットしますか?」とユーザーに確認する(スクリプト出力の「作業ツリー」欄にも警告が出る)。
- 直前の作業が `docs/data-collection-notes.md` に記録済みか、カテゴリ README の索引が
  更新済みかも軽く確認する。漏れがあれば指摘する。

## メンテナンス

- 運用ルール(絶対ルール・4 ステップのルーティン・検証コマンド等)が変わったら、
  **`prompts/handoff-template.md` の固定部分**を更新する。正本は `AGENTS.md` / `CONTRIBUTING.md`。
- 自動で埋める項目を増やしたいときは `prompts/generate-handoff.mjs` を編集する。
- このスキルは手順の説明のみ。ロジックはスクリプトと雛形側に置く。
