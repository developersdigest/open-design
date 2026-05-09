# Contributing to Brand Forge

Brand Forge is an n8n workflow plus a Next.js 16 web app. Keep changes small, keep the workflow JSON valid, and run `make typecheck` before opening a PR.

## Prereqs

- Node 20+
- [bun](https://bun.sh)
- [n8n](https://docs.n8n.io) CLI (`brew install n8n` or `npm i -g n8n`)
- `jq` (for the smoke-test snippets in `workflow/README.md`)

## Setup

Follow "Run it locally" in the top-level `README.md`. First-run gotchas:

- The Firecrawl community node has to be installed from the n8n UI (`Settings - Community Nodes`) before importing the workflow, otherwise the import will load with broken nodes.
- After `n8n import:workflow`, open the workflow in the UI and toggle the "Active" switch. Webhooks don't register until the workflow is active.
- `web/.env.local` must exist with `KIMI_API_KEY` set. `N8N_BASE_URL` only needs setting if n8n isn't on `http://localhost:5678/webhook/brand`.

## Adding a new n8n route

1. **Add a webhook + nodes to `workflow/brand-api.json`.** Easiest path: build it in the n8n UI on the existing `brandapi00000000000000001` canvas, then export and replace `workflow/brand-api.json`. Use the route path `brand/<name>` to stay consistent with the others.
2. **Add a Next.js route** at `web/app/api/<name>/route.ts`:
   ```ts
   import { proxyToN8n } from "@/lib/n8n";

   export async function POST(req: Request) {
     const body = await req.json();
     return proxyToN8n("<name>", body);
   }
   ```
   `proxyToN8n` handles the "n8n not running" / "workflow not active" / non-JSON cases for you.
3. **Document the contract** in `workflow/README.md` - request shape, response shape, one-line description. Match the existing route format.
4. **Wire it into the UI** in `web/app/page.tsx` (or a sub-component). Hit `/api/<name>`, not the n8n webhook directly - the Next.js route is the public surface.

## Editing the workflow JSON safely

- Re-importing `brand-api.json` in the n8n UI overwrites credentials. After every import, re-pick credentials on the Firecrawl, Kimi, and Fal nodes.
- The Postgres node is intentionally absent. Persistence is opt-in - add a Postgres node after each `... respond` node yourself when you want history wired up to `db/schema.sql`.
- After hand-editing the JSON, validate it:
  ```bash
  python3 -c "import json; json.load(open('workflow/brand-api.json'))"
  ```

## Running locally

- `make dev` - starts n8n (5678) and the web app (3000) together.
- `make n8n` and `make web` in separate terminals if you want logs split.
- `make import` re-imports the workflow JSON. `make typecheck` for TS.

## Style

- No emojis in code, comments, copy, or commit messages.
- No em dashes. Use ` - ` (space-hyphen-space) instead.
- Pill buttons only - `rounded-full`, never `rounded-md` or `rounded-lg` on buttons.
- Use the DevDigest design system in `web/app/globals.css`: cream/ink/pink/yellow palette, ABC Favorit font, offset cards with `translate-x-1 translate-y-1` shadow effect.
- Lowercase commit messages (e.g. `add fonts route`).

## Before opening a PR

- `make typecheck` must pass.
- If you touched `workflow/brand-api.json`, run the JSON validation above.
- If you added a route, the contract is documented in `workflow/README.md`.
- Don't commit `.env.local` or any credential payloads from n8n exports.
