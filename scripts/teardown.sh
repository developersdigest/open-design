#!/usr/bin/env bash
# teardown.sh — destructive cleanup for open-design.
# Removes node_modules, build artifacts, and the n8n_data bind mount.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGETS=(
  "web/node_modules"
  "web/.next"
  "web/tsconfig.tsbuildinfo"
  "web/next-env.d.ts"
  "n8n_data"
)

ASSUME_YES=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      cat <<EOF
Usage: scripts/teardown.sh [--yes|-y] [--dry-run]

Removes:
  ${TARGETS[*]}

Flags:
  -y, --yes      Skip the confirmation prompt.
  --dry-run      Print what would be deleted but do not act.
  -h, --help     Show this help.
EOF
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 2
      ;;
  esac
done

echo "Teardown plan (root: $ROOT):"
echo

total_kb=0
existing=()
for t in "${TARGETS[@]}"; do
  if [ -e "$t" ]; then
    size=$(du -sh "$t" 2>/dev/null | awk '{print $1}')
    size_kb=$(du -sk "$t" 2>/dev/null | awk '{print $1}')
    total_kb=$((total_kb + size_kb))
    printf "  delete  %-40s  %s\n" "$t" "$size"
    existing+=("$t")
  else
    printf "  skip    %-40s  (not present)\n" "$t"
  fi
done

echo
if [ ${#existing[@]} -eq 0 ]; then
  echo "Nothing to delete. Done."
  exit 0
fi

# Pretty-print total.
if [ "$total_kb" -ge 1048576 ]; then
  total_human="$(awk -v k="$total_kb" 'BEGIN{printf "%.1fG", k/1048576}')"
elif [ "$total_kb" -ge 1024 ]; then
  total_human="$(awk -v k="$total_kb" 'BEGIN{printf "%.1fM", k/1024}')"
else
  total_human="${total_kb}K"
fi
echo "Total to free: $total_human"
echo

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run — no changes made."
  exit 0
fi

if [ "$ASSUME_YES" -ne 1 ]; then
  printf "Are you sure? [y/N] "
  read -r reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

for t in "${existing[@]}"; do
  echo "rm -rf $t"
  rm -rf "$t"
done

echo
echo "Freed approximately $total_human."
