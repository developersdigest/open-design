# What it does — Developers Digest Open Design

Back to the [main README](../README.md) · [Setup guide](SETUP.md)

Open Design is an MIT-licensed, full-stack template that shows how to combine the latest AI and automation tools into something that could be a real product. Paste in a website and it turns it into a brand kit, a design system, reusable CSS, and a generator for HTML components and image assets you can hand off to AI agents or use as social/marketing creative.

The goal isn't just another pretty n8n workflow. It's to show how to take that same power and wire it into a **real app** — a front end, a real user experience, an end product you can extend into whatever you want.

## The flow

Paste a URL, get back:

1. **Brand decoded** — Firecrawl scrapes the site and returns markdown, a summary, and most importantly the **branding** (logo, color palette, fonts). Kimi K2.6 turns that into hero copy and tone in the brand's voice.
2. **Design system** — a brand strategist pass (archetype, positioning, voice, mood keywords, what to avoid) feeds a second pass that writes a **`design.md`** plus a ready-to-use **`index.css`**. Drop the `design.md` into Claude Code, Codex, Lovable, or Bolt and get far better design output than prompting cold.
3. **Generate — HTML** — describe what you want ("a pricing page with $15 and $30 tiers") and it streams back a responsive HTML page in the brand's system. Copy it, stack it as context for the next generation, or download it.
4. **Generate — images** — describe an asset ("an Instagram post for Linear Projects") and it generates on-brand image assets via **Fal** (GPT Image 2), passing the logo + palette + archetype as context so the output stays coherent.

## Why it's built this way

- **n8n is the entire backend.** Four webhook routes on one canvas — no Express, no Hono. The visual graph *is* the documentation of how the app works.
- **`design.md` as a portable context format.** A simple standard (popularized by Google) for handing brand + design context to any AI agent. Better results, no re-prompting.
- **Every model is swappable.** Kimi K2.6 is the default, but each LLM node is a dropdown — add credentials and switch any step to Anthropic, OpenAI, or Google.
- **Fal is one gateway to many models.** GPT Image 2 here, but the same node reaches most diffusion and video models — extending image generation into video is a node swap away.
- **It's a starting point, not a replacement.** Pull down any brand, play with its design system, spin off assets, and extend the template into whatever you're building.

## One n8n workflow, four routes

```
POST /webhook/brand/decode  →  Firecrawl scrape (markdown + branding)  →  Kimi: copy/tone        →  respond
POST /webhook/brand/design  →  Kimi: brand strategy  →  stash  →  Kimi: design.md + index.css     →  respond
POST /webhook/brand/html    →  Kimi: outline (JSON sections)  →  stash  →  Kimi: HTML             →  respond
POST /webhook/brand/assets  →  build prompt (palette + logo + archetype)  →  Fal: GPT Image 2  →  shape → aggregate → respond
```

## Stack

- **n8n** 2.17.7 (self-hosted, the whole backend)
- **Firecrawl** v2 — scrape + branding extraction (logo, palette, fonts, components)
- **Kimi K2.6** (Moonshot, OpenAI-compatible) — copy, strategy, `design.md`, HTML. Swappable per node.
- **Fal** (`fal-ai/gpt-image-2`) — on-brand image assets; gateway to many image/video models
- **Next.js 16** (App Router, Turbopack) — the front end, proxying the n8n webhooks
- **Tailwind 4** — DevDigest design system
- **Neon Postgres** *(optional)* — schema in `db/schema.sql` for persisting runs

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
│   ├── OVERVIEW.md              # this file
│   ├── SETUP.md                 # run it locally
│   ├── ARCHITECTURE.md
│   ├── SEQUENCES.md
│   └── canvas.png
└── web/                         # Next.js app
    └── app/
        ├── page.tsx             # the UI
        └── api/                 # thin proxies → /webhook/brand/*
```

## Runs against

- Firecrawl (cloud) — `api.firecrawl.dev/v2`
- Moonshot (cloud) — `api.moonshot.ai/v1`
- Fal (cloud) — `fal.run/fal-ai/gpt-image-2`
- Neon (cloud) — Postgres, optional
- Everything else — local
