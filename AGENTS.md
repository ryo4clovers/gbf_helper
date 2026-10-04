# Repository instructions

## Purpose and scope

- This repository stores Granblue Fantasy knowledge for AI-assisted retrieval and future calculation tools.
- Prefer small, reviewable changes that preserve the existing Markdown and JSON formats.
- Do not introduce a database, embeddings, or a new framework unless the task explicitly requires it.
- clover coordinates requests, public-source research in its cloud environment, task ownership, progress, review, and verification. Ask the user for specification decisions or necessary in-game observations. Record sources, access dates, uncertainty, and observation coverage, and connect adopted calculation claims to regression tests. Ideas discovered by clover are proposals until the user adopts them; do not implement them independently. See `docs/multi-agent-workflow.md`.

## Source and data policy

- Treat `status: 下書き` and `status: 未着手` as unverified. Never present them as confirmed facts.
- Change an entry to `検証済み` only when its contents have been checked against an official source or actual in-game behavior, and record the source and confirmation date.
- Preserve uncertainty and disagreements between sources in `未確認・要検証事項`.
- Follow the current source policy and collection constraints in `docs/data-collection-notes.md`; do not bypass authenticated-game or browser restrictions to collect data.
- `draft/` and `tools/network-recorder/captures/` may contain local or account-related data. They are local-only: do not commit, quote, or expose their contents unless the user explicitly asks.

## Editing conventions

- The project uses full-access Codex permissions. This removes technical sandbox limits but does not authorize work outside the user's requested scope.
- Keep filenames and frontmatter `id` values identical.
- Use the category template and README as the schema reference when adding knowledge files.
- Update the category README index when adding, removing, or renaming an indexed knowledge file.
- Keep collection history in `docs/data-collection-notes.md`; keep durable development instructions in `CONTRIBUTING.md` or this file.
- Do not overwrite unrelated user changes. Check `git status` before and after editing.
- Use one task, one branch, and one worktree per implementation agent. Codex and Claude must not edit the same worktree concurrently. Separate worktrees may be edited in parallel only with agreed, non-overlapping ownership; see `docs/multi-agent-workflow.md`.
- Before editing, report the absolute worktree path, branch, base commit, owned files, and verification plan. Stop if existing changes or ownership are unclear. Never reset, stash, overwrite, or commit another agent's work.
- Assign one owner for shared calculator code, schemas, catalogs/knowledge indexes, dependency lockfiles, and workflow instructions. Coordinate cross-cutting changes before editing and integrate one task at a time.
- Review committed changes at an agreed commit in a separate worktree. Report checks and remaining risks before integration. Commit, merge, push, and PR creation require authorization for that action; finishing an edit alone is not permission to commit.
- When handing work to a fresh session, generate a handoff prompt with `node prompts/generate-handoff.mjs --task "..."` (Claude Code: the `session-handoff` skill). See `prompts/README.md`.

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
