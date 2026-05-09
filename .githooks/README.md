# Git Hooks

Hooks live in `.githooks/` (versioned with the repo) instead of `.git/hooks/`
(local, untracked). This way every contributor runs the same checks.

## Install

```bash
bash .githooks/install.sh
```

That sets `core.hooksPath` to `.githooks` for this clone. Run once after cloning.

## What runs

The `pre-commit` hook checks staged files only:

- `workflow/brand-api.json` -> `python3 scripts/validate-workflow.py`
- `web/**` -> `bun run typecheck` (and `bun run lint` if biome is installed)

## Skip (use sparingly)

```bash
git commit --no-verify
```
