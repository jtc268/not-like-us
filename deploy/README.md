# Meadowfire release

This site runs as a stateless Adore Fabric experiment on Meadowfire. The container runs as an unprivileged user, uses a read-only root filesystem, exposes no host port, and receives a 64 MB temporary filesystem.

`GET /healthz` returns `status: ok` and the first twelve characters of `ADORE_RELEASE`. The release manifest fixes the public hostname at `notlikeus.adorellc.pro`.

Source checks are non-editorial. `npm run radar` records changed hashes and unreachable sources. A person reviews those signals before changing a rule or evidence label.
