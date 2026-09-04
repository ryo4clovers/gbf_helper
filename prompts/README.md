# prompts/

新しいチャット(Claude)や Codex のセッションに作業を引き継ぐための **引き継ぎプロンプト** を扱うディレクトリ。

セッションをまたぐたびに背景・ルール・現状を説明し直す手間を無くし、
「絶対ルール」の伝え漏れ(特に実機APIへの直接アクセス禁止)を防ぐのが目的。

## ファイル

| ファイル | 用途 |
| --- | --- |
| [handoff-template.md](./handoff-template.md) | 引き継ぎプロンプトの雛形。`{{...}}` プレースホルダを含む固定部分(役割・絶対ルール・作業ルーティン・検証コマンド 等) |
| [generate-handoff.mjs](./generate-handoff.mjs) | 雛形の `{{...}}` を **リポジトリの現在状態**(ブランチ・直近コミット・ナレッジ件数・`draft/` の状況・収集メモの最新見出し)で埋め、貼り付け可能なプロンプトを標準出力に出す |

## 使い方

リポジトリのルートで:

```powershell
node prompts/generate-handoff.mjs                     # 標準出力に表示
node prompts/generate-handoff.mjs > handoff.txt       # ファイルに保存(handoff.txt は .gitignore 済み)
node prompts/generate-handoff.mjs --task "武器の天星器シリーズを処理して"
```

出力の末尾に「今回の依頼」欄がある。`--task` で渡すか、貼り付け後に手で書く。

- **新しい Claude チャット**: 出力をそのまま最初のメッセージとして貼る。
- **Codex**: 同上。Codex 向けの補足(`Assisted-by: OpenAI Codex` の付与条件など)も雛形に含まれる。

## メンテナンス

- 運用ルールが変わったら **`handoff-template.md` の固定部分を更新**する(正本は `AGENTS.md` / `CONTRIBUTING.md`。雛形はその要約)。
- 自動で埋まる項目(件数・コミット等)を増やしたいときは `generate-handoff.mjs` を編集する。
- 雛形と生成スクリプトはコミット対象。生成結果(`handoff.txt` 等)はコミットしない。
