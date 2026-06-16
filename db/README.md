# Open Design - Database

Postgres schema for the Open Design n8n demo. Persistence is **opt-in** - the workflow in `workflow/brand-api.json` does not write to Postgres by default. Wire it up if you want a `/history` view.

## Tables overview

- `app_user` - mock user accounts (id, email, name, created_at).
- `brand_run` - root record for a brand decode (source URL, brand name, branding/copy JSON, screenshot URL, tokens).
- `design_spec` - design system output per `brand_run` (strategy JSON, design markdown, tokens). 1:N since you can re-generate.
- `landing_page` - generated landing pages per `brand_run` (outline JSON, raw HTML, tokens).
- `asset_pack` - marketing asset packs per `brand_run` (assets JSON, `mocked` flag).
- `font_pack` - deterministic CSS-parsed font URLs from a brand site (no LLM); ties to `brand_run`.

All tables use `uuid` primary keys with `gen_random_uuid()` and a `created_at timestamptz`.

## Why it's opt-in

- Keeps the demo runnable without a Postgres instance - clone, set API keys, hit the workflow.
- The n8n workflow stays narrow and readable; no DB nodes cluttering the canvas.
- Wire it in once you actually want history, a `/history` endpoint, or cross-run analytics.

## How to wire it up in n8n

1. Open `workflow/brand-api.json` in the n8n UI.
2. For each `... respond` node (e.g. `brand respond`, `design respond`, `landing respond`, `assets respond`), insert a **Postgres** node **before** the respond node so the inserted row's `id` can flow into the response body.
3. Create a Postgres credential pointing at your Neon instance (host, db, user, password, SSL on).
4. Configure the Postgres node as `Execute Query` with a parameterized INSERT. Example for `brand_run`:

   ```sql
   INSERT INTO brand_run (user_id, source_url, brand_name, branding, copy, screenshot_url, tokens)
   VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
   RETURNING id;
   ```

   Map query parameters to the upstream node's output (e.g. `={{ $json.source_url }}`).
5. In the respond node, include the returned id in the body so the frontend gets a `brand_run_id` back:

   ```json
   { "brand_run_id": "={{ $json.id }}", ...rest of payload }
   ```

6. Repeat for `design_spec`, `landing_page`, `asset_pack`, `font_pack`, threading `brand_run_id` through as the FK.

## Setting up Neon

Create a free Neon project, grab the pooled connection string, then load the schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Or from the repo root:

```bash
make db
```

Free tier is fine for the demo.

## Schema quirks

- A handful of mock users are seeded at the bottom of `schema.sql` (`jonathan@dd.dev`, `alice@indie.co`, `riley@agency.io`) so the demo has accounts without an auth layer. Pick one `app_user.id` and pass it as `user_id` on inserts.
- `asset_pack.mocked boolean DEFAULT false` is a leftover from an earlier placeholder phase. It is now always `false` since Fal generates real images - safe to ignore, kept for backward compatibility.
- `font_pack` is populated by deterministic CSS parsing, not the LLM path - it can be written independently of the rest of a `brand_run`.
