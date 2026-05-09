# Performance

Budgets, where time goes, how to measure, and what's worth optimizing.

## 1. Budget per step

Hard timeouts come from the n8n workflow node `timeout` keys and the Next.js route `maxDuration` exports. Budgets are realistic targets given the model + service mix.

| Step | p50 target | p95 target | Hard timeout |
| --- | --- | --- | --- |
| `/decode` (Firecrawl scrape + Kimi copy) | 8s | 18s | 90s (Kimi node) / 300s (route) |
| `/design` (Kimi strategy + Kimi design.md) | 18s | 45s | 60s + 120s (nodes) / 300s (route) |
| `/html` (Kimi outline + Kimi HTML) | 30s | 90s | 60s + 240s (nodes) / 300s (route) |
| `/assets` (4x Fal GPT Image 2, sequential) | 12s | 22s | 90s per call / 300s (route) |
| `/fonts` | 2s | 5s | 60s |
| `/index-css`, `/mini-asset`, `/generate` | 6s | 20s | 120s |
| `/history`, `/health` | 200ms | 1s | 30s |

The Kimi HTML node's 240s timeout is an upper bound for tail outliers, not a budget. A run sitting near 240s means the model is producing a long doc; that's acceptable but not the norm.

## 2. Where time goes

- **`/decode`**: Firecrawl `scrape` with `markdown + summary + branding` formats is ~3-8s. Kimi copy completion on that summary is ~3-10s. Firecrawl dominates on slow target sites; Kimi dominates when the site loads fast.
- **`/design`**: Two sequential Kimi calls. Strategy (~5-15s) feeds design.md (~10-30s). Design.md dominates - it's the longest single completion in the system after HTML.
- **`/html`**: Outline (~5-15s) is small. HTML generation (~20-90s) dominates because it produces a full document inline. This is the slowest step in the pipeline.
- **`/assets`**: 4 Fal GPT Image 2 calls at ~2-4s each. Sequential iteration in n8n's default item flow makes this ~10-15s wall time. Network round trips, not GPU, are the floor.

## 3. How to measure

Curl the webhook directly with `time`:

```bash
time curl -s http://localhost:5678/webhook/brand/decode \
  -H 'content-type: application/json' \
  -d '{"url":"https://linear.app"}' > /tmp/decode.json
```

n8n UI: open the workflow, click an execution in the Executions tab. Each node shows its individual duration. Sum them for the end-to-end figure (it should match wall time within ~100ms).

The smoke script (see `scripts/`) writes a `latency_ms` field per step to its JSON output - grep that for regressions across runs.

## 4. Optimization opportunities

- **HTML generation**: switch the web client to `/api/html-stream` (already exists) so the browser paints as tokens arrive. p50 perceived latency drops from ~30s to first paint in ~2s, even though total wall time is unchanged.
- **Assets**: parallelize the 4 Fal calls instead of iterating items sequentially. `Promise.all` (or n8n's `Split In Batches` with `parallel: true`) takes the step from ~12s to ~4s.
- **Decode**: cache Firecrawl scrapes by URL hash. Repeat demos on the same URL skip the 3-8s scrape entirely and go straight to the Kimi copy step.

## 5. What we're NOT optimizing

- **Model token reduction**. Kimi outputs are intentionally verbose - design.md is meant to be a real spec, HTML is meant to be a real page. Trimming prompts to save tokens degrades the demo.
- **n8n cold-start**. Negligible for self-hosted; the worker stays warm between requests.
