# Sequences

Per-route temporal flow for the four `brand/*` webhooks. The system flowchart in `ARCHITECTURE.md` shows topology - who talks to whom. These diagrams show order and timing - what blocks on what, where the waits live, and which calls dominate latency. Use them when reasoning about timeouts, retries, or where to add streaming.

## Decode

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js /api/decode
    participant n8n
    participant Firecrawl
    participant Moonshot as Moonshot (Kimi)

    Browser->>NextJS: POST { url }
    NextJS->>n8n: POST /webhook/brand/decode
    n8n->>Firecrawl: scrape (markdown, summary, branding)
    Note right of Firecrawl: ~3-8s
    Firecrawl-->>n8n: branding tokens + summary
    n8n->>Moonshot: chat.completions (hero copy JSON)
    Note right of Moonshot: ~5-15s
    Moonshot-->>n8n: { brand_name, tagline, hero_*, tone }
    n8n-->>NextJS: { source_url, branding, copy, tokens }
    NextJS-->>Browser: 200 JSON
```

## Design

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js /api/design
    participant n8n
    participant Moonshot as Moonshot (Kimi)

    Browser->>NextJS: POST { branding, copy, source_url }
    NextJS->>n8n: POST /webhook/brand/design
    n8n->>Moonshot: Kimi Strategy (JSON)
    Note right of Moonshot: ~8-20s
    Moonshot-->>n8n: { archetype, audience, voice, ... }
    Note over n8n: Stash strategy (Set node)
    n8n->>Moonshot: Kimi design.md (markdown)
    Note right of Moonshot: ~20-60s
    Moonshot-->>n8n: full design system markdown
    n8n-->>NextJS: { design_md, strategy, tokens_total }
    NextJS-->>Browser: 200 JSON
```

## HTML

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js /api/html
    participant n8n
    participant Moonshot as Moonshot (Kimi)

    Browser->>NextJS: POST { design_md }
    NextJS->>n8n: POST /webhook/brand/html
    n8n->>Moonshot: Kimi Outline (8 sections JSON)
    Note right of Moonshot: ~8-15s
    Moonshot-->>n8n: { sections: [...] }
    Note over n8n: Stash outline (Set node)
    n8n->>Moonshot: Kimi HTML (full document)
    Note right of Moonshot: ~60-180s
    Moonshot-->>n8n: <!doctype html>...
    n8n-->>NextJS: { html, outline, tokens_total }
    NextJS-->>Browser: 200 JSON (buffered, no stream)
```

## Assets

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js /api/assets
    participant n8n
    participant Fal

    Browser->>NextJS: POST { branding, copy, design_md, strategy }
    NextJS->>n8n: POST /webhook/brand/assets
    Note over n8n: Build prompts (Code node)<br/>fan out to 4 items:<br/>hero, ig_post, og_card, ig_story
    loop 4 image types
        n8n->>Fal: GPT Image 2 (prompt, image_size)
        Note right of Fal: ~2-5s per image
        Fal-->>n8n: { images: [{ url, w, h }] }
        Note over n8n: Shape asset (Set)
    end
    Note over n8n: Aggregate assets
    n8n-->>NextJS: { assets: [4], mocked: false }
    NextJS-->>Browser: 200 JSON
```
