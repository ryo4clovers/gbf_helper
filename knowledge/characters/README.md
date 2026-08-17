# キャラクター ナレッジ 目次

グランブルーファンタジーのキャラクター(スキル構成・基本情報)をまとめるカテゴリ。
1キャラクター(1レアリティ/1バージョン)= 1ファイルを基本とする。同名キャラでもレアリティやバージョンが異なれば別ファイルとする。

## ステータス凡例

- 未着手: ファイルとタイトルのみ作成済み
- 下書き: 内容を記入中(未検証、Wiki等の二次情報を元にした暫定データを含む)
- 検証済み: 公式情報や実機確認で内容を確認済み

## ファイル一覧

| ファイル | 名前(JP/EN) | レアリティ | 属性 | ステータス |
| --- | --- | --- | --- | --- |
| [katalina-sr.md](./katalina-sr.md) | カタリナ / Katalina | SR | 水 | 下書き |
| [vira-sr.md](./vira-sr.md) | ヴィーラ / Vira | SR | 闇 | 下書き |
| [percival-ssr.md](./percival-ssr.md) | パーシヴァル / Percival | SSR | 火 | 下書き |
| [seox-summer-ssr.md](./seox-summer-ssr.md) | シス(水着) / Seox (Summer) | SSR | 土 | 下書き |
| [payila-summer-ssr.md](./payila-summer-ssr.md) | ハイラ(水着) / Payila (Summer) | SSR | 光 | 下書き |
| [gwynne-yukata-ssr.md](./gwynne-yukata-ssr.md) | グウィン(浴衣) / Gwynne (Yukata) | SSR | 風 | 下書き |

## 運用ルール

- ファイル名は `id`(kebab-case、例: `katalina-sr-starter`)と一致させる。同名キャラの別レアリティ/別バージョンは `id` で区別する(例: `katalina-sr-starter` と `katalina-ssr-xxx`)。
- 各ファイルは `_template.md` の形式(YAML frontmatter + スキル構成セクション)に沿う。
- 数値やスキル効果は、公式発表や検証済みの一次情報を元に記載し、`source` に出典URLと取得日を明記する。Wiki等の二次情報のみの場合は `status: 下書き` とし、未確認事項は「未確認・要検証事項」に明記する。
- この一覧表は手動更新(MCPサーバーは `*.md` を直接スキャンするため、一覧の鮮度には依存しない)。
- 収集の優先順位: R・SRは後回しにし、SSRをリリースが新しい順に集める(GameWithのSSRキャラ評価一覧を基準)。コラボキャラも対象に含める。情報源や取得方法の詳細は [docs/data-collection-notes.md](../../docs/data-collection-notes.md) を参照。
