# Open Design n8n Template

Use n8n as the backend for a small AI product. This template exposes four webhook routes that a Next.js app can call to decode a brand, write a design system, generate landing page HTML, and create marketing assets.

## Files

- `workflow.json` - importable n8n workflow export.
- `metadata.json` - template summary, routes, credential list, and companion app notes.

## What It Builds

1. `POST /webhook/brand/decode` scrapes a URL with Firecrawl and writes brand copy with Kimi.
2. `POST /webhook/brand/design` turns the decoded brand into strategy plus a `design.md` spec.
3. `POST /webhook/brand/html` creates responsive landing page HTML from the design spec.
4. `POST /webhook/brand/assets` creates four marketing assets with Fal.

## Import

From the repo root:

```bash
n8n import:workflow --input=templates/open-design/workflow.json
```

Then open n8n, verify the credentials, and activate the workflow.

## Credentials

Create or map these n8n credentials after import:

- `Firecrawl account` using the Firecrawl community node.
- `Kimi K2.6 Header Auth` as HTTP Header Auth with `Authorization: Bearer <MOONSHOT_API_KEY>`.
- `Fal Header Auth` as HTTP Header Auth with `Authorization: Key <FAL_KEY>`.
- Optional `Postgres` if you want to persist runs using `db/schema.sql`.

## Companion App

The Next.js app lives in `web/` and calls the webhook routes through local API routes.

```bash
cd web
bun install
cp .env.example .env.local
bun dev
```

Set `N8N_BASE_URL` in `web/.env.local` only if n8n is not running at `http://localhost:5678`.

## Test

```bash
curl -s -X POST http://localhost:5678/webhook/brand/decode \
  -H "Content-Type: application/json" \
  -d '{"url":"https://stripe.com"}'
```

For the full route smoke test, run from the repo root:

```bash
make smoke
```
