# Roadmap

This is the demo's roadmap. Items aren't promises - they're "if J or someone wants to extend it, here's what's next." Brand Forge ships as-is and works end to end; everything below is optional polish or scope expansion.

## Done

- [x] **Swap Mock URLs for Fal AI** - real image generation in the assets branch via `fal-ai/flux/schnell`, 4 prompts per run.
  - Why: makes the asset step actually useful instead of placeholder thumbnails.
  - Scope: medium (done).
  - Files: `workflow/brand-api.json` (Fal: Generate node), `web/app/api/assets/route.ts`.

## Next

- [ ] **Stream the HTML step via SSE** so the iframe renders token-by-token instead of waiting on the full response.
  - Why: the HTML step is the slowest single call in the demo; streaming makes it feel ~10x faster and shows off n8n's streaming-respond capability.
  - Scope: medium. Needs a streaming respond node in n8n + an EventSource consumer in the web app. `web/app/api/html-stream/route.ts` already exists as a starting point.
  - Files: `workflow/brand-api.json` (HTML respond branch), `web/app/api/html-stream/route.ts`, `web/app/page.tsx` (iframe consumer).

- [ ] **3 design directions** - fan out the design step to generate minimal / bold / playful variants in parallel, let the user pick one before HTML.
  - Why: turns the demo from "one shot, take it or leave it" into something closer to a real design tool.
  - Scope: medium. n8n Split In Batches or 3 parallel Kimi calls, plus a picker UI step.
  - Files: `workflow/brand-api.json` (design branch), `web/app/api/design/route.ts`, `web/app/page.tsx`.

- [ ] **Multi-tenant `/history` page** - currently driven by client-side state with a single mock user. Needs auth + per-user filtering on the Postgres queries.
  - Why: `/history` is the most obvious "this is a demo" tell. Real auth + persistence makes the whole thing feel production-shaped.
  - Scope: large. Needs an auth provider (Clerk / NextAuth), a `users` table, and the Postgres persistence work below.
  - Files: `web/app/page.tsx` (history view), `db/schema.sql`, new auth route handlers, `workflow/brand-api.json` (Postgres nodes).

## Maybe later

- [ ] **Hosted Postgres persistence wiring** - drop a Postgres node after each `... respond` step in the workflow so brand runs / design specs / landing pages / asset packs actually get saved.
  - Why: `db/schema.sql` is already written and the README calls this out as "opt-in." Wiring it up unlocks `/history` and any future analytics.
  - Scope: small. Four Postgres nodes, four `INSERT` statements.
  - Files: `workflow/brand-api.json`, `db/schema.sql` (already done).

- [ ] **`/api/health` endpoint hardening** - the route exists at `web/app/api/health/route.ts`; extend it to ping n8n's `/healthz`, Kimi, and Fal so a single GET tells you what's actually broken.
  - Why: Coolify and uptime monitors need a real health signal, not a 200 OK that lies.
  - Scope: small. One route, three upstream pings, JSON status object.
  - Files: `web/app/api/health/route.ts`.

- [ ] **OpenTelemetry traces across Next.js to n8n to upstream services** - one trace ID per brand run, propagated through the four webhook calls and the Firecrawl / Kimi / Fal HTTP nodes.
  - Why: the workflow has 22 nodes and four entry points. When something is slow or wrong, "open the n8n execution log" stops scaling fast.
  - Scope: large. Needs OTEL SDK in the web app, custom headers on every n8n HTTP node, and a collector (Jaeger / Honeycomb / Grafana Tempo).
  - Files: `web/app/api/*/route.ts` (all of them), `workflow/brand-api.json` (every HTTP node), new `web/lib/otel.ts`.

- [ ] **Multi-language hero copy** - extend the Kimi prompt in the decode step to take a `locale` param and return hero copy in that language.
  - Why: trivial change, big demo value for non-English brands. Good showcase of how prompt-as-config in n8n beats hardcoded strings.
  - Scope: small. One extra field in the request body, one line in the Kimi system prompt.
  - Files: `web/app/api/decode/route.ts`, `workflow/brand-api.json` (Kimi: Copy node), `web/app/page.tsx` (locale picker).

- [ ] **GIF / video generation as a 5th asset type** via Fal video models (e.g. `fal-ai/luma-dream-machine` or `fal-ai/kling-video`).
  - Why: a looping brand-colored hero video is the obvious next step after static assets, and Fal already handles auth.
  - Scope: medium. New prompt item in the assets branch, new Fal model call, longer poll timeout, video-aware preview in the UI.
  - Files: `workflow/brand-api.json` (assets branch), `web/app/api/assets/route.ts`, `web/app/page.tsx` (video preview).
