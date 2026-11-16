#!/bin/bash
# A04: server-side size/count limits. A handful of requests only; cleans up.
source "$(dirname "$0")/lib.sh"
B=$(tok qa-user-b@rca-tool.test)
D=$(mktemp -d)
for mb in 1 8 40; do
  python3 - $mb $D/p$mb.json <<'PY'
import sys,json
mb=int(sys.argv[1]); json.dump({"id":f"t-big-{mb}","data":{"blob":"A"*(mb*1024*1024)}},open(sys.argv[2],"w"))
PY
  echo "## insert ~${mb}MB row"; curl -s -o $D/o.txt -w 'HTTP %{http_code} time %{time_total}s\n' -X POST "$API/rest/v1/investigations" -H "apikey: $KEY" -H "Authorization: Bearer $B" -H 'Content-Type: application/json' -H 'Prefer: return=minimal' --data-binary @$D/p$mb.json; head -c 300 $D/o.txt; echo
done
echo "## bulk insert 100 small rows in ONE request (row-count limit)"
python3 -c "import json;print(json.dumps([{'id':f't-bulk-{i}','data':{'i':i}} for i in range(100)]))" > $D/bulk.json
curl -s -o $D/o.txt -w 'HTTP %{http_code}\n' -X POST "$API/rest/v1/investigations" -H "apikey: $KEY" -H "Authorization: Bearer $B" -H 'Content-Type: application/json' -H 'Prefer: return=minimal' --data-binary @$D/bulk.json; head -c 300 $D/o.txt
echo "## count"; curl -s -I "$API/rest/v1/investigations?select=id" -H "apikey: $KEY" -H "Authorization: Bearer $B" -H 'Prefer: count=exact' | grep -i content-range
echo "## arbitrary shape: data not an investigation, id mismatch, unicode"
rest $B POST investigations '{"id":"t-shape","data":[1,2,{"__proto__":{"x":1}}]}' -H 'Prefer: return=minimal'
echo "## cleanup"
curl -s -w 'HTTP %{http_code}\n' -X DELETE "$API/rest/v1/investigations?id=like.t-*" -H "apikey: $KEY" -H "Authorization: Bearer $B" -H 'Prefer: return=minimal'
rest $B GET "investigations?select=id" ""
rm -rf $D
