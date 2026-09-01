# Meadowfire release

This site runs as a stateless Adore Fabric experiment on Meadowfire. The container runs as an unprivileged user, uses a read-only root filesystem, exposes no host port, and receives a 64 MB temporary filesystem.

Build from the repository root so the image can read `manual/`:

```sh
docker build --platform linux/amd64 --target test -f site/Containerfile .
```

`GET /healthz` returns `status: ok` and the first twelve characters of `ADORE_RELEASE`. The release manifest fixes the public hostname at `notlikeus.adorellc.pro`. Copy `site/deploy/adore-manifest.json` into the Adore Fabric control repository as `experiments/manifests/notlikeus.json`.

Source checks are non-editorial. `node manual/scripts/research-radar.mjs` records changed hashes and unreachable sources. A person reviews those signals before changing a rule or evidence label.
