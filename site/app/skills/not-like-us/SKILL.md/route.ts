import { snapshotFeed, text } from '../../../../lib/stream';

// The free skill at a stable URL, for tools that install skills from a link:
//   hermes skills install https://notlikeus.art/skills/not-like-us/SKILL.md
export async function GET() {
  const snapshot = snapshotFeed();
  return text(snapshot.files['skills/not-like-us/SKILL.md'], 'text/markdown; charset=utf-8', 200, {
    'cache-control': 'public, max-age=3600',
    'x-not-like-us-version': snapshot.version,
  });
}
