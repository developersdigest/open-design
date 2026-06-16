# Setup — Developers Digest Open Design

Everything you need to run it locally. Back to the [main README](../README.md).

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

The entire backend is **one workflow** — [`workflow/brand-api.json`](../workflow/brand-api.json) — with 4 webhook routes on a single canvas. (An agent-node variant lives in [`workflow/brand-api-agent.json`](../workflow/brand-api-agent.json).)

### 1. Import the workflow

**Option A — paste it in the n8n UI (easiest)**

1. Open n8n → http://localhost:5678
2. **Workflows → ⋯ → Import from File** and pick [`workflow/brand-api.json`](../workflow/brand-api.json) — or open the file, copy all of it, and paste onto an empty canvas.
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
| `KIMI_API_KEY` | Yes | Moonshot/Kimi key for the streamed UI snippets (`/api/mini-asset`, `/api/index-css`). Get one at [platform.moonshot.ai](https://platform.moonshot.ai/) |
| `N8N_BASE_URL` | optional | Defaults to `http://localhost:5678/webhook/brand`. Only set it if n8n runs elsewhere (tunnel/remote host). |

```bash
cp web/.env.example web/.env.local
# edit web/.env.local — set KIMI_API_KEY, leave the rest alone
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
The workflow isn't active or hasn't been imported. Import [`workflow/brand-api.json`](../workflow/brand-api.json) and toggle **Active** in the n8n UI.

**`{"error":"KIMI_API_KEY not set"}`**
You haven't created `web/.env.local` yet — `cp web/.env.example web/.env.local` and fill in your Moonshot key.

**Fal returns 401 / 403**
The `Fal Header Auth` credential value must be `Key <FAL_KEY>` (literal word "Key" + space + your key) — *not* `Bearer ...`.

**Webhook fires but the assets array is empty**
Open the n8n execution log for the run — the `Fal: Generate` node iterates over 4 items, so a single failure shows up as a partial result. Most common cause: rate-limited or insufficient credit on Fal.

**`/history` is always empty**
By design — persistence is opt-in. Add a Postgres node after each `... respond` step in the workflow and it'll start writing to the tables in `db/schema.sql`.
