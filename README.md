# Developers Digest Open Design

Turn any URL into a brand kit, design system, marketing assets, and a production-quality landing page - powered by a single self-hosted n8n workflow with a Next.js 16 frontend.

Built to show off **n8n as a backend**: one workflow, four webhook routes, optional Neon Postgres persistence (schema in `db/`).

### ▶ Watch the demo

<a href="https://youtu.be/slKIDNp1bo4" title="Open Design — watch the demo on YouTube">
  <img src="https://img.youtube.com/vi/slKIDNp1bo4/maxresdefault.jpg" alt="Open Design — watch the demo" width="100%">
</a>

> Full walkthrough: building an AI brand-kit app with n8n as the backend → **https://youtu.be/slKIDNp1bo4**

![the workflow canvas](docs/canvas.png)

---

## Quickstart

Three pieces: **n8n** (with the workflow imported + credentials set), a tiny **`web/.env.local`**, and the **web app**.

```bash
# 1. Pull it down
git clone https://github.com/developersdigest/open-design.git && cd open-design

# 2. Install the web app
cd web && bun install && cd ..

# 3. Tiny env file (just one key — see ".env is tiny" below)
cp web/.env.example web/.env.local        # then add your KIMI_API_KEY

# 4. Start n8n (:5678) + web (:3000) together
make dev
```

Now **import the workflow** and **set the n8n credentials** ([Set up n8n](#set-up-n8n)), then verify end to end:

```bash
make smoke    # hits all 4 webhooks, prints pass/fail per step
```

`make help` lists every target.

## Set up n8n

The entire backend is **one workflow** — [`workflow/brand-api.json`](workflow/brand-api.json) — with 4 webhook routes on a single canvas. (An agent-node variant lives in [`workflow/brand-api-agent.json`](workflow/brand-api-agent.json).)

### 1. Import the workflow

**Option A — paste it in the n8n UI (easiest)**

1. Open n8n → http://localhost:5678
2. **Workflows → ⋯ → Import from File** and pick [`workflow/brand-api.json`](workflow/brand-api.json) — or open the file, copy all of it, and paste onto an empty canvas.
3. Toggle the workflow **Active** (top-right).

**Option B — CLI**

```bash
make import          # = n8n import:workflow --input=workflow/brand-api.json
```

### 2. Install the Firecrawl community node

n8n UI → **Settings → Community Nodes → Install** → `@mendable/n8n-nodes-firecrawl`

### 3. Add credentials (this is where your keys go)

**Almost all secrets live in n8n, not in `.env`.** Create these credentials in the n8n UI (Credentials → New):

| Credential | Type | Value |
|---|---|---|
| Firecrawl API | Firecrawl | your `fc-…` key |
| Kimi K2.6 Header Auth | HTTP Header Auth | name `Authorization`, value `Bearer sk-…` (Moonshot key) |
| Fal Header Auth | HTTP Header Auth | name `Authorization`, value `Key <FAL_KEY>` (literal `Key `, **not** `Bearer`) |
| Postgres *(optional)* | Postgres | your Neon connection details — only if you wire up persistence |

That's it. The workflow is now live at `http://localhost:5678/webhook/brand/{decode,design,html,assets}`.

## .env is tiny

The web app reads **one file — `web/.env.local`** — and it's almost empty, because the real config (Firecrawl / Moonshot / Fal / Neon) lives in **n8n credentials** above.

| Variable | Required? | What it's for |
|---|---|---|
| `KIMI_API_KEY` | ✅ | Moonshot/Kimi key for the streamed UI snippets (`/api/mini-asset`, `/api/index-css`). Get one at [platform.moonshot.ai](https://platform.moonshot.ai/) |
| `N8N_BASE_URL` | optional | Defaults to `http://localhost:5678/webhook/brand`. Only set it if n8n runs elsewhere (tunnel/remote host). |

```bash
cp web/.env.example web/.env.local
# edit web/.env.local — set KIMI_API_KEY, leave the rest alone
```

## What it does

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

## Manual setup (without `make`)

```bash
# 1. n8n
brew install n8n            # or: npm i -g n8n
n8n start                   # localhost:5678
# → then do everything under "Set up n8n" above (import + community node + credentials)

# 2. Postgres schema (optional)
psql "$DATABASE_URL" -f db/schema.sql

# 3. Frontend
cd web
bun install
cp .env.example .env.local  # set KIMI_API_KEY
bun dev                     # localhost:3000
```

> Once it's wired up, `make dev` from the repo root starts n8n + the web app together.

## Troubleshooting

**`{"error":"couldn't reach n8n — is it running?"}`**
n8n isn't up. Start it (`make n8n` or `n8n start`) and re-run.

**`{"error":"empty response from n8n", "upstream_status": 404}`**
The workflow isn't active or hasn't been imported. Import [`workflow/brand-api.json`](workflow/brand-api.json) and toggle **Active** in the n8n UI.

**`{"error":"KIMI_API_KEY not set"}`**
You haven't created `web/.env.local` yet — `cp web/.env.example web/.env.local` and fill in your Moonshot key.

**Fal returns 401 / 403**
The `Fal Header Auth` credential value must be `Key <FAL_KEY>` (literal word "Key" + space + your key) — *not* `Bearer ...`.

**Webhook fires but the assets array is empty**
Open the n8n execution log for the run — the `Fal: Generate` node iterates over 4 items, so a single failure shows up as a partial result. Most common cause: rate-limited or insufficient credit on Fal.

**`/history` is always empty**
By design — persistence is opt-in. Add a Postgres node after each `... respond` step in the workflow and it'll start writing to the tables in `db/schema.sql`.

## Roadmap

See [ROADMAP.md](ROADMAP.md).
Next up: streaming the HTML step via SSE so the landing page renders token-by-token in the iframe.

---

Workflow runs against:
- Firecrawl (cloud) — `api.firecrawl.dev/v2`
- Moonshot (cloud) — `api.moonshot.ai/v1`
- Fal (cloud) — `fal.run/fal-ai/gpt-image-2`
- Neon (cloud) — Postgres, optional (only if you wire up persistence)
- Everything else — local

## License

MIT - see [LICENSE](LICENSE).
