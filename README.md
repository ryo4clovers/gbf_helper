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
  jobs/         ジョブ(主人公専用)情報
  abilities/    アビリティ情報(内部IDで名寄せ、ダメージ計算用)
  mechanics/    ゲームシステム・仕様
  events/       イベント情報
  misc/         その他
tools/
  network-recorder/  実機プレイ中の通信を受動的に記録するChrome拡張機能(データ収集補助)
```

各カテゴリ配下は Markdown ファイルで記述する。

## 関連ドキュメント

- [docs/data-collection-notes.md](docs/data-collection-notes.md) — データ収集の情報源・取得方法・優先順位などの作業メモ
- [mcp-server/README.md](mcp-server/README.md) — ナレッジベースをMCPサーバーとして公開する仕組みのセットアップ手順
- [tools/network-recorder/README.md](tools/network-recorder/README.md) — 実機データ収集用Chrome拡張機能の使い方
