import { readFile, readdir } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const required = ['id', 'kind', 'group', 'title', 'avoid', 'better', 'scope', 'evidence', 'sources', 'reviewed'];
const evidenceLevels = new Set(['documented', 'observed', 'corroborated', 'hypothesis']);
const failures = [];

const [rules, sources, tools, readme] = await Promise.all([
  read('data/rules.json').then(JSON.parse),
  read('data/sources.json').then(JSON.parse),
  read('data/tools.json').then(JSON.parse),
  read('README.md'),
]);

const sourceIds = new Set(sources.map((source) => source.id));
const ruleIds = new Set();

for (const rule of rules) {
  for (const key of required) {
    if (rule[key] === undefined || rule[key] === '') failures.push(`${rule.id ?? 'unknown'} missing ${key}`);
  }
  if (ruleIds.has(rule.id)) failures.push(`duplicate rule id ${rule.id}`);
  ruleIds.add(rule.id);
  if (!evidenceLevels.has(rule.evidence)) failures.push(`${rule.id} has invalid evidence ${rule.evidence}`);
  for (const source of rule.sources ?? []) {
    if (!sourceIds.has(source)) failures.push(`${rule.id} references unknown source ${source}`);
  }
}

for (const tool of tools) {
  for (const guide of ['WRITING.md', 'DESIGN.md']) {
    try {
      const body = await read(`tools/${tool.id}/${guide}`);
      if (!body.includes('Sources:') && !body.includes('Primary source:') && !body.includes('Primary sources:')) {
        failures.push(`tools/${tool.id}/${guide} has no source section`);
      }
    } catch {
      failures.push(`tools/${tool.id}/${guide} is missing`);
    }
  }
}

if (!readme.includes('## Copy this into any AI')) failures.push('README quick-copy block is missing');
if (!readme.includes('https://github.com/jtc268/not-like-us')) failures.push('README canonical URL is missing');

async function scan(directory = new URL('.', root)) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.vinext', '.git', 'dist', '.wrangler'].includes(entry.name)) continue;
    const location = new URL(entry.name, directory);
    if (entry.isDirectory()) {
      await scan(new URL(`${entry.name}/`, directory));
    } else if (/\.(md|mdc|json|mjs|ts|tsx|css|yml|yaml|txt)$/.test(entry.name)) {
      const body = await readFile(location, 'utf8');
      if (body.includes('\u2014')) failures.push(`${location.pathname} contains an em dash`);
    }
  }
}

await scan();

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${rules.length} rules, ${sources.length} sources, and ${tools.length} tool folders.`);
