#!/bin/bash
S=https://rca-tool-omega.vercel.app
for p in / /login /app /_next/static/chunks/$(curl -s $S/login | grep -o 'chunks/[^"]*\.js' | head -1 | sed 's#chunks/##'); do
  echo "=== $p"; curl -sI "$S$p" | grep -iE '^(HTTP/2|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|strict-transport|cross-origin|access-control|server|x-powered|cache-control)' ; done
echo "=== missing-page / error behaviour"; curl -s -D - -o /tmp/claude-0/404.html $S/does-not-exist | grep -iE '^(HTTP|x-)' ; grep -o '<title>[^<]*' /tmp/claude-0/404.html
echo "=== POST to site (server actions / API routes?)"; curl -s -o /dev/null -w '%{http_code}\n' -X POST $S/api/anything -d x=1
echo "=== source maps / exposed files"; for f in /_next/static/chunks/main.js.map /.next/BUILD_ID /package.json /next.config.js /.env.local /.vercel/project.json /_next/data/x.json /README.md /qa/README.md; do echo "$f $(curl -s -o /dev/null -w '%{http_code}' $S$f)"; done
echo "=== CORS on Supabase REST (preflight from foreign origin)"; curl -s -D - -o /dev/null -X OPTIONS "https://ccigtztlrvgkzyppjmxt.supabase.co/rest/v1/investigations" -H 'Origin: https://evil.example.com' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: authorization,apikey' | grep -iE '^(HTTP|access-control)'
