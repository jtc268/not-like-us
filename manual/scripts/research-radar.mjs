import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url);
const sources = JSON.parse(await readFile(new URL('data/sources.json', root), 'utf8'));
const previousPath = new URL('data/radar.json', root);
const previous = await readFile(previousPath, 'utf8').then(JSON.parse).catch(() => ({ sources: [] }));
const oldById = new Map(previous.sources.map((entry) => [entry.id, entry]));

const results = [];
for (const source of sources) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'not-like-us-research-radar/1.0' },
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await response.text();
    results.push({
      id: source.id,
      status: response.status,
      finalUrl: response.url,
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentHash: createHash('sha256').update(body).digest('hex').slice(0, 16),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    results.push({
      id: source.id,
      status: 'unreachable',
      error: error instanceof Error ? error.name : 'unknown',
      checkedAt: new Date().toISOString(),
      previous: oldById.get(source.id) ?? null,
    });
  } finally {
    clearTimeout(timer);
  }
}

await writeFile(previousPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), sources: results }, null, 2)}\n`);
console.log(`Checked ${results.length} research sources. Editorial rules were not changed.`);
