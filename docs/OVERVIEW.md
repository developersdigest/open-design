# What it does — Developers Digest Open Design

Back to the [main README](../README.md) · [Setup guide](SETUP.md)

Paste a URL, get back:

1. **Brand decoded** — Firecrawl scrapes the site (markdown, summary, branding tokens, screenshot). Kimi K2.6 writes hero copy + tone in the brand's voice.
2. **Design system** — Two-step Kimi pass: strategy (archetype, positioning, voice examples) → full `design.md` spec (palette, typography, components, spacing, expansion ideas).
3. **Marketing assets** — Hero / Instagram post / OG card / IG story, all in the brand's actual colors. Generated via **Fal AI** (`fal-ai/gpt-image-2`), 4 images per run from one HTTP node iterating over prompt items.
4. **Landing page** — Outline → 8-section responsive HTML with inline CSS, rendered live in an iframe and downloadable.

A `/history` view is sketched out for showing past brand kits per mock user — currently driven by client-side state, but `db/schema.sql` is ready for when you wire up the Postgres node in n8n.

## The whole thing is one n8n workflow

Four webhook entry points, all on one canvas:

```
POST /webhook/brand/decode  →  Firecrawl → Kimi: Copy   → Save brand_run    → Decode respond
POST /webhook/brand/design  →  Kimi: Strategy → Stash → Kimi: Design.md → Save design_spec → Design respond
POST /webhook/brand/html    →  Kimi: Outline  → Stash → Kimi: HTML       → Save landing_page → HTML respond
POST /webhook/brand/assets  →  Build prompts (4 items) → Fal: Generate → Shape → Aggregate → Assets respond
```

That's the whole backend. No Express, no Hono — just n8n (+ optional Postgres).

## Stack

- **n8n** 2.17.7 (self-hosted, SQLite for n8n's own state)
- **Firecrawl** v2 API — scrape + branding extraction (colors, fonts, logo, components, spacing)
- **Kimi K2.6** + **Kimi K2 Turbo Preview** — Moonshot's chat completions API (OpenAI-compatible)
- **Fal AI** (`fal-ai/gpt-image-2`) — 4 marketing images per run, generated in the `assets` branch
- **Neon Postgres** — schema in `db/schema.sql` for brand runs / design specs / landing pages / asset packs (persistence is opt-in; the workflow currently responds without writing — wire up the Postgres node when you want history)
- **Next.js 16** (App Router, Turbopack) — frontend wrapping the n8n webhooks
- **Tailwind 4** — DevDigest design system (cream/ink/pink, offset cards, pill buttons)

## Repo layout

```
.
├── README.md
├── workflow/
│   ├── brand-api.json           # ← import this into n8n (4 webhook routes)
│   └── brand-api-agent.json     # agent-node variant (LangChain agent + Moonshot chat model)
├── db/
│   └── schema.sql               # Neon Postgres schema (optional persistence)
├── docs/
│   └── canvas.png               # screenshot of the workflow canvas
└── web/                         # Next.js app
    ├── app/
    │   ├── page.tsx             # 4-step UI
    │   ├── layout.tsx
    │   ├── globals.css          # DD design tokens
    │   └── api/
    │       ├── decode/route.ts      # → /webhook/brand/decode
    │       ├── design/route.ts      # → /webhook/brand/design
    │       ├── html/route.ts        # → /webhook/brand/html
    │       ├── assets/route.ts      # → /webhook/brand/assets (Fal images)
    │       ├── fonts/route.ts       # → /webhook/brand/fonts
    │       ├── generate/route.ts    # legacy single-shot, uses N8N_WEBHOOK_URL
    │       ├── index-css/route.ts   # Kimi-streamed brand index.css
    │       └── mini-asset/route.ts  # Kimi-streamed UI snippets in the brand system
    └── package.json
```

## Runs against

- Firecrawl (cloud) — `api.firecrawl.dev/v2`
- Moonshot (cloud) — `api.moonshot.ai/v1`
- Fal (cloud) — `fal.run/fal-ai/gpt-image-2`
- Neon (cloud) — Postgres, optional (only if you wire up persistence)
- Everything else — local
