# Codex project configuration

This directory contains repository-scoped Codex settings. Codex loads them only
when this repository is marked as trusted.

## Permission policy

`config.toml` enables `danger-full-access` with no approval prompts, as explicitly
approved for this repository. This allows commands to access files outside the
workspace and use the network without an interactive sandbox escalation.

The setting improves autonomy for long-running local data and MCP work, but it
also increases the impact of an incorrect or malicious command. Keep the
following safeguards in place:

- Follow `AGENTS.md`, especially the rules for `draft/` and captured game data.
- Do not commit credentials or account-specific response data.
- Review commands that delete, overwrite, publish, push, or transmit data.
- Keep likely secret environment variables excluded from child processes.

The `gbf-knowledge` MCP server remains in the user's `~/.codex/config.toml`
because its executable path is machine-specific. It is intentionally not
duplicated here.

## Reverting to the safer default

Replace the first two settings in `config.toml` with:

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

Start a new Codex task after changing project configuration.
