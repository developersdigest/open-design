# 12 Minute Video Outline

Working target: 12 minutes, faceless voiceover, screen recordings only.

## Framework

Use this as the spine:

1. **Promise** - show the finished app and make the viewer curious.
2. **Constraint** - explain why this is harder than a toy automation.
3. **Reveal** - show that the backend is one n8n workflow.
4. **Proof** - run the app end to end while showing the workflow execute.
5. **Pattern** - extract the reusable architecture viewers can copy.
6. **Tradeoffs** - say where n8n works and where code is still better.
7. **Close** - bring it back to the practical takeaway.

The video should feel like:

> I built a real AI app, then opened the hood and showed how n8n can be used as the API/orchestration layer.

Not:

> Here is a tour of every node in my workflow.

## Section Framework

### 1. Promise

Goal: make the demo feel real before explaining anything.

Show:

- Finished app.
- Real generated outputs.
- One fast result montage.

Say:

- What the app does.
- The surprising backend choice.
- Why the viewer should care.

### 2. Constraint

Goal: frame the engineering problem.

Explain:

- AI apps need orchestration, not just one model call.
- The workflow needs scraping, generation, asset creation, response shaping, and error handling.
- This is usually where simple projects become messy backend code.

### 3. Reveal

Goal: make n8n the central character.

Show:

- Full n8n canvas.
- Four webhooks.
- The services connected in the workflow.

Say:

- One workflow.
- Four API routes.
- Frontend as product shell, n8n as backend orchestration.

### 4. Proof

Goal: prove the claim with live product behavior.

Run:

- Decode.
- Design / BrandKit.
- Assets.
- Generate page.

For each step:

- Show the app action.
- Cut to the matching n8n branch.
- Cut back to the result.

### 5. Pattern

Goal: turn the demo into something reusable.

Extract:

- Next.js API route proxies.
- n8n webhooks as backend endpoints.
- Provider calls as workflow nodes.
- Client state passing context between steps.
- BrandKit output as reusable `design.md` plus generated `index.css` variables/classes.
- Optional database persistence.

### 6. Tradeoffs

Goal: keep the video credible.

Call out:

- Great for orchestration, prototypes, internal tools, sponsor demos, and workflows with many providers.
- Worse for streaming, complex shared state, deep custom logic, and high-scale product paths.

### 7. Close

Goal: leave a clean takeaway.

Takeaway:

- n8n is strongest when treated as an orchestration/API layer.
- The workflow is the product backend.
- The app is just the interface.

## Core premise

Build a real AI product where n8n is the backend, not just a background automation tool.

The app is Open Design: paste a URL, then use one n8n workflow to decode the brand, create a BrandKit, generate marketing assets, and build a landing page.

The BrandKit is not just a written brand summary. It includes:

- Brand voice and positioning.
- Colors, fonts, spacing, radii, and component rules.
- A reusable `design.md`.
- Generated `index.css` with `:root` CSS variables and predictable component classes.
- CSS that later snippets and generated pages can reuse instead of inventing styles every time.

## Runtime plan

### 0:00 - 0:45 - Cold open

Show the finished Open Design app first.

Voiceover point:

> This looks like a normal AI app, but the backend is not Express, FastAPI, or a pile of serverless functions. It is one n8n workflow with four API routes.

Visuals:

- Web app at `localhost:3000`.
- Quick cuts of Decode, Design, Assets, Generate Page outputs.
- End the cold open on the n8n canvas zoomed out.

### 0:45 - 1:45 - The problem

Explain the pain:

- AI apps often start simple, then turn into glue code.
- Every provider needs auth, retries, shaping, error handling, and response parsing.
- For demos and internal tools, that boilerplate slows down the actual product idea.

Key line:

> n8n is useful when the important part is orchestration: call this service, reshape the data, call the next model, return something usable.

Visuals:

- Show the four service logos or browser tabs: Firecrawl, Kimi, Fal, n8n.
- Then cut back to the single workflow canvas.

### 1:45 - 2:45 - Architecture overview

Use the architecture doc and canvas.

Explain:

- Next.js is the frontend shell.
- Next API routes proxy to n8n webhooks.
- n8n owns the orchestration.
- Firecrawl extracts brand context.
- Kimi writes copy, strategy, design spec, reusable CSS variables/classes, and HTML.
- Fal generates assets.

Visuals:

- `docs/ARCHITECTURE.md` diagram.
- `docs/canvas.png`.
- n8n workflow zoom-to-fit.

### 2:45 - 3:45 - One workflow, four routes

Walk the n8n canvas slowly.

Routes:

- `/webhook/brand/decode`
- `/webhook/brand/design`
- `/webhook/brand/assets`
- `/webhook/brand/html`

Key point:

> These are independent API routes, but they live on one canvas, so the whole backend is readable in one place.

Visuals:

- n8n canvas with cursor pointing at each webhook.
- Do not open credentials on camera.

### 3:45 - 5:15 - Step 1: Decode a brand

Run `https://stripe.com`.

Explain:

- The frontend sends the URL to `/api/decode`.
- Next proxies to n8n.
- Firecrawl scrapes page content and branding.
- Kimi turns it into product copy and voice.

Visuals:

- Web app URL input.
- Decode result painting in.
- n8n execution log on the decode branch.
- Brand colors/tokens in the UI.

### 5:15 - 6:45 - Step 2: Generate the BrandKit

Click Design.

Explain:

- First Kimi pass creates strategy.
- Second Kimi pass writes a design spec.
- Then the app can generate a reusable `index.css` from that design system.
- This is stronger than asking for HTML directly because the BrandKit becomes reusable context for every future page, snippet, and asset.
- The CSS variable output matters: you get actual implementation tokens like color, font, radius, surface, border, and button variables, not just prose.

Visuals:

- n8n Design route running.
- Show `Kimi: Strategy`, stash, then `Kimi: Design.md`.
- Cut back to rendered `design.md`.
- Show the `index.css` panel with generated variables and reusable classes.

### 6:45 - 8:15 - Step 3: Generate assets

Click Assets.

Explain:

- The workflow builds four prompt items.
- Fal generates hero, Instagram post, OG card, and story assets.
- n8n fans out the asset generation and aggregates the result.

Visuals:

- Tight frame on the asset branch.
- Show the four generated images in the app.
- Call out that this is a real generation step, not placeholders.

### 8:15 - 9:45 - Step 4: Generate landing page

Click Generate Page.

Explain:

- Kimi creates an outline first.
- Then Kimi writes the full HTML page.
- The app renders it directly in an iframe.

Key point:

> The frontend is not doing the creative work. It is just passing state between API routes and showing the output.

The generated page should feel consistent because it is downstream of the same BrandKit: copy, design rules, CSS variables, and component conventions.

Visuals:

- n8n HTML branch running.
- Iframe filling with the generated page.
- Scroll the generated page slowly.

### 9:45 - 10:45 - Why this pattern works

Explain the practical value:

- n8n is good at visible orchestration.
- Non-code configuration makes provider swaps easier.
- Credentials stay in n8n.
- A workflow JSON is easy to fork.
- The product UI can stay focused.

Visuals:

- Show `workflow/brand-api.json`.
- Show `web/app/api/*/route.ts` briefly to prove the app code is thin.
- Show `web/lib/n8n.ts` proxy helper.
- Show `web/app/api/index-css/route.ts` as the bridge from brand spec to usable frontend tokens.

### 10:45 - 11:30 - Where it breaks

Be honest:

- Long streaming responses are awkward through normal n8n webhooks.
- Complex state needs a database.
- Debugging means reading execution logs.
- If this becomes a high-scale app, some pieces may move back into code.

Tie to roadmap:

- HTML streaming via SSE.
- Postgres history.
- Health endpoint hardening.

Visuals:

- `ROADMAP.md`.
- `db/schema.sql`.
- `docs/PERFORMANCE.md`.

### 11:30 - 12:00 - Close

Bring it back to the thesis:

> If you design n8n like an API layer, you can use it to ship real AI product workflows fast.

CTA:

- Mention the workflow export and app structure.
- Encourage viewers to fork the pattern for their own workflow-backed tools.

Visuals:

- Final n8n canvas wide shot.
- Final app output.

## Recording checklist

- [ ] Warm up `make dev`.
- [ ] Confirm n8n workflow active.
- [ ] Run `make smoke`.
- [ ] Use Stripe as the main run unless it fails.
- [ ] Keep credential panels closed.
- [ ] Record canvas, app, terminal, and generated page in separate clean takes.
- [ ] Capture one short failure-free asset generation run.

## Editing notes

- Keep the demo moving. If a generation step takes too long, cut to the n8n execution log, then back to the result.
- Use lower-thirds for `Firecrawl`, `Kimi K2.6`, `Fal AI`, and `n8n`.
- Keep explanation sections short and visual. Do not spend more than 60 seconds on abstract architecture without a screen change.
- If runtime lands short, extend the "Where it breaks" section with concrete tradeoffs.
- If runtime lands long, trim provider setup and keep only the visible app flow.
