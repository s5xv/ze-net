#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./bin/post-changelog.sh <entry text>"
  exit 1
fi

ENTRY="$1"
URL="https://ze-net-beryl.vercel.app/api/changelog"

echo "Sending changelog entry..."
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $VITE_ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$ENTRY\"}" \
  | python3 -m json.tool 2>/dev/null || cat
