#!/bin/bash
# A01: RLS bypass attempts as user B against user A's rows. Cleans up after itself.
source "$(dirname "$0")/lib2.sh"
A=$(tok qa-user-a@rca-tool.test); B=$(tok qa-user-b@rca-tool.test)
UA=$(echo $A | cut -d. -f2 | python3 -c 'import sys,base64,json;s=sys.stdin.read().strip();s+="="*(-len(s)%4);print(json.loads(base64.urlsafe_b64decode(s))["sub"])')
UB=$(echo $B | cut -d. -f2 | python3 -c 'import sys,base64,json;s=sys.stdin.read().strip();s+="="*(-len(s)%4);print(json.loads(base64.urlsafe_b64decode(s))["sub"])')
SA="sample-$UA"
echo "UA=$UA UB=$UB"
t(){ echo; echo "### $1"; shift; "$@"; }
t "1 B select A's row by id"            rest $B GET "investigations?id=eq.$SA&select=id" ""
t "2 B select with user_id filter"      rest $B GET "investigations?user_id=eq.$UA&select=id" ""
t "3 B update A's row"                  rest $B PATCH "investigations?id=eq.$SA" '{"data":{"pwned":true}}' -H 'Prefer: return=representation'
t "4 B delete A's row"                  rest $B DELETE "investigations?id=eq.$SA" "" -H 'Prefer: return=representation'
t "5 B insert row with user_id=A"       rest $B POST "investigations" "{\"id\":\"t-spoof-1\",\"user_id\":\"$UA\",\"data\":{}}" -H 'Prefer: return=representation'
t "6 B insert own row (control)"        rest $B POST "investigations" '{"id":"t-b-own-1","data":{"x":1}}' -H 'Prefer: return=representation'
t "7 B change own row user_id to A"     rest $B PATCH "investigations?id=eq.t-b-own-1" "{\"user_id\":\"$UA\"}" -H 'Prefer: return=representation'
t "8 B upsert onto A's id (merge-duplicates)" rest $B POST "investigations?on_conflict=id" "{\"id\":\"$SA\",\"data\":{\"pwned\":true}}" -H 'Prefer: resolution=merge-duplicates,return=representation'
t "9 B plain insert colliding A's id"   rest $B POST "investigations" "{\"id\":\"$SA\",\"data\":{\"pwned\":true}}" -H 'Prefer: return=representation'
t "10 B insert with ignore-duplicates on A's id" rest $B POST "investigations?on_conflict=id" "{\"id\":\"$SA\",\"data\":{}}" -H 'Prefer: resolution=ignore-duplicates,return=representation'
t "11 A creates row id=t-collide; B inserts same id (existence oracle?)" rest $A POST "investigations" '{"id":"t-collide","data":{"a":1}}' -H 'Prefer: return=minimal'
t "11b B inserts t-collide"             rest $B POST "investigations" '{"id":"t-collide","data":{"b":1}}' -H 'Prefer: return=minimal'
t "12 B insert, null user_id explicit"  rest $B POST "investigations" '{"id":"t-b-null","user_id":null,"data":{}}' -H 'Prefer: return=minimal'
t "13 B select all (should be only own)" rest $B GET "investigations?select=id,user_id" ""
t "14 anon insert"                       rest "" POST "investigations" '{"id":"t-anon","data":{}}' ""
t "15 anon with publishable key as Bearer" rest $KEY GET "investigations?select=id" ""
t "16 B RPC / other tables listing (OpenAPI)" bash -c "curl -s -o /dev/null -w 'HTTP %{http_code}\n' '$API/rest/v1/' -H 'apikey: $KEY' -H 'Authorization: Bearer $B'"
t "17 B access auth.users via REST"      rest $B GET "users?select=*" ""
t "18 B storage buckets list"            bash -c "curl -s -w '\nHTTP %{http_code}\n' '$API/storage/v1/bucket' -H 'apikey: $KEY' -H 'Authorization: Bearer $B'"
t "19 A view of own row unchanged"       rest $A GET "investigations?id=eq.$SA&select=data->>title,updated_at" ""
AS=$(curl -s "$API/rest/v1/assets?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $A" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d[0]["id"] if d else "")')
t "20 assets: B select A's asset id=$AS" rest $B GET "assets?id=eq.$AS&select=id,user_id" ""
t "21 assets: B update A's asset" rest $B PATCH "assets?id=eq.$AS" '{"data":{"pwned":true}}' -H 'Prefer: return=representation'
t "22 assets: B delete A's asset" rest $B DELETE "assets?id=eq.$AS" "" -H 'Prefer: return=representation'
t "23 assets: B insert as user_id=A" rest $B POST assets "{\"id\":\"t-as-spoof\",\"user_id\":\"$UA\",\"data\":{}}" -H 'Prefer: return=minimal'
t "24 assets: B upsert onto A's asset id" rest $B POST "assets?on_conflict=id" "{\"id\":\"$AS\",\"data\":{\"pwned\":true}}" -H 'Prefer: resolution=merge-duplicates,return=minimal'
t "25 assets: B select all (own only)" rest $B GET "assets?select=id,user_id" ""
t "26 assets: oversize (70 KB) as B" bash -c "python3 -c 'import json;print(json.dumps({\"id\":\"t-as-big\",\"data\":{\"b\":\"A\"*70000}}))' | curl -s -w ' HTTP %{http_code}\n' -X POST '$API/rest/v1/assets' -H 'apikey: $KEY' -H 'Authorization: Bearer $B' -H 'Content-Type: application/json' --data-binary @-"
t "27 investigations: 6 MiB row as B (cap 5 MiB)" bash -c "python3 -c 'import json;print(json.dumps({\"id\":\"t-big6\",\"data\":{\"b\":\"A\"*(6*1048576)}}))' | curl -s -w ' HTTP %{http_code}\n' -X POST '$API/rest/v1/investigations' -H 'apikey: $KEY' -H 'Authorization: Bearer $B' -H 'Content-Type: application/json' --data-binary @-"
t "28 investigations: data not an object" rest $B POST investigations '{"id":"t-arr","data":[1]}' -H 'Prefer: return=minimal'
t "29 investigations: forge sample- id of A" rest $B POST investigations "{\"id\":\"sample-$UA\",\"data\":{}}" -H 'Prefer: return=minimal'
echo; echo "### cleanup"
rest $B DELETE "assets?id=in.(t-as-spoof,t-as-big)" "" ""
rest $A DELETE "investigations?id=eq.t-collide" "" -H 'Prefer: return=minimal'
for i in t-b-own-1 t-b-null t-spoof-1; do rest $B DELETE "investigations?id=eq.$i" "" -H 'Prefer: return=minimal'; done
rest $A DELETE "investigations?id=in.(t-b-own-1,t-b-null,t-spoof-1,t-collide)" "" ""
echo "--- final"; rest $A GET "investigations?select=id" ""; rest $B GET "investigations?select=id" ""
