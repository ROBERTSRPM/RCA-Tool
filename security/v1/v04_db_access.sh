#!/bin/bash
# DB-level access control for ai_usage and the SECURITY DEFINER functions. B = attacker, A = victim (QA accounts).
source "$(dirname "$0")/lib2.sh"
TB=$(cat $SP/tb); TA=$(cat $SP/ta); AID=461cf7e5-279f-4af3-b7c5-6f1495d257de; BID=b6e455b6-dcf4-4557-bc90-ce7c1797d162
rpc() { curl -s -w ' [HTTP %{http_code}]\n' -X POST "$API/rest/v1/rpc/$2" -H "apikey: $KEY" ${1:+-H "Authorization: Bearer $1"} -H 'Content-Type: application/json' -d "$3"; }
echo "== A's own ai_usage ids (as A)"; A_IDS=$(curl -s "$API/rest/v1/ai_usage?select=id&order=id.desc&limit=2" -H "apikey: $KEY" -H "Authorization: Bearer $TA"); echo "$A_IDS" | head -c 120; echo
A_ID=$(echo "$A_IDS" | python3 -c 'import json,sys;print(json.load(sys.stdin)[0]["id"])')
echo "== B select ai_usage (own only)"; rest $TB GET "ai_usage?select=id,user_id&limit=5"
echo "== B select ai_usage filtered to A"; rest $TB GET "ai_usage?select=id&user_id=eq.$AID"
echo "== B select ai_usage id=A's id"; rest $TB GET "ai_usage?select=id&id=eq.$A_ID"
echo "== B insert ai_usage directly"; rest $TB POST ai_usage "{\"feature\":\"x\"}"
echo "== B insert ai_usage as A"; rest $TB POST ai_usage "{\"feature\":\"x\",\"user_id\":\"$AID\"}"
echo "== B update A's ai_usage (refunded=true)"; rest $TB PATCH "ai_usage?id=eq.$A_ID" '{"refunded":true}' -H 'Prefer: return=representation'
echo "== B delete A's ai_usage"; rest $TB DELETE "ai_usage?user_id=eq.$AID" '' -H 'Prefer: return=representation'
echo "== B refunds A's usage id via ai_refund"; rpc $TB ai_refund "{\"p_id\":$A_ID}"
echo "== anon ai_consume"; rpc "" ai_consume '{"p_feature":"x","p_daily":1000,"p_burst":60}'
echo "== anon ai_refund"; rpc "" ai_refund '{"p_id":1}'
echo "== anon delete_own_account"; rpc "" delete_own_account '{}'
echo "== anon select ai_usage / investigations / assets"; for t in ai_usage investigations assets; do rest "" GET "$t?select=id&limit=1"; done
echo "== B refund of a nonexistent id"; rpc $TB ai_refund '{"p_id":999999999}'
echo "== other RPC/relations probe"; rpc $TB nonexistent_fn '{}' | head -c 300; echo
curl -s "$API/rest/v1/" -H "apikey: $KEY" -H "Authorization: Bearer $TB" | python3 -c 'import json,sys;d=json.load(sys.stdin);print("openapi paths:",sorted(d.get("paths",{}).keys()))'
echo "== graphql endpoint"; curl -s -w ' [HTTP %{http_code}]\n' -X POST "$API/graphql/v1" -H "apikey: $KEY" -H "Authorization: Bearer $TB" -H 'Content-Type: application/json' -d '{"query":"{__typename}"}' | head -c 300
