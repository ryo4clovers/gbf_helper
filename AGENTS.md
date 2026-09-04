# Repository instructions

## Purpose and scope

- This repository stores Granblue Fantasy knowledge for AI-assisted retrieval and future calculation tools.
- Prefer small, reviewable changes that preserve the existing Markdown and JSON formats.
- Do not introduce a database, embeddings, or a new framework unless the task explicitly requires it.

## Source and data policy

- Treat `status: 下書き` and `status: 未着手` as unverified. Never present them as confirmed facts.
- Change an entry to `検証済み` only when its contents have been checked against an official source or actual in-game behavior, and record the source and confirmation date.
- Preserve uncertainty and disagreements between sources in `未確認・要検証事項`.
- Follow the current source policy and collection constraints in `docs/data-collection-notes.md`; do not bypass authenticated-game or browser restrictions to collect data.
- `draft/` and `tools/network-recorder/captures/` may contain local or account-related data. They are local-only: do not commit, quote, or expose their contents unless the user explicitly asks.

## Editing conventions

- Keep filenames and frontmatter `id` values identical.
- Use the category template and README as the schema reference when adding knowledge files.
- Update the category README index when adding, removing, or renaming an indexed knowledge file.
- Keep collection history in `docs/data-collection-notes.md`; keep durable development instructions in `CONTRIBUTING.md` or this file.
- Do not overwrite unrelated user changes. Check `git status` before and after editing.

## Required verification

For changes under `knowledge/` or `mcp-server/`, run from `mcp-server/`:

```text
npm run check
npm run build
```

On this Windows checkout, use Windows Node.js. Do not reuse its `node_modules/` from WSL/Linux; use a separate checkout or clean CI environment for Linux execution.

## MCP server

- MCP tools are read-only and must retain accurate read-only annotations.
- Search/list results must not hide the verification status or source quality of knowledge.
- Keep stdout reserved for JSON-RPC; diagnostics belong on stderr.
