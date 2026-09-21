#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./APPLY-TO-REPO.sh /path/to/programyst22-app
#
# This script overlays the redesigned files onto a COMPLETE clone of the repo.
# It makes a timestamped backup of overwritten files first.

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 /path/to/programyst22-app"
  exit 2
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -d "$TARGET/frontend" ]]; then
  echo "Target does not look like the OKA Bau repository: $TARGET"
  exit 2
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$TARGET/.oka-redesign-backup-$STAMP"
mkdir -p "$BACKUP"

cd "$HERE"
while IFS= read -r -d '' file; do
  rel="${file#./}"
  dst="$TARGET/$rel"
  if [[ -f "$dst" ]]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp "$dst" "$BACKUP/$rel"
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$file" "$dst"
done < <(find frontend -type f -print0)

echo "Overlay complete."
echo "Backup: $BACKUP"
echo
echo "Next:"
echo "  cd \"$TARGET/frontend\""
echo "  yarn install"
echo "  node scripts/qa-redesign.cjs"
echo "  npx tsc --noEmit"
echo "  npx expo lint"
echo "  npx expo-doctor"
