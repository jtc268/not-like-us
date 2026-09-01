import { readFile, readdir } from 'node:fs/promises';

const manual = new URL('..', import.meta.url);
const repo = new URL('..', manual);
const read = (base, path) => readFile(new URL(path, base), 'utf8');
const required = ['id', 'kind', 'group', 'title', 'avoid', 'better', 'scope', 'evidence', 'sources', 'reviewed'];
const evidenceLevels = new Set(['documented', 'observed', 'corroborated', 'hypothesis']);
const normalize = (url) => url.replace(/[.,;:)]+$/, '').replace(/\/$/, '');
const failures = [];

const [rules, sources, tools, readme, prompt, skill] = await Promise.all([
  read(manual, 'data/rules.json').then(JSON.parse),
  read(manual, 'data/sources.json').then(JSON.parse),
  read(manual, 'data/tools.json').then(JSON.parse),
  read(repo, 'README.md'),
  read(manual, 'prompt.txt'),
  read(repo, 'skills/not-like-us/SKILL.md'),
]);

const sourceIds = new Set(sources.map((source) => source.id));
const ledger = new Set(sources.map((source) => normalize(source.url)));
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
  if (!skill.includes(rule.id)) failures.push(`skills/not-like-us/SKILL.md does not mention ${rule.id}`);
}

const guides = ['rules/WRITING.md', 'rules/DESIGN.md'];
for (const tool of tools) {
  for (const guide of ['WRITING.md', 'DESIGN.md']) {
    const path = `tools/${tool.id}/${guide}`;
    try {
      const body = await read(manual, path);
      if (!body.includes('Sources:') && !body.includes('Primary source:') && !body.includes('Primary sources:')) {
        failures.push(`manual/${path} has no source section`);
      }
      guides.push(path);
    } catch {
      failures.push(`manual/${path} is missing`);
    }
  }
}

for (const path of guides) {
  const body = await read(manual, path);
  for (const match of body.matchAll(/https?:\/\/[^\s)]+/g)) {
    if (!ledger.has(normalize(match[0]))) failures.push(`manual/${path} links ${match[0]}, which is not in data/sources.json`);
  }
}

if (!readme.includes('## Copy this into any AI')) failures.push('README quick-copy block is missing');
if (!readme.includes(prompt.trim())) failures.push('README paste block does not match manual/prompt.txt');
if (!readme.includes('https://github.com/jtc268/not-like-us')) failures.push('README canonical URL is missing');
if (!/^---\nname: not-like-us\ndescription: .+\n---\n/.test(skill)) failures.push('skills/not-like-us/SKILL.md is missing its frontmatter');

async function scan(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.vinext', '.git', 'dist', '.wrangler', 'out'].includes(entry.name)) continue;
    const location = new URL(entry.name, directory);
    if (entry.isDirectory()) {
      await scan(new URL(`${entry.name}/`, directory));
    } else if (/\.(md|mdc|json|mjs|ts|tsx|css|yml|yaml|txt)$/.test(entry.name)) {
      const body = await readFile(location, 'utf8');
      if (body.includes(String.fromCharCode(0x2014))) failures.push(`${location.pathname} contains an em dash`);
    }
  }
}

await scan(repo);

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join('\n'));
  process.exit(1);
}

console.log(
  `Validated ${rules.length} rules, ${sources.length} sources, ${tools.length} tool folders, ${guides.length} guides, the README paste block, and the skill.`,
);
