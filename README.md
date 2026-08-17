# gbf_helper

生成AIがグランブルファンタジー(グラブル)に特化した回答をできるように、ナレッジやデータを集約するリポジトリ。

## 目的

- グラブルに関する知識(キャラクター、召喚石、武器、イベント、ゲームシステムなど)を構造化して蓄積する
- 蓄積したデータを生成AI(Claude等)のコンテキスト/RAGソースとして利用し、グラブルに特化した回答を可能にする

## ディレクトリ構成

```
knowledge/
  characters/   キャラクター情報
  summons/      召喚石情報
  weapons/      武器情報
  mechanics/    ゲームシステム・仕様
  events/       イベント情報
  misc/         その他
```

各カテゴリ配下は Markdown ファイルで記述する。

## 関連ドキュメント

- [docs/data-collection-notes.md](docs/data-collection-notes.md) — データ収集の情報源・取得方法・優先順位などの作業メモ
- [mcp-server/README.md](mcp-server/README.md) — ナレッジベースをMCPサーバーとして公開する仕組みのセットアップ手順
