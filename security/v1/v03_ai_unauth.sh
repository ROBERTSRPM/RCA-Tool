#!/bin/bash
# AI route gate tests. usage: v03_ai_unauth.sh BASE [cookiejar]. No model calls: all rejected before the model.
source "$(dirname "$0")/lib2.sh"; B=$1; J=${2:-/dev/null}
c() { curl -s -b "$J" -w ' [HTTP %{http_code}]\n' -X POST "$B/api/ai/$1" -H 'Content-Type: application/json' "${@:2}"; }
echo "1 no auth header";            c coach -d '{}'
echo "2 garbage bearer";            c coach -H 'Authorization: Bearer abc' -d '{}'
echo "3 well-formed fake JWT";      c coach -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' -d '{}'
echo "4 anon publishable key as bearer"; c coach -H "Authorization: Bearer $KEY" -d '{}'
echo "5 invalid JSON";              c coach -H 'Authorization: Bearer abc' -d '{bad'
echo "6 GET";                       curl -s -b "$J" -w ' [HTTP %{http_code}]\n' "$B/api/ai/coach"
echo "7 oversize body (200 KB) unauth"; python3 -c 'print("{\"x\":\""+"A"*200000+"\"}")' | c coach --data-binary @-
echo "8 unknown feature";           c nope -d '{}'
