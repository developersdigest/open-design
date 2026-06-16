#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# smoke.sh — Open Design n8n webhook smoke test
#
# Hits each of the 4 brand webhooks in order and reports pass/fail with
# latency for each step. Later steps reuse outputs from earlier steps, so
# a failure aborts the chain.
#
# Usage:
#   bash scripts/smoke.sh           # run full chain (decode -> design -> html -> assets)
#   bash scripts/smoke.sh --quick   # only run /decode as a sanity check
#
# Env:
#   N8N_BASE_URL   Override the n8n webhook base URL.
#                  Default: http://localhost:5678/webhook/brand
#
# Requires: bash, curl, jq.
# Exits 0 if every requested step passes, 1 otherwise.
# ----------------------------------------------------------------------------

set -u

BASE_URL="${N8N_BASE_URL:-http://localhost:5678/webhook/brand}"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
DIM=$'\033[2m'
RESET=$'\033[0m'

QUICK=0
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=1
fi

# deps
for dep in curl jq; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "${RED}[FAIL]${RESET} missing required tool: $dep" >&2
    exit 1
  fi
done

FAILED=0

# call NAME PATH JSON_BODY  -> sets RESP, prints status line
call() {
  local name="$1" path="$2" body="$3"
  local url="${BASE_URL}${path}"
  local tmp_body tmp_headers start_ns end_ns elapsed_ms http_code
  tmp_body="$(mktemp)"
  tmp_headers="$(mktemp)"

  start_ns=$(date +%s000)
  if command -v gdate >/dev/null 2>&1; then
    start_ns=$(gdate +%s%3N)
  elif date +%s%3N 2>/dev/null | grep -q '^[0-9]\+$'; then
    start_ns=$(date +%s%3N)
  fi

  http_code=$(curl -sS -o "$tmp_body" -D "$tmp_headers" -w "%{http_code}" \
    -X POST "$url" \
    -H "Content-Type: application/json" \
    --max-time 180 \
    -d "$body" 2>/dev/null || echo "000")

  if command -v gdate >/dev/null 2>&1; then
    end_ns=$(gdate +%s%3N)
  elif date +%s%3N 2>/dev/null | grep -q '^[0-9]\+$'; then
    end_ns=$(date +%s%3N)
  else
    end_ns=$(date +%s000)
  fi
  elapsed_ms=$(( end_ns - start_ns ))

  RESP="$(cat "$tmp_body")"
  rm -f "$tmp_body" "$tmp_headers"

  if [[ "$http_code" != "200" ]]; then
    printf "%s[FAIL]%s %-8s %s  (HTTP %s, %dms)\n" "$RED" "$RESET" "$name" "$url" "$http_code" "$elapsed_ms"
    if [[ -n "$RESP" ]]; then
      printf "%s       body: %s%s\n" "$DIM" "$(echo "$RESP" | head -c 300)" "$RESET"
    fi
    return 1
  fi

  printf "%s[OK]%s   %-8s %s  (%dms)\n" "$GREEN" "$RESET" "$name" "$url" "$elapsed_ms"
  return 0
}

# assert that jq expr returns non-empty / non-null
assert_jq() {
  local name="$1" expr="$2" json="$3"
  local val
  val=$(echo "$json" | jq -r "$expr" 2>/dev/null || echo "")
  if [[ -z "$val" || "$val" == "null" ]]; then
    printf "%s[FAIL]%s %-8s missing field: %s\n" "$RED" "$RESET" "$name" "$expr"
    printf "%s       body: %s%s\n" "$DIM" "$(echo "$json" | head -c 300)" "$RESET"
    return 1
  fi
  printf "%s       %s = %s%s\n" "$DIM" "$expr" "$(echo "$val" | head -c 80)" "$RESET"
  return 0
}

echo "Open Design smoke test — base: $BASE_URL"
echo

# ---------- step 1: /decode ----------
DECODE_BODY='{"url":"https://stripe.com"}'
if ! call "decode" "/decode" "$DECODE_BODY"; then
  exit 1
fi
DECODE_RESP="$RESP"
if ! assert_jq "decode" ".copy.brand_name" "$DECODE_RESP"; then
  exit 1
fi

if [[ $QUICK -eq 1 ]]; then
  echo
  echo "${GREEN}[OK]${RESET} quick smoke passed"
  exit 0
fi

# ---------- step 2: /design ----------
DESIGN_BODY=$(echo "$DECODE_RESP" | jq -c '{
  brand_run_id: "test",
  source_url: .source_url,
  branding: .branding,
  copy: .copy
}')
if ! call "design" "/design" "$DESIGN_BODY"; then
  FAILED=1
fi
DESIGN_RESP="$RESP"
if [[ $FAILED -eq 0 ]]; then
  if ! assert_jq "design" ".design_md" "$DESIGN_RESP"; then
    FAILED=1
  fi
fi

# ---------- step 3: /html ----------
if [[ $FAILED -eq 0 ]]; then
  HTML_BODY=$(echo "$DESIGN_RESP" | jq -c '{
    brand_run_id: "test",
    design_md: .design_md
  }')
  if ! call "html" "/html" "$HTML_BODY"; then
    FAILED=1
  fi
  HTML_RESP="$RESP"
  if [[ $FAILED -eq 0 ]]; then
    HTML_VAL=$(echo "$HTML_RESP" | jq -r '.html' 2>/dev/null || echo "")
    if [[ -z "$HTML_VAL" || "$HTML_VAL" == "null" ]]; then
      printf "%s[FAIL]%s %-8s missing .html field\n" "$RED" "$RESET" "html"
      FAILED=1
    else
      lower=$(printf "%s" "$HTML_VAL" | head -c 20 | tr '[:upper:]' '[:lower:]')
      case "$lower" in
        "<!doctype"*)
          printf "%s       html starts with <!doctype (len=%d)%s\n" "$DIM" "${#HTML_VAL}" "$RESET"
          ;;
        *)
          printf "%s[FAIL]%s %-8s html does not start with <!doctype (got: %s)\n" "$RED" "$RESET" "html" "$lower"
          FAILED=1
          ;;
      esac
    fi
  fi
fi

# ---------- step 4: /assets ----------
if [[ $FAILED -eq 0 ]]; then
  ASSETS_BODY=$(jq -cn \
    --argjson branding  "$(echo "$DECODE_RESP" | jq '.branding')" \
    --argjson copy      "$(echo "$DECODE_RESP" | jq '.copy')" \
    --argjson strategy  "$(echo "$DESIGN_RESP" | jq '.strategy // {}')" \
    --arg     design_md "$(echo "$DESIGN_RESP" | jq -r '.design_md')" \
    '{brand_run_id: "test", branding: $branding, copy: $copy, design_md: $design_md, strategy: $strategy}')
  if ! call "assets" "/assets" "$ASSETS_BODY"; then
    FAILED=1
  fi
  ASSETS_RESP="$RESP"
  if [[ $FAILED -eq 0 ]]; then
    if ! assert_jq "assets" ".assets[0].url" "$ASSETS_RESP"; then
      FAILED=1
    fi
  fi
fi

echo
if [[ $FAILED -eq 0 ]]; then
  echo "${GREEN}[OK]${RESET} all webhooks passed"
  exit 0
else
  echo "${RED}[FAIL]${RESET} one or more webhooks failed"
  exit 1
fi
