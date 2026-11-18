#!/bin/bash
# usage: v01_headers.sh BASE_URL [cookiejar]   (curl honours the container proxy)
B=$1; J=${2:-/dev/null}
for p in / /login /app /nonexistent /privacy /api/ai/coach; do
  echo "== $p"; curl -s -b "$J" -I "$B$p" | grep -iE "^HTTP/2|content-security|x-frame|x-content|referrer|permissions-policy|strict-transport|access-control|cache-control" | cut -c1-300
done
echo "== 404 body inline <style>/<script> count"
curl -s -b "$J" "$B/nonexistent" | grep -o "<style[^>]*>" | head -3
