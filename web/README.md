# Open Design - Web

Next.js 16 frontend for the Developers Digest Open Design. This README covers the `web/` app only - see the root `README.md` for the full picture (n8n workflows, end-to-end flow, deployment).

## Quickstart

```bash
bun install
cp .env.example .env.local
bun dev
```

App runs at `http://localhost:3000`. Requires n8n on `http://localhost:5678` (or override `N8N_BASE_URL`) and a `KIMI_API_KEY` for the streaming routes.

## Scripts

| Script | What it does |
| --- | --- |
| `bun dev` | `next dev` - local dev server with HMR |
| `bun run build` | `next build` - production build |
| `bun start` | `next start` - serve the production build |
| `bun run typecheck` | `tsc --noEmit` - run before claiming a route works |

## API routes

All routes live at `app/api/<name>/route.ts`. n8n-backed routes go through `proxyToN8n` from `@/lib/n8n`.

| Route | Type | Purpose | Depends on |
| --- | --- | --- | --- |
| `/api/decode` | proxy | Decode a brand from a URL | n8n (`brand/decode`) |
| `/api/design` | proxy | Generate design tokens | n8n (`brand/design`) |
| `/api/html` | proxy | Render HTML preview | n8n (`brand/html`) |
| `/api/assets` | proxy | Fetch brand assets | n8n (`brand/assets`) |
| `/api/fonts` | proxy | Resolve fonts | n8n (`brand/fonts`) |
| `/api/mini-asset` | streaming (SSE) | Stream HTML snippet from Kimi | Kimi (`KIMI_API_KEY`) |
| `/api/index-css` | streaming (SSE) | Stream index CSS from Kimi | Kimi (`KIMI_API_KEY`) |
| `/api/generate` | legacy | Single-shot all-in-one webhook | n8n (`N8N_WEBHOOK_URL`) |

Streaming routes return raw `Response` with `upstream.body` and `Content-Type: text/event-stream` - do not wrap them in `proxyToN8n`, it buffers and breaks streaming.

## State

The frontend is a single big client component at `app/page.tsx`. This is intentional for the demo - do not split it without a reason. State lives client-side in that component until persistence is wired up (no DB writes today, even though `@neondatabase/serverless` is installed for later).

## Conventions

See `AGENTS.md` for the full ruleset. Highlights:

- App Router only. API routes at `app/api/<name>/route.ts`.
- `web/lib/n8n.ts` is the canonical way to call n8n - use `proxyToN8n(path, body)`. It handles unreachable n8n, inactive workflows (404), and non-JSON upstream errors with actionable messages.
- `@/*` alias maps to the project root. Import as `@/lib/n8n`, not relative paths.
- Run `bun run typecheck` before shipping.

## Design system

DevDigest tokens live in `app/globals.css` - cream / ink / pink / yellow, ABC Favorit, pill buttons (`rounded-full`, `min-h-[44px]`), offset cards via a sibling `bg-offset` div with `translate-x-1 translate-y-1`. No gradients, no drop shadows, no emojis, no em dashes (use ` - `).
