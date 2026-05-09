# Brand API workflow

One n8n workflow (`brand-api.json`), 4 webhook entry points. Import via:

```bash
n8n import:workflow --input=brand-api.json
```

Then create credentials in the n8n UI (see top-level README) and activate.

## Routes

All routes live under `http://localhost:5678/webhook/brand/*` and accept `POST` with `Content-Type: application/json`.

### `POST /webhook/brand/decode`

Scrape a URL and produce hero copy.

```jsonc
// request
{ "url": "https://stripe.com" }

// response
{
  "source_url": "...",
  "branding": { /* Firecrawl branding tokens: colors, fonts, logo, ... */ },
  "copy": { "brand_name": "...", "tagline": "...", "hero_headline": "...", "tone": ["..."] },
  "tokens": { /* Kimi usage */ }
}
```

### `POST /webhook/brand/design`

Take decoded brand context, return strategy + full `design.md` spec.

```jsonc
// request — pass the whole decode response back, plus brand_run_id
{ "brand_run_id": "...", "source_url": "...", "branding": {...}, "copy": {...} }

// response
{ "design_md": "# ...", "strategy": { "brand_archetype": "...", ... }, "tokens_total": 0 }
```

### `POST /webhook/brand/html`

Generate an 8-section landing page HTML from the design.md.

```jsonc
// request
{ "brand_run_id": "...", "design_md": "..." }

// response
{ "html": "<!doctype html>...", "outline": { "sections": [...] }, "tokens_total": 0 }
```

### `POST /webhook/brand/assets`

Generate 4 marketing images (hero / IG post / OG card / IG story) via Fal `GPT Image 2`.

```jsonc
// request
{
  "brand_run_id": "...",
  "branding": {...},
  "copy": {...},
  "design_md": "...",
  "strategy": {...}
}

// response
{
  "assets": [
    { "type": "hero",     "url": "https://...", "width": 1024, "height": 576, "prompt": "..." },
    { "type": "ig_post",  "url": "...", ... },
    { "type": "og_card",  "url": "...", ... },
    { "type": "ig_story", "url": "...", ... }
  ],
  "mocked": false
}
```

## Quick smoke test

```bash
curl -s -X POST http://localhost:5678/webhook/brand/decode \
  -H "Content-Type: application/json" \
  -d '{"url":"https://stripe.com"}' | jq .copy
```
