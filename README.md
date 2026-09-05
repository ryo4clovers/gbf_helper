# gbf_helper

生成AIがグランブルファンタジー(グラブル)に特化した回答をできるように、ナレッジやデータを集約するリポジトリ。

## 目的

- グラブルに関する知識(キャラクター、召喚石、武器、イベント、ゲームシステムなど)を構造化して蓄積する
- 蓄積したデータを生成AI(Claude等)のコンテキスト/RAGソースとして利用し、グラブルに特化した回答を可能にする
- 同じ計算コアをローカルWeb画面と生成AI向けMCPツールから利用できるようにする

## ディレクトリ構成

```
knowledge/
  characters/   キャラクター情報
  summons/      召喚石情報
  weapons/      武器情報
  jobs/         ジョブ(主人公専用)情報
  abilities/    アビリティ情報(内部IDで名寄せ、ダメージ計算用)
  mechanics/    ゲームシステム・仕様
  events/       イベント情報
  misc/         その他
tools/
  network-recorder/  実機プレイ中の通信を受動的に記録するChrome拡張機能(データ収集補助)
prompts/
  新しいチャット/Codexへの引き継ぎプロンプトの雛形と生成スクリプト
mcp-server/
  ナレッジ検索MCP、通常攻撃計算MCP、ローカルWeb計算画面
.claude/skills/
  Claude Code 用スキル(session-handoff: 引き継ぎプロンプト生成)
```

各カテゴリ配下は Markdown ファイルで記述する。

## ローカル計算画面

```powershell
cd mcp-server
npm run build
npm run start:web
```

起動後に `http://127.0.0.1:4173` を開く。詳しい入力形式とAI向けMCP設定は
`mcp-server/README.md`を参照する。

## 関連ドキュメント

- [.codex/README.md](.codex/README.md) — Codexのプロジェクト権限設定と安全上の注意
- [CONTRIBUTING.md](CONTRIBUTING.md) — 開発環境、検証コマンド、ナレッジ更新ルール
- [docs/data-collection-notes.md](docs/data-collection-notes.md) — データ収集の情報源・取得方法・優先順位などの作業メモ
- [mcp-server/README.md](mcp-server/README.md) — ナレッジベースをMCPサーバーとして公開する仕組みのセットアップ手順
- [tools/network-recorder/README.md](tools/network-recorder/README.md) — 実機データ収集用Chrome拡張機能の使い方
- [prompts/README.md](prompts/README.md) — 新しいチャット/Codexへの引き継ぎプロンプトの生成方法
