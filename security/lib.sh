# shared helpers: source this. Tokens are kept in env only, never printed.
API=https://ccigtztlrvgkzyppjmxt.supabase.co
KEY=sb_publishable_QkpZg53OX_eAMLJj4Ezjjw_SHOgUZ3D
PW='Qa-Test-7f3k9x2m'
login() { curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}"; }
tok() { login "$1" | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"])'; }
rest() { # rest TOKEN METHOD PATH [json body] [extra headers...]
  local t=$1 m=$2 p=$3 b=${4:-}; shift 4 2>/dev/null || shift 3
  curl -s -w '\nHTTP %{http_code}\n' -X "$m" "$API/rest/v1/$p" -H "apikey: $KEY" ${t:+-H "Authorization: Bearer $t"} -H 'Content-Type: application/json' "$@" ${b:+-d "$b"}
}
