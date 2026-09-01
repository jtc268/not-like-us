# Not Like Us release runbook

The short version: `NAS_PASSWORD=... bash site/deploy/ship.sh` does everything below in one go and stops at the first failure. The rest of this file is what it does, for when something needs doing by hand.

How a release of the site reaches https://notlikeus.adorellc.pro. Every step here has been run and works as written on 2026-09-01. Run from the repository root on a machine with Docker, Node 22, Python 3 with paramiko, and LAN access to Meadowfire (192.168.1.38).

## Inputs

- Secrets: `~/.config/not-like-us/notlikeus.env` on husky's Tower, and the same file on Meadowfire at `/volume7/docker/adore-fabric/.secrets/experiments/notlikeus.env` (mode 0600, owner husky). Keys: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_PASS_PRICE_ID, STRIPE_PORTAL_CONFIG_ID, NLU_KEY_SECRET, RESEND_API_KEY, NLU_FROM_EMAIL, NLU_SOURCE_REPO, NLU_SOURCE_TOKEN, NLU_X402_PAY_TO, NLU_X402_FACILITATOR.
- Meadowfire login: user `husky`, password in husky's global CLAUDE.md ("Meadowfire Synology"). Export it as `NAS_PASSWORD` for `nas.py`. The NAS has no SFTP; `nas.py put` streams files through `cat`.
- Release id: the first 12 characters of the commit sha being shipped.

## 1. Verify

```sh
node manual/scripts/validate.mjs
cd site && npm run lint && npm run build && cd ..
docker build --platform linux/amd64 --target test -f site/Containerfile .
```

Then run the built site locally with the secrets as `--var` flags and hit it (the `site/deploy/test-stream.sh` script does this; it needs a trialing Stripe test subscriber, see section 6):

```sh
cd site && set -a && . ~/.config/not-like-us/notlikeus.env && set +a && \
./node_modules/.bin/wrangler dev --ip 127.0.0.1 --port 8789 --config dist/server/wrangler.json \
  --var ADORE_RELEASE:localtest --var "STRIPE_SECRET_KEY:$STRIPE_SECRET_KEY" --var "STRIPE_PRICE_ID:$STRIPE_PRICE_ID" \
  --var "STRIPE_PASS_PRICE_ID:$STRIPE_PASS_PRICE_ID" --var "STRIPE_PORTAL_CONFIG_ID:$STRIPE_PORTAL_CONFIG_ID" \
  --var "NLU_KEY_SECRET:$NLU_KEY_SECRET" --var "RESEND_API_KEY:$RESEND_API_KEY" --var "NLU_FROM_EMAIL:$NLU_FROM_EMAIL" \
  --var "NLU_SOURCE_REPO:$NLU_SOURCE_REPO" --var "NLU_SOURCE_TOKEN:$NLU_SOURCE_TOKEN" \
  --var "NLU_X402_PAY_TO:$NLU_X402_PAY_TO" --var "NLU_X402_FACILITATOR:$NLU_X402_FACILITATOR" \
  --show-interactive-dev-session=false
```

## 2. Build and package

```sh
RELEASE=$(git rev-parse HEAD | cut -c1-12)
docker build --platform linux/amd64 -t local/adore-exp-notlikeus:$RELEASE -f site/Containerfile .
docker run -d --name nlu-smoke --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  --tmpfs /tmp:size=64m,mode=1777 --env-file ~/.config/not-like-us/notlikeus.env \
  -e ADORE_RELEASE=$RELEASE -e PORT=8080 -p 127.0.0.1:18080:8080 local/adore-exp-notlikeus:$RELEASE
curl -s http://127.0.0.1:18080/healthz          # {"status":"ok","release":"<RELEASE>"}
curl -s http://127.0.0.1:18080/v1/version        # stream.source must be "stream", not "snapshot"
docker rm -f nlu-smoke
```

If `/v1/version` says `snapshot`, outbound TLS is broken in the image. The runtime stage must install `ca-certificates`.

```powershell
# PowerShell: saves the image, gzips it, splits into 20 MB chunks, writes chunks.sha256
.\site\deploy\make-release.ps1 -Image local/adore-exp-notlikeus:$RELEASE -ArtifactRoot .\out\deploy-$RELEASE
```

Write `build.log` (the docker build command, PASS, `image_id=<local id>`) and `test.log` (what you verified) into the same folder.

## 3. Stage and upload

```sh
export NAS_PASSWORD='...'
N="python site/deploy/nas.py"
$N sudo "scripts/experiment-runtime.sh artifact-stage notlikeus $RELEASE"
$N run  "mkdir -p .staging/notlikeus/$RELEASE && chmod 700 .staging/notlikeus/$RELEASE"
for f in out/deploy-$RELEASE/image.tar.gz.part-* out/deploy-$RELEASE/chunks.sha256; do
  $N put "$f" "/volume7/docker/adore-fabric/.staging/artifacts/notlikeus/$RELEASE/$(basename $f)"
done
$N run "cd .staging/artifacts/notlikeus/$RELEASE && sha256sum -c chunks.sha256"
```

On Git Bash prefix the `nas.py` calls with `MSYS_NO_PATHCONV=1` or the remote paths get mangled.

## 4. Load and reconcile the image id

Meadowfire's Docker computes a different image id from the same archive than Docker Desktop. Load once with the local id (it fails with "loaded image id mismatch" but the image is loaded), read the id the NAS assigned, then load again with that id and put it in the metadata.

```sh
ARCHIVE_SHA=sha256:<sha of image.tar.gz, from make-release output>
$N sudo "scripts/experiment-runtime.sh artifact-load notlikeus $RELEASE $ARCHIVE_SHA local/adore-exp-notlikeus:$RELEASE sha256:<local id>" || true
NASID=$($N sudo "/var/packages/ContainerManager/target/usr/bin/docker image inspect local/adore-exp-notlikeus:$RELEASE --format '{{.Id}}'")
$N sudo "scripts/experiment-runtime.sh artifact-load notlikeus $RELEASE $ARCHIVE_SHA local/adore-exp-notlikeus:$RELEASE $NASID"
```

## 5. Candidate, apply, commit, finalize

```sh
node site/deploy/mkcandidate.mjs out/deploy-$RELEASE $RELEASE $(git rev-parse HEAD) $NASID $ARCHIVE_SHA \
  sha256:$(sha256sum out/deploy-$RELEASE/build.log | cut -d' ' -f1) sha256:$(sha256sum out/deploy-$RELEASE/test.log | cut -d' ' -f1)
(cd out/deploy-$RELEASE && tar -czf candidate.tar.gz -C candidate compose.yaml meadowfire.caddy metadata.json)
for f in candidate.tar.gz build.log test.log; do $N put out/deploy-$RELEASE/$f /volume7/docker/adore-fabric/.staging/notlikeus/$RELEASE/$f; done
$N sudo "bin/adore doctor --json > /tmp/doc.json; echo exit=\$?"
$N sudo "scripts/experiment-runtime.sh apply notlikeus $RELEASE < .staging/notlikeus/$RELEASE/candidate.tar.gz"   # prints txid
$N sudo "scripts/experiment-runtime.sh commit <txid>"
$N sudo "scripts/experiment-runtime.sh finalize <txid>"
curl -s https://notlikeus.adorellc.pro/healthz
```

The doctor must be green before apply. If it is red, apply aborts silently and leaves `deployments/.locks/notlikeus` behind; check `scripts/doctor.py` for stale hardcoded expectations (it pins the pingpong-launch release and the pingpongit.com title), fix those, remove the lock only after confirming no `adore-exp-notlikeus-<release>` candidate container exists, and apply again. Append an entry to `.staging/OPERATIONS_LOG.notlikeus.md` describing what shipped and how to roll back (`experiment-runtime.sh rollback <txid>`).

## 6. Testing the paid path without paying

Create a Stripe customer and a subscription with `trial_period_days=2` and `trial_settings[end_behavior][missing_payment_method]=cancel`. Derive its key with `node site/deploy/makekey.mjs $NLU_KEY_SECRET <cus_id> <version>` where version is the customer's `nlu_key_version` metadata (default 1). Delete the customer when done.

## 7. Recording a release test

```sh
OPENROUTER_API_KEY=... node manual/scripts/release-test.mjs --model openai/gpt-5.6-luna --judge deepseek/deepseek-v4-flash-0731 --label "GPT-5.6 Luna"
```

One model at a time. A full run is six prompts, three calls each; the two design prompts take minutes on frontier models. The record lands in `manual/benchmarks/runs/<date>-<model>/run.json` with the rendered HTML beside it and `manual/benchmarks/LEDGER.md` is regenerated. Review the judge's `observations`, set `reviewed: true`, add any kept finding to `manual/data/rules.json` with the model in `scope`, commit to the private stream repo (`jtc268/not-like-us-stream`) so subscribers get it, and copy to the public repo when you want the snapshot updated. The subscribe page shows the ledger automatically once a run exists.
