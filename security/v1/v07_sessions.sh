#!/bin/bash
# F-06 re-check on a fresh session of B (own session only): refresh-token reuse, logout effect on access token.
source "$(dirname "$0")/lib2.sh"
S=$(curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H 'Content-Type: application/json' -d "{\"email\":\"qa-user-b@rca-tool.test\",\"password\":\"$PW\"}")
AT=$(echo "$S" | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"])'); RT=$(echo "$S" | python3 -c 'import json,sys;print(json.load(sys.stdin)["refresh_token"])')
ref() { curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/v1/token?grant_type=refresh_token" -H "apikey: $KEY" -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$1\"}"; }
echo "refresh #1 with RT: $(ref $RT)"; sleep 25; echo "refresh #2 reuse of same RT after 25 s: $(ref $RT)"
echo "logout (default scope = global: ends ALL sessions of the user): $(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/v1/logout" -H "apikey: $KEY" -H "Authorization: Bearer $AT")"
echo "access token after logout, GET investigations: $(curl -s -o /dev/null -w '%{http_code}' "$API/rest/v1/investigations?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $AT")"
echo "auth/v1/user after logout: $(curl -s -o /dev/null -w '%{http_code}' "$API/auth/v1/user" -H "apikey: $KEY" -H "Authorization: Bearer $AT")"
echo "refresh after logout: $(ref $RT)"
