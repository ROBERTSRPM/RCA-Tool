#!/bin/bash
# ai_refund abuse: can a signed-in user get past the daily cap by refunding their own successful calls via PostgREST?
# Uses ai_consume/ai_refund directly (both are executable by `authenticated`). Own account only (qa-user-b).
source "$(dirname "$0")/lib2.sh"; TB=$(cat $SP/tb)
rpc() { curl -s -X POST "$API/rest/v1/rpc/$1" -H "apikey: $KEY" -H "Authorization: Bearer $TB" -H 'Content-Type: application/json' -d "$2"; echo; }
N=$(curl -s "$API/rest/v1/ai_usage?select=id&refunded=eq.false" -H "apikey: $KEY" -H "Authorization: Bearer $TB" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))'); echo "non-refunded rows now: $N"
echo "1 direct consume with huge limits (a 'successful call'):"; R=$(rpc ai_consume '{"p_feature":"audit","p_daily":1000,"p_burst":60}'); echo "$R"; X=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["usage_id"])')
echo "2 consume with p_daily=$((N+1)) (cap now reached):"; rpc ai_consume "{\"p_feature\":\"audit\",\"p_daily\":$((N+1)),\"p_burst\":60}"
echo "3 refund the successful call $X:"; rpc ai_refund "{\"p_id\":$X}"
echo "4 consume again with the same cap (bypass if ok=true):"; rpc ai_consume "{\"p_feature\":\"audit\",\"p_daily\":$((N+1)),\"p_burst\":60}"
echo "5 refund cap: 6 more consume+refund cycles (expect 4 more true then false; 5 per 24 h total)"
for i in 1 2 3 4 5 6; do I=$(rpc ai_consume '{"p_feature":"audit","p_daily":1000,"p_burst":60}' | python3 -c 'import json,sys;print(json.load(sys.stdin).get("usage_id"))'); printf "cycle $i id=$I refund="; rpc ai_refund "{\"p_id\":$I}"; done
