#!/bin/bash
# A02/A07 auth probes against the Supabase Auth API. Restores any state it changes.
source "$(dirname "$0")/lib.sh"
H=(-H "apikey: $KEY" -H 'Content-Type: application/json')
echo "## public auth settings"; curl -s "$API/auth/v1/settings" -H "apikey: $KEY" | python3 -m json.tool
echo "## login: wrong password for existing user vs unknown user"
curl -s -w ' HTTP %{http_code}\n' -X POST "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"qa-user-b@rca-tool.test","password":"wrong-password-1"}'
curl -s -w ' HTTP %{http_code}\n' -X POST "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"nobody-xyz@rca-tool.test","password":"wrong-password-1"}'
echo "## open redirect via verify endpoint (bogus token, no email sent)"
for r in "https://evil.example.com/x" "//evil.example.com" "https://rca-tool-omega.vercel.app.evil.example.com/" "https://rca-tool-omega.vercel.app/reset-password"; do
  echo "redirect_to=$r"; curl -s -o /dev/null -D - "$API/auth/v1/verify?token=bogus&type=recovery&redirect_to=$r" | grep -i '^\(HTTP\|location\)' | sed -E 's/(access_token|refresh_token)=[^&]*/\1=<redacted>/g'
done
echo "## password policy: change B's password to weak values (server side), restore afterwards"
B=$(tok qa-user-b@rca-tool.test)
for p in "a" "abcdef" "password" "12345678"; do
  printf "weak '%s': " "$p"; curl -s -w ' HTTP %{http_code}\n' -X PUT "$API/auth/v1/user" "${H[@]}" -H "Authorization: Bearer $B" -d "{\"password\":\"$p\"}" | cut -c1-200 | sed -E 's/"(access_token|email|id)":"[^"]*"/"\1":"<r>"/g'
  # if accepted, restore immediately using the (still valid) token
  curl -s -o /dev/null -X PUT "$API/auth/v1/user" "${H[@]}" -H "Authorization: Bearer $B" -d "{\"password\":\"$PW\"}"
done
echo "## confirm original password works again"; login qa-user-b@rca-tool.test | python3 -c 'import json,sys;d=json.load(sys.stdin);print("login ok" if "access_token" in d else d)'
