# n8n Project Hub

Working hub for the sponsored n8n video and the Brand Forge demo app.

## Current commitment

- Sponsor: n8n via Plug.Dev
- Contact: Kate / Rina at `kate@plug.dev`
- Rate discussed: `$2,500`
- Current external status: J replied "On track!" on 2026-05-01
- Target publish date mentioned in email: 2026-05-08
- Linear: `DEV-41` - n8n technical workflow sponsored video

## Core demo

Repo: `/Users/j/Documents/active-repos/n8n-demo`

Demo name: **Brand Forge**

Concept: paste a URL and generate a BrandKit, design system, reusable CSS variables, marketing assets, and landing page from one self-hosted n8n workflow.

The strongest story:

1. One n8n workflow acts as the backend.
2. Four webhook routes map cleanly to four product steps.
3. Firecrawl extracts the source brand.
4. Kimi writes the strategy, copy, design spec, brand `index.css`, and HTML.
5. Fal generates brand-colored assets.
6. Next.js is just the product shell around the workflow.

## Existing materials

- `README.md` - public-facing project overview and local setup.
- `docs/ARCHITECTURE.md` - system diagram and route mapping.
- `docs/DEMO.md` - recording guide and shot list.
- `docs/12_MIN_VIDEO_OUTLINE.md` - 12 minute video structure.
- `docs/SEQUENCES.md` - sequence diagrams.
- `docs/PERFORMANCE.md` - performance notes.
- `docs/canvas.png` - n8n workflow screenshot.
- `docs/app.png` - app screenshot.
- `workflow/brand-api.json` - n8n workflow export.
- `workflow/openapi.yaml` - API contract.
- `workflow/CHEATSHEET.md` - workflow reference.
- `workflow/tests.hurl` - webhook/API test requests.
- `examples/*.json` - example payloads.
- `db/schema.sql` - optional Neon persistence schema.
- `web/app/api/index-css/route.ts` - generates `:root` CSS variables and reusable `.brand-*` classes from the BrandKit.
- `web/` - Next.js 16 app.

Related local materials:

- `/Users/j/.n8n` - local n8n state.
- `/Users/j/.n8n/nodes/node_modules/@mendable/n8n-nodes-firecrawl` - installed Firecrawl community node.
- `/Users/j/Documents/active-repos/n8n-nodes-firecrawl` - local Firecrawl n8n node repo.
- `/Users/j/Screen Studio Projects/n8n part 1.screenstudio` - existing recording project.
- `/Users/j/Downloads/firecrawl-docs-main/developer-guides/workflow-automation/n8n.mdx` - downloaded Firecrawl n8n guide.
- `/Users/j/Downloads/*/www.firecrawl.dev_blog_n8n-web-scraping-workflow-templates.md` - downloaded Firecrawl/n8n blog copies.

## Local runbook

```bash
cd /Users/j/Documents/active-repos/n8n-demo
make import
make dev
make smoke
```

Expected local services:

- n8n: `http://localhost:5678`
- web app: `http://localhost:3000`

Before recording:

- Workflow imported and toggled active.
- Firecrawl community node installed in n8n.
- Firecrawl, Kimi, Fal credentials present in n8n.
- `web/.env.local` has `KIMI_API_KEY`.
- `make smoke` passes against all four routes.

## Production checklist

- [x] Re-run `make validate` - passed on 2026-05-01.
- [x] Re-run `cd web && bun run typecheck` - passed on 2026-05-01 after adding Bun test types.
- [x] Re-run `cd web && bun test` - passed on 2026-05-01 after fixing the Next headers test mock.
- [ ] Re-run `cd web && bun run lint` - currently fails on existing Biome import/format cleanup across the app.
- [ ] Start `make dev`.
- [ ] Confirm `http://localhost:3000` loads.
- [ ] Confirm n8n canvas loads and workflow is active.
- [ ] Run `make smoke` and save the passing output for confidence.
- [ ] Run one clean demo against a known brand, likely `https://stripe.com`.
- [ ] Confirm screenshots are current enough for README/video.
- [ ] Decide whether to include the n8n template bonus.
- [ ] Record the six beats in `docs/DEMO.md`.

## Video angle

Working title options:

- I Used n8n As The Backend For A Real AI App
- This n8n Workflow Replaces A Full Backend
- One n8n Workflow, Four AI Product Features

Main claim to prove on screen:

> n8n is not just an automation canvas. You can use it as the backend for a real AI product if you design the workflow like an API.

Structure:

1. Show the finished app first.
2. Reveal that the backend is one n8n canvas.
3. Walk through the four API routes.
4. Run the product flow live.
5. Show the workflow execution logs as proof.
6. Close with what this pattern is good for and where it breaks.

## Open decisions

- Whether the publish target is May 7 or May 8. Email now says May 8; Linear currently has May 7.
- Whether to submit an n8n template for the bonus.
- Whether the video should stay Brand Forge-only or include a short "how to generalize this pattern" section.
- Whether to polish the app before recording or keep the current surface and focus on the workflow.
- Whether to update screenshots after the final run.

## Next best tasks

1. Verify the app still runs end to end locally.
2. Clean up any obvious README/date mismatch around May 7 vs May 8.
3. Write the voiceover outline from `docs/DEMO.md`.
4. Prepare one stable sample run, likely Stripe or Linear.
5. Record a short test capture in the existing Screen Studio project.
