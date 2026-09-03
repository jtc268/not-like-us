#!/usr/bin/env bash
# Ship the current commit to Meadowfire in one command.
#
#   NAS_PASSWORD='...' bash site/deploy/ship.sh
#
# Needs: Docker, Node 22, Python 3 with paramiko, the secrets file at
# ~/.config/not-like-us/notlikeus.env, and LAN access to 192.168.1.38.
# Does, in order: validate, build the image (its test stage runs lint and
# build), smoke it locked down, package it, upload it, load it with the id
# Meadowfire assigns, apply, commit, finalize, verify the public site, and
# append the operations log. Stops at the first failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${NLU_ENV:-$HOME/.config/not-like-us/notlikeus.env}"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE"; exit 1; }
# Docker on Windows needs a native path; Git Bash gives a POSIX one.
ENV_FILE_NATIVE=$(cygpath -w "$ENV_FILE" 2>/dev/null || echo "$ENV_FILE")
[ -n "${NAS_PASSWORD:-}" ] || { echo "set NAS_PASSWORD"; exit 1; }
# Only the NAS helper gets raw POSIX paths; everything else (curl -o, docker) keeps Git Bash path conversion.
native() { cygpath -w "$1" 2>/dev/null || echo "$1"; }
N="env MSYS_NO_PATHCONV=1 python $(native "$ROOT/site/deploy/nas.py")"
nput() { $N put "$(native "$1")" "$2"; }
D=/var/packages/ContainerManager/target/usr/bin/docker
SHA=$(git rev-parse HEAD)
RELEASE=${SHA:0:12}
IMAGE="local/adore-exp-notlikeus:$RELEASE"
OUT="$ROOT/out/deploy-$RELEASE"
mkdir -p "$OUT"
step() { printf '\n== %s\n' "$*"; }

step "validate"
node manual/scripts/validate.mjs
[ -z "$(git status --porcelain)" ] || echo "note: working tree has uncommitted changes; the image is built from the tree, the release id from HEAD ($RELEASE)"

step "build $IMAGE (test stage runs lint and build)"
docker build --platform linux/amd64 -t "$IMAGE" -f site/Containerfile . > "$OUT/docker-build.out" 2>&1 || { tail -30 "$OUT/docker-build.out"; exit 1; }
LOCAL_ID=$(docker image inspect "$IMAGE" --format '{{.Id}}')

step "smoke, locked down"
docker rm -f nlu-ship-smoke >/dev/null 2>&1 || true
docker run -d --name nlu-ship-smoke --read-only --cap-drop ALL --security-opt no-new-privileges:true --tmpfs /tmp:size=64m,mode=1777 --env-file "$ENV_FILE_NATIVE" -e ADORE_RELEASE="$RELEASE" -e PORT=8080 -p 127.0.0.1:18080:8080 "$IMAGE" >/dev/null
up=0
for i in $(seq 1 60); do
  if curl -s -m 3 -o "$OUT/health.json" http://127.0.0.1:18080/healthz && grep -q "\"$RELEASE\"" "$OUT/health.json"; then up=1; break; fi
  sleep 2
done
[ "$up" = 1 ] || { docker logs nlu-ship-smoke | tail -20; docker rm -f nlu-ship-smoke >/dev/null; exit 1; }
SOURCE=$(curl -s -m 60 http://127.0.0.1:18080/v1/version | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).stream.source))")
X402=$(curl -s -o /dev/null -w '%{http_code}' -m 30 http://127.0.0.1:18080/v1/x402/pass)
SUB=$(curl -s -o /dev/null -w '%{http_code}' -m 30 http://127.0.0.1:18080/subscribe)
JOB_LOCKED=$(curl -s -o /dev/null -w '%{http_code}' -m 30 -X POST http://127.0.0.1:18080/v1/jobs/reconcile)
JOB_AUTH=$(docker exec nlu-ship-smoke node -e "fetch('http://127.0.0.1:8080/v1/jobs/reconcile',{method:'POST',headers:{authorization:'Bearer '+process.env.NLU_JOB_SECRET}}).then(async r=>{const b=await r.json();console.log(r.status+':'+b.checked+':'+b.failed)})")
docker rm -f nlu-ship-smoke >/dev/null
echo "healthz ok, stream source=$SOURCE, x402=$X402, subscribe=$SUB, reconcile locked=$JOB_LOCKED auth=$JOB_AUTH"
[ "$SOURCE" = stream ] || { echo "stream source is $SOURCE, outbound TLS or source token is broken"; exit 1; }
[ "$X402" = 402 ] && [ "$SUB" = 200 ] && [ "$JOB_LOCKED" = 404 ] && [[ "$JOB_AUTH" == 200:*:0 ]] || exit 1

step "package"
docker save "$IMAGE" | gzip -1 > "$OUT/image.tar.gz"
rm -f "$OUT"/image.tar.gz.part-*
(cd "$OUT" && split -b 20m image.tar.gz image.tar.gz.part- && sha256sum -t image.tar.gz.part-* | sed "s/ */  /" > chunks.sha256)
ARCHIVE_SHA="sha256:$(sha256sum "$OUT/image.tar.gz" | cut -d' ' -f1)"
printf '%s\n' "docker build --platform linux/amd64 -t $IMAGE -f site/Containerfile ." "PASS" "image_id=$LOCAL_ID" > "$OUT/build.log"
printf '%s\n' "validate: PASS" "image test stage (lint, build): PASS" "locked-down smoke: healthz $RELEASE, stream source $SOURCE, x402 $X402, subscribe $SUB, reconcile protected and passing" > "$OUT/test.log"
echo "archive $ARCHIVE_SHA, $(ls "$OUT"/image.tar.gz.part-* | wc -l) chunks"

step "upload to Meadowfire"
$N sudo "scripts/experiment-runtime.sh artifact-stage notlikeus $RELEASE" >/dev/null
$N run "mkdir -p .staging/notlikeus/$RELEASE && chmod 700 .staging/notlikeus/$RELEASE"
for f in "$OUT"/image.tar.gz.part-* "$OUT/chunks.sha256"; do nput "$f" "/volume7/docker/adore-fabric/.staging/artifacts/notlikeus/$RELEASE/$(basename "$f")" >/dev/null; done
$N run "cd .staging/artifacts/notlikeus/$RELEASE && sha256sum -c chunks.sha256 >/dev/null && echo chunks verified"

step "load with the id Meadowfire assigns"
$N sudo "scripts/experiment-runtime.sh artifact-load notlikeus $RELEASE $ARCHIVE_SHA $IMAGE $LOCAL_ID" >/dev/null 2>&1 || true
NAS_ID=$($N sudo "$D image inspect $IMAGE --format '{{.Id}}'" | tr -d '\r')
[ "$NAS_ID" = "$LOCAL_ID" ] || { $N sudo "scripts/experiment-runtime.sh artifact-load notlikeus $RELEASE $ARCHIVE_SHA $IMAGE $NAS_ID" | grep -q '"ok": true'; echo "loaded_image_id=$NAS_ID" >> "$OUT/build.log"; }
echo "image id on Meadowfire $NAS_ID"

step "candidate"
node site/deploy/mkcandidate.mjs "$OUT" "$RELEASE" "$SHA" "$NAS_ID" "$ARCHIVE_SHA" "sha256:$(sha256sum "$OUT/build.log" | cut -d' ' -f1)" "sha256:$(sha256sum "$OUT/test.log" | cut -d' ' -f1)" >/dev/null
(cd "$OUT" && rm -f candidate.tar.gz && tar -czf candidate.tar.gz -C candidate compose.yaml meadowfire.caddy metadata.json)
for f in candidate.tar.gz build.log test.log; do nput "$OUT/$f" "/volume7/docker/adore-fabric/.staging/notlikeus/$RELEASE/$f" >/dev/null; done
$N sudo 'bin/adore doctor --json > /tmp/doc.json' || { echo "platform doctor is red; see site/deploy/RUNBOOK.md (doctor.py expectations, stale lock)"; $N sudo 'jq -c "[.checks | to_entries[] | select(.value != true) | .key]" /tmp/doc.json'; exit 1; }

step "apply, commit, finalize"
APPLY=$($N sudo "scripts/experiment-runtime.sh apply notlikeus $RELEASE < .staging/notlikeus/$RELEASE/candidate.tar.gz" 2>&1)
TXID=$(printf '%s' "$APPLY" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const m=s.match(/\"txid\":\s*\"([^\"]+)\"/);console.log(m?m[1]:'')})")
[ -n "$TXID" ] || {
  printf '%s\n' "$APPLY" | grep -vE '^\{"level"' | tail -15
  echo "apply did not return a transaction. Last transaction state and any failing sibling experiments:"
  $N sudo 'latest=$(ls -t deployments/notlikeus | head -1); jq -c .phase deployments/notlikeus/$latest/state.json 2>/dev/null; jq -c "[.experiments[]? | select(.ok != true) | .slug]" deployments/notlikeus/$latest/after-apply-doctor.json 2>/dev/null; ls deployments/.locks'
  echo "If a sibling experiment was mid-deploy, wait for its lock to clear and run again; the staged candidate is reused."
  exit 1
}
$N sudo "scripts/experiment-runtime.sh commit $TXID" | grep -q '"phase": "committed"'
$N sudo "scripts/experiment-runtime.sh finalize $TXID" | grep -q '"phase": "finalized"'

step "point notlikeus.art at $RELEASE"
cat > "$OUT/notlikeus-art.caddy" <<EOF
@exp_notlikeus_art host notlikeus.art
handle @exp_notlikeus_art {
  reverse_proxy exp-notlikeus-$RELEASE:8080
}

@exp_notlikeus_art_www host www.notlikeus.art
handle @exp_notlikeus_art_www {
  redir https://notlikeus.art{uri} permanent
}
EOF
nput "$OUT/notlikeus-art.caddy" "/volume7/docker/adore-fabric/.staging/notlikeus-art.caddy" >/dev/null
$N sudo "install -m 0644 .staging/notlikeus-art.caddy experiments/generated/caddy-meadowfire/notlikeus-art.caddy && $D exec adore-edge caddy validate --config /etc/caddy/Caddyfile && $D exec adore-edge caddy reload --config /etc/caddy/Caddyfile" >/dev/null

step "verify public"
LIVE_OLD=$(curl -s -m 20 https://notlikeus.adorellc.pro/healthz)
LIVE_APEX=$(curl -s -m 20 https://notlikeus.art/healthz)
echo "$LIVE_OLD"
echo "$LIVE_APEX"
printf '%s' "$LIVE_OLD" | grep -q "\"$RELEASE\"" || exit 1
printf '%s' "$LIVE_APEX" | grep -q "\"$RELEASE\"" || exit 1

step "operations log"
printf '\n## %s | Not Like Us release %s\n\n- Actor: ship.sh for husky.\n- Source: https://github.com/jtc268/not-like-us commit %s.\n- Image %s, id on Meadowfire %s, transaction %s.\n- Verification: validate, image test stage, locked-down smoke (stream source, x402, subscribe), apply stages, public healthz.\n- Rollback: sudo /volume7/docker/adore-fabric/scripts/experiment-runtime.sh rollback %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$RELEASE" "$SHA" "$IMAGE" "$NAS_ID" "$TXID" "$TXID" > "$OUT/ops-entry.md"
nput "$OUT/ops-entry.md" "/volume7/docker/adore-fabric/.staging/ops-entry-notlikeus.md" >/dev/null
$N run 'cat .staging/ops-entry-notlikeus.md >> .staging/OPERATIONS_LOG.notlikeus.md && rm .staging/ops-entry-notlikeus.md'
echo
echo "shipped $RELEASE (transaction $TXID)"
