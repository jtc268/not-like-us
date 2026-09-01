// Writes the Adore Fabric candidate bundle files for a notlikeus release.
// usage: node mkcandidate.mjs <outDir> <release12> <sourceCommit> <imageId> <archiveSha> <buildLogSha> <testLogSha>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, release, sourceCommit, imageId, archiveSha, buildLogSha, testLogSha] = process.argv.slice(2);
if (!/^[a-f0-9]{12}$/.test(release)) throw new Error('release must be 12 hex chars');
for (const sha of [imageId, archiveSha, buildLogSha, testLogSha]) {
  if (!/^sha256:[a-f0-9]{64}$/.test(sha)) throw new Error(`bad sha ${sha}`);
}
const slug = 'notlikeus';
const service = `exp-${slug}-${release}`;
const project = `adore-exp-${slug}-${release}`;
const image = `local/adore-exp-${slug}:${release}`;
const requiredSecrets = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID',
  'STRIPE_PORTAL_CONFIG_ID',
  'NLU_KEY_SECRET',
  'RESEND_API_KEY',
  'NLU_FROM_EMAIL',
  'NLU_SOURCE_REPO',
  'NLU_SOURCE_TOKEN',
];

const compose = {
  networks: { fabric: { external: true, name: 'adore-fabric-edge' } },
  services: {
    [service]: {
      cap_drop: ['ALL'],
      container_name: project,
      cpu_shares: 256,
      env_file: [`/volume7/docker/adore-fabric/.secrets/experiments/${slug}.env`],
      environment: { ADORE_RELEASE: release, PORT: '8080' },
      expose: ['8080'],
      image,
      init: true,
      mem_limit: '512m',
      networks: { fabric: { aliases: [service] } },
      pull_policy: 'never',
      read_only: true,
      restart: 'unless-stopped',
      security_opt: ['no-new-privileges:true'],
      tmpfs: ['/tmp:size=64m,mode=1777'],
    },
  },
};

const metadata = {
  archive_sha256: archiveSha,
  build_log_sha256: buildLogSha,
  container: project,
  cpu_shares: 256,
  health_path: '/healthz',
  hostname: `${slug}.adorellc.pro`,
  image,
  image_id: imageId,
  memory_limit: '512m',
  port: 8080,
  project,
  release,
  required_secrets: requiredSecrets,
  schema_version: 1,
  service,
  slug,
  source_commit: sourceCommit,
  source_repo: 'https://github.com/jtc268/not-like-us.git',
  startup_timeout_seconds: 120,
  state: 'stateless',
  test_log_sha256: testLogSha,
  tmpfs_limit: '64m',
};

const caddy = `@exp_${slug} host ${slug}.adorellc.pro\nhandle @exp_${slug} {\n  reverse_proxy ${service}:8080\n}\n`;

const dir = join(outDir, 'candidate');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'compose.yaml'), JSON.stringify(compose, null, 2) + '\n');
writeFileSync(join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
writeFileSync(join(dir, 'meadowfire.caddy'), caddy);
console.log(`candidate written to ${dir}`);
