#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW="${1:-$ROOT/templates/open-design/workflow.json}"
NODE24="/Users/j/.nvm/versions/node/v24.13.0/bin"

if [ -d "$NODE24" ]; then
  export PATH="$NODE24:$PATH"
fi

echo "== n8n cli =="
n8n --version

echo "== validate workflow =="
python3 "$ROOT/scripts/validate-workflow.py" "$WORKFLOW"

tmpdir="$(mktemp -d /tmp/open-design-n8n-cli.XXXXXX)"
trap 'rm -rf "$tmpdir"' EXIT

export N8N_USER_FOLDER="$tmpdir"
export N8N_ENCRYPTION_KEY="open-design-cli-e2e-test-key-000000000000"

echo "== isolated import =="
n8n import:workflow --input="$WORKFLOW"

echo "== export check =="
n8n export:workflow --all --output="$tmpdir/export.json"
grep -q "Brand API" "$tmpdir/export.json"

echo "cli e2e passed"
