#!/usr/bin/env bash
# End-to-end checks against a locally running site (default http://127.0.0.1:8789).
set -u
S="$(cd "$(dirname "$0")" && pwd)"; SW="$S"
BASE="${1:-http://127.0.0.1:8789}"
. "${NLU_ENV:-$HOME/.config/not-like-us/notlikeus.env}"
. "${NLU_FIXTURES:-$S/test-fixtures.env}"
pass=0; fail=0
ok() { pass=$((pass+1)); echo "PASS $1"; }
bad() { fail=$((fail+1)); echo "FAIL $1"; }
code() { curl -s -o "$S/last.body" -w '%{http_code}' -m 30 "$@"; }

echo "--- wait for server ---"
for i in $(seq 1 40); do
  if curl -s -m 3 "$BASE/healthz" | grep -q '"ok"'; then echo "up after ${i}s"; break; fi
  sleep 1
  [ "$i" = 40 ] && { echo "server did not come up"; tail -20 "$S/wrangler-local.log"; exit 1; }
done

c=$(code "$BASE/v1/version"); grep -q '"stream"' "$S/last.body" && [ "$c" = 200 ] && ok "version 200 $(node -e "const j=JSON.parse(require('fs').readFileSync('$SW/last.body','utf8'));console.log(j.stream.version, j.stream.source, 'snapshot', j.snapshot.version)")" || bad "version ($c) $(head -c 300 "$S/last.body")"

c=$(code "$BASE/v1/snapshot"); [ "$c" = 200 ] && grep -q '"skills/not-like-us/SKILL.md"' "$S/last.body" && ok "snapshot 200 with files" || bad "snapshot ($c)"
etag=$(curl -s -I -m 30 "$BASE/v1/snapshot" | grep -i '^etag' | cut -d' ' -f2 | tr -d '\r')
c=$(code -H "If-None-Match: $etag" "$BASE/v1/snapshot"); [ "$c" = 304 ] && ok "snapshot 304 on ETag $etag" || bad "snapshot etag ($c)"

c=$(code "$BASE/v1/feed"); [ "$c" = 401 ] && ok "feed without key 401" || bad "feed no key ($c)"
c=$(code -H "Authorization: Bearer nlu_bogus_00000000000000000000000000000000" "$BASE/v1/feed"); [ "$c" = 401 ] && ok "feed bad key 401" || bad "feed bad key ($c)"
c=$(code "$BASE/v1/k/nlu_bogus_00000000000000000000000000000000/SKILL.md"); [ "$c" = 401 ] && ok "path key bad 401" || bad "path key bad ($c)"

KV=$(curl -s -u "$STRIPE_SECRET_KEY:" "https://api.stripe.com/v1/customers/$TEST_CUSTOMER" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).metadata?.nlu_key_version||'1'))")
echo "current key version: $KV"
KEY=$(node "$S/makekey.mjs" "$NLU_KEY_SECRET" "$TEST_CUSTOMER" "$KV")
echo "test key: ${KEY:0:18}..."
c=$(code -H "Authorization: Bearer $KEY" "$BASE/v1/feed"); if [ "$c" = 200 ]; then ok "feed with trialing key 200: $(node -e "const j=JSON.parse(require('fs').readFileSync('$SW/last.body','utf8'));console.log(j.version, j.source, Object.keys(j.files).length+' files', 'changelog '+j.changelog.length+' chars')")"; else bad "feed with key ($c) $(head -c 300 "$S/last.body")"; fi
fetag=$(curl -s -I -m 30 -H "Authorization: Bearer $KEY" "$BASE/v1/feed" | grep -i '^etag' | cut -d' ' -f2 | tr -d '\r')
c=$(code -H "Authorization: Bearer $KEY" -H "If-None-Match: $fetag" "$BASE/v1/feed"); [ "$c" = 304 ] && ok "feed 304 on ETag $fetag" || bad "feed etag ($c)"
c=$(code "$BASE/v1/k/$KEY/SKILL.md"); [ "$c" = 200 ] && head -1 "$S/last.body" | grep -q '^---' && ok "path key SKILL.md 200 (frontmatter first line)" || bad "path SKILL.md ($c)"
c=$(code "$BASE/v1/k/$KEY/manual/tools/claude/DESIGN.md"); [ "$c" = 200 ] && ok "path key manual file 200" || bad "path manual file ($c)"
c=$(code "$BASE/v1/k/$KEY/nope.md"); [ "$c" = 404 ] && ok "path key missing file 404" || bad "path missing ($c)"
c=$(code -H "Authorization: Bearer $KEY" "$BASE/v1/standing"); [ "$c" = 200 ] && ok "standing: $(cat "$S/last.body" | tr -d '\n')" || bad "standing ($c)"

c=$(code "$BASE/skills/not-like-us/SKILL.md"); [ "$c" = 200 ] && ok "public SKILL.md 200" || bad "public skill ($c)"
c=$(code "$BASE/nlu.mjs"); [ "$c" = 200 ] && grep -q "Not Like Us Stream client" "$S/last.body" && ok "client download 200" || bad "client ($c)"
c=$(code "$BASE/subscribe"); [ "$c" = 200 ] && grep -q "Subscribe with Stripe" "$S/last.body" && ok "subscribe page 200" || bad "subscribe page ($c)"
c=$(code "$BASE/"); [ "$c" = 200 ] && grep -q 'href="/subscribe"' "$S/last.body" && grep -q 'favicon.svg' "$S/last.body" && ok "home 200 with stream link and favicon" || bad "home ($c)"
c=$(code "$BASE/welcome"); [ "$c" = 200 ] && grep -q "No key yet" "$S/last.body" && ok "welcome without session shows error path" || bad "welcome ($c)"
c=$(code "$BASE/welcome?session_id=cs_live_notreal"); [ "$c" = 200 ] && grep -q "No key yet" "$S/last.body" && ok "welcome with fake session shows error path" || bad "welcome fake ($c) $(grep -o 'No key yet' "$S/last.body" | head -1)"
c=$(code "$BASE/v1/checkout"); [ "$c" = 303 ] && ok "checkout GET redirects (no session minted)" || bad "checkout GET ($c)"
loc=$(curl -s -o /dev/null -w '%{redirect_url}' -m 30 -X POST "$BASE/v1/checkout"); case "$loc" in https://checkout.stripe.com/*) ok "checkout POST -> Stripe Checkout";; *) bad "checkout POST -> $loc";; esac
loc=$(curl -s -o /dev/null -w '%{redirect_url}' -m 30 -X POST -d "key=$KEY" "$BASE/v1/portal"); case "$loc" in https://billing.stripe.com/*) ok "portal POST -> Stripe billing portal";; *) bad "portal -> $loc $(head -c 200 "$S/last.body")";; esac
c=$(code -X POST -H 'content-type: application/json' -d '{"email":"nobody@example.invalid"}' "$BASE/v1/recover"); [ "$c" = 200 ] && ok "recover unknown email 200 neutral" || bad "recover ($c)"
c=$(code "$BASE/v1/pass"); [ "$c" = 303 ] && ok "pass GET redirects to /subscribe" || bad "pass GET ($c)"
loc=$(curl -s -o /dev/null -w '%{redirect_url}' -m 60 -X POST "$BASE/v1/pass"); case "$loc" in https://checkout.stripe.com/*) ok "pass POST -> Stripe Checkout (one-time, adjustable months)";; *) bad "pass POST -> $loc";; esac
c=$(code "$BASE/subscribe"); grep -q 'application/ld+json' "$S/last.body" && grep -q 'Pay once, no renewal' "$S/last.body" && ok "stream page carries schema.org offers and pay-once" || bad "stream page offers"

echo "--- x402 and discovery ---"
c=$(code -D "$S/last.headers" "$BASE/v1/x402/pass"); pr=$(grep -i '^payment-required:' "$S/last.headers" | cut -d' ' -f2 | tr -d '\r'); [ "$c" = 402 ] && [ -n "$pr" ] && ok "x402 pass: 402 with PAYMENT-REQUIRED header" || bad "x402 402 ($c)"
node -e "const b=Buffer.from('$pr','base64').toString();const j=JSON.parse(b);if(j.x402Version!==2)throw new Error('version');const a=j.accepts.find(x=>x.network==='eip155:8453');if(!a||a.amount!=='4990000'||a.scheme!=='exact'||!/^0x/.test(a.payTo)||a.asset!=='0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')throw new Error('base req');if(!j.extensions.bazaar)throw new Error('bazaar');console.log('  header decodes: v'+j.x402Version+', '+j.accepts.length+' networks, payTo '+a.payTo.slice(0,10))" && ok "x402 requirements decode with Base USDC, exact, 4990000, bazaar ext" || bad "x402 requirements"
grep -q '"x402Version": 2' "$S/last.body" && ok "x402 body mirrors requirements" || bad "x402 body"
c=$(code -H "PAYMENT-SIGNATURE: not-base64!" "$BASE/v1/x402/pass"); [ "$c" = 402 ] && grep -q 'not base64' "$S/last.body" && ok "x402 bad signature -> 402 with reason" || bad "x402 bad sig ($c)"
fake=$(node -e "console.log(Buffer.from(JSON.stringify({x402Version:2,accepted:{scheme:'exact',network:'eip155:8453'},payload:{signature:'0x00',authorization:{from:'0x0000000000000000000000000000000000000001',to:'0x0000000000000000000000000000000000000002',value:'4990000',validAfter:'0',validBefore:'9999999999',nonce:'0x'+'00'.repeat(32)}}})).toString('base64'))")
c=$(code -H "PAYMENT-SIGNATURE: $fake" "$BASE/v1/x402/pass"); [ "$c" = 402 ] && grep -qi 'not valid' "$S/last.body" && ok "x402 forged payload -> facilitator rejects -> 402: $(node -e "console.log(JSON.parse(require('fs').readFileSync('$SW/last.body','utf8')).error.slice(0,90))")" || bad "x402 forged ($c) $(head -c 200 "$S/last.body")"
c=$(code -X OPTIONS "$BASE/v1/x402/pass"); [ "$c" = 204 ] && ok "x402 OPTIONS 204 (CORS)" || bad "x402 options ($c)"
c=$(code "$BASE/v1/feed"); grep -q '"x402"' "$S/last.body" && ok "keyless feed carries buy links" || bad "feed buy links"
c=$(code "$BASE/.well-known/x402"); [ "$c" = 200 ] && grep -q '"kind": "seller"' "$S/last.body" && grep -q '0x8Cf14C00DdFa82Ca37A461472fBd65d5f6d476C0' "$S/last.body" && ok "well-known x402 manifest (static, with wallet)" || bad "well-known x402 ($c)"
c=$(code "$BASE/x402.json"); [ "$c" = 200 ] && grep -q '"kind": "seller"' "$S/last.body" && grep -q '0x8Cf14C00DdFa82Ca37A461472fBd65d5f6d476C0' "$S/last.body" && ok "x402.json dynamic manifest agrees on wallet" || bad "x402.json ($c)"
c=$(code "$BASE/llms.txt"); [ "$c" = 200 ] && grep -q 'Buy access' "$S/last.body" && ok "llms.txt served with buy lines" || bad "llms.txt ($c)"
c=$(code "$BASE/openapi.json"); [ "$c" = 200 ] && grep -q 'x-payment-info' "$S/last.body" && ok "openapi.json with x-payment-info" || bad "openapi ($c)"
c=$(code "$BASE/agents"); [ "$c" = 200 ] && grep -q 'PAYMENT-SIGNATURE' "$S/last.body" && ok "agents page" || bad "agents ($c)"
c=$(code "$BASE/acp/products.csv"); [ "$c" = 200 ] && grep -q 'is_eligible_checkout' "$S/last.body" && ok "ACP feed csv" || bad "acp ($c)"
c=$(code "$BASE/robots.txt"); [ "$c" = 200 ] && grep -q 'GPTBot' "$S/last.body" && ok "robots.txt admits agent crawlers" || bad "robots ($c)"

echo "--- rotate ---"
c=$(code -X POST -H "Authorization: Bearer $KEY" "$BASE/v1/rotate"); if [ "$c" = 200 ]; then NEWKEY=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SW/last.body','utf8')).key)"); ok "rotate 200 (version $(node -e "console.log(JSON.parse(require('fs').readFileSync('$SW/last.body','utf8')).version)"))"; else bad "rotate ($c)"; NEWKEY=""; fi
if [ -n "$NEWKEY" ]; then
  c=$(code -H "Authorization: Bearer $KEY" "$BASE/v1/feed"); [ "$c" = 401 ] && ok "old key rejected after rotate" || bad "old key after rotate ($c)"
  c=$(code -H "Authorization: Bearer $NEWKEY" "$BASE/v1/feed"); [ "$c" = 200 ] && ok "new key accepted" || bad "new key ($c)"
  printf 'TEST_KEY=%s\n' "$NEWKEY" > "$S/test-key.env"
fi

echo "--- client against local server ---"
T="$S/home-test"; rm -rf "$T"; mkdir -p "$T/.claude" "$T/.codex" "$T/.hermes" "$T/.openclaw/workspace"
export USERPROFILE="$T" HOME="$T" NOT_LIKE_US_HOME="$T/.config/not-like-us" NOT_LIKE_US_URL="$BASE"
node "$S/../../stream/nlu.mjs" sync > "$S/client-free.log" 2>&1; cat "$S/client-free.log" | head -14
[ -f "$T/.agents/skills/not-like-us/SKILL.md" ] && [ -f "$T/.claude/skills/not-like-us/SKILL.md" ] && [ -f "$T/.claude/rules/not-like-us.md" ] && grep -q "not-like-us:start" "$T/.codex/AGENTS.md" && ok "free sync wrote agents, claude skill+rules, codex block" || bad "free sync targets"
[ -f "$T/.hermes/skills/not-like-us/SKILL.md" ] && [ -f "$T/.openclaw/skills/not-like-us/SKILL.md" ] && grep -q "not-like-us:start" "$T/.openclaw/workspace/AGENTS.md" && ok "free sync wrote hermes and openclaw" || bad "hermes/openclaw targets"
grep -q "^version:" "$T/.claude/skills/not-like-us/SKILL.md" && ok "skill frontmatter carries version" || bad "skill version line"
if [ -n "${NEWKEY:-}" ]; then
  node "$S/../../stream/nlu.mjs" login "$NEWKEY" > "$S/client-login.log" 2>&1 && ok "client login: $(cat "$S/client-login.log")" || bad "client login: $(cat "$S/client-login.log")"
  node "$S/../../stream/nlu.mjs" sync > "$S/client-paid.log" 2>&1; head -3 "$S/client-paid.log"
  grep -q "stream" "$S/client-paid.log" && ok "paid sync reports stream" || bad "paid sync"
  node "$S/../../stream/nlu.mjs" sync --quiet --max-age 6h > "$S/client-quiet.log" 2>&1; [ ! -s "$S/client-quiet.log" ] && ok "quiet sync within max-age prints nothing" || bad "quiet sync printed: $(cat "$S/client-quiet.log")"
  node "$S/../../stream/nlu.mjs" status > "$S/client-status.log" 2>&1; head -4 "$S/client-status.log"; grep -q "active (trialing" "$S/client-status.log" && ok "status shows trialing key" || bad "status"
  node "$S/../../stream/nlu.mjs" hook > "$S/client-hook.log" 2>&1; grep -q '"SessionStart"' "$T/.claude/settings.json" && grep -q '"SessionStart"' "$T/.codex/hooks.json" && ok "hooks written for claude and codex" || bad "hooks: $(cat "$S/client-hook.log")"
  node "$S/../../stream/nlu.mjs" sync --project > "$S/client-project.log" 2>&1; [ -f "$PWD/.agents/skills/not-like-us/SKILL.md" ] && grep -q "not-like-us:start" "$PWD/AGENTS.md" && ok "project sync wrote .agents/skills and AGENTS.md block" || bad "project sync: $(cat "$S/client-project.log")"
  rm -rf "$PWD/.agents" "$PWD/AGENTS.md"
fi

echo "--- MCP handshake ---"
printf '%s\n%s\n%s\n%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"not_like_us_rules","arguments":{"tool":"claude","kind":"design"}}}' | timeout 60 node "$S/../../stream/nlu.mjs" mcp > "$S/mcp.log" 2>&1
grep -q '"serverInfo"' "$S/mcp.log" && grep -q 'not_like_us_rules' "$S/mcp.log" && grep -q 'Claude design guide' "$S/mcp.log" && ok "mcp initialize, tools/list, tools/call with claude design guide" || bad "mcp: $(head -c 400 "$S/mcp.log")"

echo; echo "PASSED $pass  FAILED $fail"
