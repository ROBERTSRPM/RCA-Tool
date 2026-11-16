#!/bin/bash
# A07: sign-up enumeration (existing test address only), sign-out/session behaviour, one forgot-password request.
source "$(dirname "$0")/lib.sh"
H=(-H "apikey: $KEY" -H 'Content-Type: application/json')
red(){ sed -E 's/"(access_token|refresh_token)":"[^"]*"/"\1":"<redacted>"/g; s/eyJ[A-Za-z0-9_.-]+/<jwt>/g'; }
echo "## sign-up with an EXISTING test address (1 request)"
curl -s -w ' HTTP %{http_code}\n' -X POST "$API/auth/v1/signup" "${H[@]}" -d "{\"email\":\"qa-user-a@rca-tool.test\",\"password\":\"$PW\"}" | red | cut -c1-600
echo "## sessions: login B, inspect token response fields"
R=$(login qa-user-b@rca-tool.test)
echo "$R" | python3 -c 'import json,sys;d=json.load(sys.stdin);print({k:(v if k in("expires_in","token_type","expires_at") else "<redacted>") for k,v in d.items() if k!="user"})'
AT=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"])'); RT=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["refresh_token"])')
echo "## refresh once, then re-use the OLD refresh token (rotation / reuse detection)"
R2=$(curl -s -X POST "$API/auth/v1/token?grant_type=refresh_token" "${H[@]}" -d "{\"refresh_token\":\"$RT\"}")
echo "$R2" | python3 -c 'import json,sys;d=json.load(sys.stdin);print("refresh1:", "ok" if "access_token" in d else d)'
AT2=$(echo "$R2" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))'); RT2=$(echo "$R2" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("refresh_token",""))')
curl -s -w ' HTTP %{http_code}\n' -X POST "$API/auth/v1/token?grant_type=refresh_token" "${H[@]}" -d "{\"refresh_token\":\"$RT\"}" | red | cut -c1-250
echo "## sign out (default scope) then use access token on REST"
curl -s -o /dev/null -w 'logout HTTP %{http_code}\n' -X POST "$API/auth/v1/logout" "${H[@]}" -H "Authorization: Bearer $AT2"
curl -s -w ' REST-after-logout HTTP %{http_code}\n' "$API/rest/v1/investigations?select=id" -H "apikey: $KEY" -H "Authorization: Bearer $AT2" | cut -c1-200
curl -s -w ' refresh-after-logout HTTP %{http_code}\n' -X POST "$API/auth/v1/token?grant_type=refresh_token" "${H[@]}" -d "{\"refresh_token\":\"$RT2\"}" | red | cut -c1-250
echo "## one forgot-password request (existing test address A)"
curl -s -w ' HTTP %{http_code}\n' -X POST "$API/auth/v1/recover" "${H[@]}" -d '{"email":"qa-user-a@rca-tool.test","redirect_to":"https://rca-tool-omega.vercel.app/reset-password"}'
echo "## 6 wrong-password logins in a row (rate-limit probe, handful only)"
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w '%{http_code} ' -X POST "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"qa-user-b@rca-tool.test","password":"wrong-password-1"}'; done; echo
