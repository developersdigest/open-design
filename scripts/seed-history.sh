#!/usr/bin/env bash
# Seed the database with sample brand runs by hitting the n8n webhooks.
# Pure bash + curl + jq.

set -u

N8N_BASE_URL="${N8N_BASE_URL:-http://localhost:5678/webhook/brand}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      echo "Usage: $0 [--dry-run]"
      echo "  N8N_BASE_URL (env): base webhook URL (default: http://localhost:5678/webhook/brand)"
      exit 0
      ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EXAMPLES_DIR="$ROOT_DIR/examples"

BRANDS=(stripe vercel linear)
TOTAL=${#BRANDS[@]}
FAILURES=0
START_TS=$(date +%s)

gen_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  else
    python3 -c 'import uuid;print(uuid.uuid4())'
  fi
}

post_json() {
  # post_json <url> <json-body>
  local url="$1"
  local body="$2"
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] POST $url" >&2
    echo "$body" | jq . >&2 2>/dev/null || echo "$body" >&2
    echo '{}'
    return 0
  fi
  curl -sS -X POST -H 'Content-Type: application/json' --data "$body" "$url"
}

post_file() {
  # post_file <url> <file>
  local url="$1"
  local file="$2"
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] POST $url (file: $file)" >&2
    cat "$file" >&2
    echo >&2
    echo '{}'
    return 0
  fi
  curl -sS -X POST -H 'Content-Type: application/json' --data-binary "@$file" "$url"
}

run_brand() {
  local idx="$1"
  local brand="$2"
  local decode_file="$EXAMPLES_DIR/decode-${brand}.json"

  printf '[%d/%d] %s ... ' "$idx" "$TOTAL" "$brand"

  if [ ! -f "$decode_file" ]; then
    echo "[FAIL] missing $decode_file"
    return 1
  fi

  # 1) /decode
  local decode_resp
  decode_resp=$(post_file "$N8N_BASE_URL/decode" "$decode_file") || {
    echo "[FAIL] decode request errored"
    return 1
  }

  local brand_run_id source_url branding copy strategy
  brand_run_id=$(echo "$decode_resp" | jq -r '.id // .brand_run_id // empty' 2>/dev/null)
  if [ -z "$brand_run_id" ] || [ "$brand_run_id" = "null" ]; then
    brand_run_id=$(gen_uuid)
  fi
  BRAND_RUN_ID="$brand_run_id"

  source_url=$(jq -r '.url' "$decode_file")
  branding=$(echo "$decode_resp" | jq -c '.branding // {}' 2>/dev/null)
  copy=$(echo "$decode_resp"     | jq -c '.copy // {}'     2>/dev/null)
  strategy=$(echo "$decode_resp" | jq -c '.strategy // {}' 2>/dev/null)
  [ -z "$branding" ] && branding='{}'
  [ -z "$copy" ]     && copy='{}'
  [ -z "$strategy" ] && strategy='{}'

  # 2) /design
  local design_body design_resp design_md
  design_body=$(jq -nc \
    --arg id "$BRAND_RUN_ID" \
    --arg url "$source_url" \
    --argjson branding "$branding" \
    --argjson copy "$copy" \
    '{brand_run_id:$id, source_url:$url, branding:$branding, copy:$copy}')

  design_resp=$(post_json "$N8N_BASE_URL/design" "$design_body") || {
    echo "[FAIL] design request errored"
    return 1
  }
  design_md=$(echo "$design_resp" | jq -r '.design_md // empty' 2>/dev/null)
  [ -z "$design_md" ] && design_md=""

  # 3) /html
  local html_body
  html_body=$(jq -nc \
    --arg id "$BRAND_RUN_ID" \
    --arg md "$design_md" \
    '{brand_run_id:$id, design_md:$md}')
  post_json "$N8N_BASE_URL/html" "$html_body" >/dev/null || {
    echo "[FAIL] html request errored"
    return 1
  }

  # 4) /assets
  local assets_body
  assets_body=$(jq -nc \
    --arg id "$BRAND_RUN_ID" \
    --argjson branding "$branding" \
    --argjson copy "$copy" \
    --arg md "$design_md" \
    --argjson strategy "$strategy" \
    '{brand_run_id:$id, branding:$branding, copy:$copy, design_md:$md, strategy:$strategy}')
  post_json "$N8N_BASE_URL/assets" "$assets_body" >/dev/null || {
    echo "[FAIL] assets request errored"
    return 1
  }

  echo "[OK]"
  return 0
}

i=0
for brand in "${BRANDS[@]}"; do
  i=$((i+1))
  if ! run_brand "$i" "$brand"; then
    FAILURES=$((FAILURES+1))
  fi
done

END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))

echo
echo "Summary: $((TOTAL - FAILURES))/$TOTAL runs succeeded in ${ELAPSED}s"

if [ "$FAILURES" -gt 0 ]; then
  exit 1
fi
exit 0
