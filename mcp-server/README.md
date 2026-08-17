# gbf-knowledge-mcp-server

`../knowledge/` 配下のグランブルーファンタジー知識(キャラクターのスキル情報・ゲームシステム)を、Claude Desktop / Codex app などのMCPクライアントから検索・参照できるようにするMCPサーバー。

現時点のスコープは**スキル情報Q&A(RAG的な検索)のみ**。ダメージ予測・最適編成ツールは未実装(将来フェーズ)。

## 提供ツール

| ツール名 | 概要 |
| --- | --- |
| `list_characters` | キャラクター一覧を取得(属性・レアリティで絞り込み可) |
| `search_characters` | キャラ名・スキル名・効果キーワードで検索(部分一致) |
| `get_character` | id または名前を指定してキャラクター全文を取得 |
| `search_mechanics` | ゲームシステム用語(背水・渾身など)を検索 |
| `get_mechanics_topic` | ゲームシステムのトピック全文を取得 |

すべて読み取り専用(ローカルの `knowledge/` Markdownを読むのみ、外部通信なし)。

検索はベクトル埋め込みではなく、フィールド重み付きのキーワード(部分一致)スコアリング。知識量が増えてきたら`src/services/search.ts`の内部実装を差し替える想定(ツールのインターフェースは変えない)。

## セットアップ

```bash
cd mcp-server
npm install
npm run build
```

動作確認(Claude Desktop等をインストールしていなくても、[MCP Inspector](https://github.com/modelcontextprotocol/inspector)のCLIモードでツール呼び出しを検証できる):

```bash
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name get_character --tool-arg id_or_name=katalina-sr
```

## Claude Desktop への登録

`%APPDATA%\Claude\claude_desktop_config.json` に以下を追記し、Claude Desktopを再起動する(絶対パスは各自の環境に合わせて置き換える):

```json
{
  "mcpServers": {
    "gbf-knowledge": {
      "command": "node",
      "args": ["C:\\path\\to\\gbf_helper\\mcp-server\\dist\\index.js"]
    }
  }
}
```

## Codex app への登録

Codex のMCP設定(通常 `%USERPROFILE%\.codex\config.toml`)に以下を追記する。**設定ファイルの場所・キー名はCodex appのバージョンによって変わる可能性があるため、現行のCodexドキュメントで最新の書式を確認すること。**

```toml
[mcp_servers.gbf-knowledge]
command = "node"
args = ["C:\\path\\to\\gbf_helper\\mcp-server\\dist\\index.js"]
```

## 知識ベースの場所を変える場合

既定では `mcp-server` の1つ上の階層にある `knowledge/` を読む。別の場所にあるコピーを参照させたい場合は環境変数で上書きできる:

```json
{
  "mcpServers": {
    "gbf-knowledge": {
      "command": "node",
      "args": ["C:\\path\\to\\gbf_helper\\mcp-server\\dist\\index.js"],
      "env": { "GBF_KNOWLEDGE_PATH": "C:\\path\\to\\another\\knowledge" }
    }
  }
}
```

## 開発

```bash
npm run dev         # tsx watchでホットリロード起動(stdioなので単体では動作確認しづらい。Inspectorのweb UIと併用推奨)
npm run typecheck   # 型チェックのみ
npm test            # ユニットテスト(test/fixtures配下のダミーデータを使用、knowledge/の実データには依存しない)
```

知識ベースはツール呼び出しのたびに読み直す(キャッシュなし)。`knowledge/`配下のMarkdownを編集したら、サーバーを再起動しなくても次回のツール呼び出しから反映される。

## 今後のスコープ外事項(意図的に未実装)

- ダメージ計算・最適編成ツール(MCPツールとして別途追加予定)
- ベクトル埋め込みによる高度なRAG(知識量が増えたら検討)
- npm publish / `npx`配布(現状はローカルパスでの起動のみ)
