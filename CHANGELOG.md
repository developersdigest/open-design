# Changelog

All notable changes to Open Design will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- n8n `assets` branch with Fal AI image generation, producing 4 images per run via `fal-ai/flux/schnell`.
- Shared `web/lib/n8n.ts` proxy helper with actionable error messages for common failure modes (n8n unreachable, webhook 404, non-JSON responses).
- `Makefile` with `make dev`, `make import`, `make typecheck`, `make db`, and `make help` targets.
- `workflow/README.md` documenting all 4 webhook contracts (request/response shapes, branch wiring).
- `web/.env.example` and `N8N_BASE_URL` environment variable to support non-localhost n8n instances.
- Troubleshooting section in `README.md` covering the most common setup snags.

### Changed
- Next.js API routes refactored to call n8n through the shared `web/lib/n8n.ts` proxy helper instead of inlining `fetch` calls.
- README clarified: Postgres persistence in the n8n container is opt-in, not the default.

### Fixed
- `.gitignore` was masking `web/.env.example`; added `!.env.example` so the template is tracked.
- Inaccurate README claim that Postgres persistence was on by default.

## [0.1.0] - 2026-04-25

### Added
- Initial Open Design demo: n8n workflow + Next.js 16 frontend.
- `workflow/brand-api.json` defining the core webhook-driven brand generation flow.
- Next.js web app under `web/` with API routes proxying to n8n webhooks.
- Local development setup using n8n via Docker and the Next.js dev server.

[Unreleased]: https://example.com/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/releases/tag/v0.1.0
