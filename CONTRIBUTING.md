# 開発・ナレッジ更新ガイド

## セットアップ

このリポジトリの実行コードは `mcp-server/` にあります。

```powershell
cd mcp-server
npm ci
npm run check
npm run build
```

Node.js は `mcp-server/package.json` の `engines` を満たすバージョンを使用します。依存関係は `package-lock.json` に従い、通常の再現セットアップでは `npm install` ではなく `npm ci` を使用してください。

### Windows と WSL

`esbuild` はOS固有のバイナリを使用します。このWindows上のチェックアウトではWindows版Node.jsを使用し、同じ `node_modules/` をWSL/Linuxから利用しないでください。Linuxで実行する場合は、Linuxファイルシステム上の別clone/worktree、またはクリーンなCI環境で `npm ci` を実行します。

## 検証コマンド

`mcp-server/` で次を実行します。

```powershell
npm run check       # 実ナレッジ検証、型チェック、ユニットテスト
npm run build       # 配布用JavaScriptの生成
```

実ナレッジ検証では、必須frontmatter、ファイル名とID、ステータス、カテゴリREADMEの索引、abilities JSONの基本構造を確認します。

## ナレッジ更新

- 各カテゴリの `_template.md` と `README.md` に従います。
- 不確実な内容は削除して断定するのではなく、「未確認・要検証事項」と出典に残します。
- `検証済み` は、公式情報または実機確認により内容を確認し、出典と確認日を記録した場合にのみ使用します。
- 情報源の選定、収集方法、既知の例外は `docs/data-collection-notes.md` を参照します。
- `draft/` と `tools/network-recorder/captures/` はローカル専用です。アカウント固有情報を含む可能性があるためコミットしません。

## コミットメッセージ

- 規約と記入例は `.gitmessage` に記載しています。
- 各自のクローンで一度だけ次を実行し、コミット時にテンプレートを表示させます。

```powershell
git config --local commit.template .gitmessage
```

- 形式は `<スコープ>: <日本語の要約>`（句点なし）。本文は 72 文字前後で折り返し、出典・カバレッジ・保留事項・生データ保存先を箇条書きで残します。

## セッションの引き継ぎ

新しいチャット(Claude)や Codex に作業を渡すときは、`prompts/generate-handoff.mjs` で引き継ぎプロンプトを生成します。

```powershell
node prompts/generate-handoff.mjs --task "今回の依頼を1行で"
```

役割・絶対ルール(実機APIへの直接アクセス禁止など)・作業ルーティン・検証コマンドの固定部分に、リポジトリの現在状態(ブランチ・直近コミット・ナレッジ件数・`draft/` の状況・収集メモの最新見出し)を差し込んだテキストが出力されます。詳細は [prompts/README.md](prompts/README.md)。

運用ルールを変えたら `prompts/handoff-template.md` の固定部分も更新してください(正本は `AGENTS.md` / `CONTRIBUTING.md`)。

## MCP開発

- MCPのstdoutはJSON-RPC専用です。ログはstderrへ出力します。
- ツールを追加・変更した場合は、読み取り専用注釈、入力上限、曖昧な検索結果、空結果をテストします。
- 実データの信頼度をAIが判断できるよう、ステータスと出典を失わない設計にします。
