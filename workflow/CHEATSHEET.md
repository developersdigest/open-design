# Brand API Cheatsheet

Base: `http://localhost:5678/webhook/brand`. All POST, `Content-Type: application/json`.

## /decode

```bash
curl -s -X POST http://localhost:5678/webhook/brand/decode \
  -H "Content-Type: application/json" \
  -d '{"url":"https://stripe.com"}'
```

Response keys:

```bash
# source_url: string
# branding:   object  (colors, fonts, logo, ...)
# copy:       object  { brand_name, tagline, hero_headline, tone[] }
# tokens:     object  (Kimi usage)
```

Pull the brand name:

```bash
curl -s -X POST http://localhost:5678/webhook/brand/decode \
  -H "Content-Type: application/json" \
  -d '{"url":"https://stripe.com"}' | jq -r .copy.brand_name
```

## /design

```bash
curl -s -X POST http://localhost:5678/webhook/brand/design \
  -H "Content-Type: application/json" \
  -d '{
    "brand_run_id": "run_001",
    "source_url": "https://stripe.com",
    "branding": {"colors":["#635bff","#0a2540"],"fonts":["Sohne"],"logo":"https://stripe.com/img/v3/home/twitter.png"},
    "copy": {"brand_name":"Stripe","tagline":"Payments infrastructure for the internet","hero_headline":"Financial infrastructure to grow your revenue","tone":["confident","technical"]}
  }'
```

Response keys:

```bash
# design_md:    string  (full markdown spec)
# strategy:     object  { brand_archetype, ... }
# tokens_total: number
```

Pull the archetype:

```bash
... | jq -r .strategy.brand_archetype
```

Chain decode -> design (one-liner):

```bash
curl -s -X POST http://localhost:5678/webhook/brand/decode \
  -H "Content-Type: application/json" \
  -d '{"url":"https://stripe.com"}' \
  | jq '. + {brand_run_id:"run_001"}' \
  | curl -s -X POST http://localhost:5678/webhook/brand/design \
      -H "Content-Type: application/json" -d @-
```

## /html

```bash
curl -s -X POST http://localhost:5678/webhook/brand/html \
  -H "Content-Type: application/json" \
  -d '{
    "brand_run_id": "run_001",
    "design_md": "# Stripe Landing\n\n## Hero\nFinancial infrastructure..."
  }'
```

Response keys:

```bash
# html:         string  (<!doctype html>...)
# outline:      object  { sections: [...] }
# tokens_total: number
```

Save the HTML to disk:

```bash
... | jq -r .html > landing.html
```

## /assets

```bash
curl -s -X POST http://localhost:5678/webhook/brand/assets \
  -H "Content-Type: application/json" \
  -d '{
    "brand_run_id": "run_001",
    "branding": {"colors":["#635bff","#0a2540"],"fonts":["Sohne"]},
    "copy": {"brand_name":"Stripe","tagline":"Payments infrastructure","hero_headline":"Grow your revenue","tone":["confident"]},
    "design_md": "# Stripe...",
    "strategy": {"brand_archetype":"The Ruler"}
  }'
```

Response keys:

```bash
# assets: array  [{ type, url, width, height, prompt }]
# mocked: bool
```

Pull just the hero image URL:

```bash
... | jq -r '.assets[] | select(.type=="hero") | .url'
```

## /fonts

```bash
curl -s -X POST http://localhost:5678/webhook/brand/fonts \
  -H "Content-Type: application/json" \
  -d '{"url":"https://stripe.com"}'
```

Pull primary font family:

```bash
... | jq -r '.fonts[0].family'
```

## Combo: full pipeline in one shell session

```bash
URL="https://stripe.com"
RUN_ID="run_$(date +%s)"

# 1. decode
DECODE=$(curl -s -X POST http://localhost:5678/webhook/brand/decode \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$URL\"}")
echo "$DECODE" | jq -r '.copy.brand_name'

# 2. design (reshape decode + add brand_run_id)
DESIGN_REQ=$(echo "$DECODE" | jq --arg id "$RUN_ID" '. + {brand_run_id:$id}')
DESIGN=$(curl -s -X POST http://localhost:5678/webhook/brand/design \
  -H "Content-Type: application/json" \
  -d "$DESIGN_REQ")
DESIGN_MD=$(echo "$DESIGN" | jq -r '.design_md')
STRATEGY=$(echo "$DESIGN" | jq -c '.strategy')

# 3. html
HTML_REQ=$(jq -n --arg id "$RUN_ID" --arg md "$DESIGN_MD" \
  '{brand_run_id:$id, design_md:$md}')
curl -s -X POST http://localhost:5678/webhook/brand/html \
  -H "Content-Type: application/json" \
  -d "$HTML_REQ" | jq -r '.html' > "/tmp/$RUN_ID.html"

# 4. assets
ASSETS_REQ=$(echo "$DECODE" | jq \
  --arg id "$RUN_ID" \
  --arg md "$DESIGN_MD" \
  --argjson strat "$STRATEGY" \
  '{brand_run_id:$id, branding:.branding, copy:.copy, design_md:$md, strategy:$strat}')
curl -s -X POST http://localhost:5678/webhook/brand/assets \
  -H "Content-Type: application/json" \
  -d "$ASSETS_REQ" | jq '.assets[] | {type, url}'

echo "done: /tmp/$RUN_ID.html"
```
