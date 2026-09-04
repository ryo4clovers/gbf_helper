# CLAUDE.md

このリポジトリの運用ルールの正本は `AGENTS.md` と `CONTRIBUTING.md` です。
Claude Code もそれに従います。

@AGENTS.md
@CONTRIBUTING.md

## Claude 固有の補足

- コミットメッセージは `.gitmessage` の規約に従う（`<スコープ>: <日本語要約>`、句点なし）。
- `knowledge/` か `mcp-server/` を変更したら、`mcp-server/` で `npm run check` と `npm run build` を実行してから結果を報告する。
- `draft/` と `tools/network-recorder/captures/` は読み取り・引用・コミットのいずれも行わない（ユーザーが明示的に依頼した場合を除く）。
- 編集の前後で `git status` を確認し、無関係な変更を巻き込まない。
