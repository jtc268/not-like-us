// The release test. Runs the private benchmark suite against one model twice,
// once with no system prompt (the model's defaults) and once with the Not Like
// Us skill as the system prompt, then asks a judge model to name the defaults
// in the first output using the rule catalog. Writes one JSON record plus the
// rendered HTML for design prompts, and regenerates the ledger.
//
//   OPENROUTER_API_KEY=... node manual/scripts/release-test.mjs --model openai/gpt-5.6-luna
//     [--base https://openrouter.ai/api/v1] [--key-env OPENROUTER_API_KEY]
//     [--judge deepseek/deepseek-v4-flash-0731] [--only site,poem] [--label "GPT-5.6 Luna"]
//
// The key comes from the env var named by --key-env. Any OpenAI-compatible chat
// completions endpoint works. OpenRouter is the default because it exposes every
// lab's models by name, which is the point of the test.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const manual = new URL('..', import.meta.url);
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const model = option('--model');
if (!model) {
  console.error('usage: node manual/scripts/release-test.mjs --model <id> [--base url] [--key-env NAME] [--judge id] [--only a,b] [--label text]');
  process.exit(1);
}
const base = (option('--base', 'https://openrouter.ai/api/v1')).replace(/\/$/, '');
const keyEnv = option('--key-env', 'OPENROUTER_API_KEY');
const judge = option('--judge', model);
const label = option('--label', model);
const only = option('--only')?.split(',');
const benchmarkDir = process.env.NLU_RELEASE_BENCH_DIR?.trim() || join(homedir(), '.config', 'not-like-us', 'benchmarks');
const suiteFile = process.env.NLU_RELEASE_SUITE?.trim() || join(benchmarkDir, 'suite.json');

async function apiKey() {
  if (process.env[keyEnv]) return process.env[keyEnv].trim();
  throw new Error(`No API key: set ${keyEnv}`);
}

const key = await apiKey();
const suite = JSON.parse(await readFile(suiteFile, 'utf8'));
const rules = JSON.parse(await readFile(new URL('data/rules.json', manual), 'utf8'));
// The guided pass uses what a subscriber's agent actually carries: the paste
// block and the two universal rule sets, as standing instructions.
const guidance = [
  await readFile(new URL('prompt.txt', manual), 'utf8'),
  await readFile(new URL('rules/WRITING.md', manual), 'utf8'),
  await readFile(new URL('rules/DESIGN.md', manual), 'utf8'),
  'Produce only the requested work. No preamble and no notes about these rules.',
].join('\n\n');

async function complete(modelId, messages, attempt = 1) {
  const controller = new AbortController();
  // Frontier models with extended thinking can take several minutes on a full page.
  const timer = setTimeout(() => controller.abort(), 600_000);
  const started = Date.now();
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? `HTTP ${response.status}`);
    const text = data.choices?.[0]?.message?.content ?? '';
    return { text, ms: Date.now() - started, usage: data.usage ?? null, model: data.model ?? modelId };
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
      return complete(modelId, messages, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function htmlOf(text) {
  const fenced = /```(?:html)?\s*([\s\S]*?)```/i.exec(text);
  const body = fenced ? fenced[1] : text;
  return /<html|<!doctype/i.test(body) ? body.trim() : null;
}

const catalog = rules.map((rule) => `${rule.id}: ${rule.title}. Avoid: ${rule.avoid}`).join('\n');

async function observe(prompt, output) {
  const system = `You check generated work against a rule catalog. Answer with a JSON array only. Each item: {"rule": "<rule id from the catalog, or NEW>", "evidence": "<a short quote or a concrete description of the element>", "note": "<one sentence on why it is a recognizable default>"}. Report only what is in the output. Three to eight items. No commentary outside the JSON.`;
  const user = `Catalog:\n${catalog}\n\nPrompt given to the model:\n${prompt}\n\nThe model's output:\n${output.slice(0, 12000)}`;
  const result = await complete(judge, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  const match = /\[[\s\S]*\]/.exec(result.text);
  try {
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [{ rule: 'UNPARSED', evidence: result.text.slice(0, 300), note: 'Judge output was not valid JSON.' }];
  }
}

const date = new Date().toISOString().slice(0, 10);
const slug = model.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase();
const runId = `${date}-${slug}`;
const runsDir = join(benchmarkDir, 'runs');
const runDir = join(runsDir, runId);
await mkdir(runDir, { recursive: true });

const record = {
  id: runId,
  date,
  model,
  label,
  gateway: base,
  judge,
  suite_version: suite.version,
  reviewed: false,
  note: 'Draft. Observations come from the judge model and need a maintainer to accept, reject, or turn into rules before they reach the stream.',
  prompts: [],
};

for (const item of suite.prompts) {
  if (only && !only.includes(item.id)) continue;
  process.stdout.write(`${item.id}: default`);
  const plain = await complete(model, [{ role: 'user', content: item.prompt }]);
  process.stdout.write(`, with rules`);
  const guided = await complete(model, [
    { role: 'system', content: guidance },
    { role: 'user', content: item.prompt },
  ]);
  process.stdout.write(`, judge`);
  const observations = await observe(item.prompt, plain.text);
  const entry = {
    id: item.id,
    kind: item.kind,
    prompt: item.prompt,
    default: { text: plain.text, ms: plain.ms, usage: plain.usage, served_by: plain.model },
    with_rules: { text: guided.text, ms: guided.ms, usage: guided.usage, served_by: guided.model },
    observations,
  };
  if (item.kind === 'design') {
    const plainHtml = htmlOf(plain.text);
    const guidedHtml = htmlOf(guided.text);
    if (plainHtml) await writeFile(join(runDir, `${item.id}.default.html`), plainHtml);
    if (guidedHtml) await writeFile(join(runDir, `${item.id}.with-rules.html`), guidedHtml);
    entry.html = { default: plainHtml ? `${item.id}.default.html` : null, with_rules: guidedHtml ? `${item.id}.with-rules.html` : null };
  }
  record.prompts.push(entry);
  console.log(` done (${observations.length} observations)`);
}

const hits = new Map();
for (const entry of record.prompts) {
  for (const observation of entry.observations) {
    hits.set(observation.rule, (hits.get(observation.rule) ?? 0) + 1);
  }
}
record.summary = {
  prompts: record.prompts.length,
  observations: [...hits.values()].reduce((sum, count) => sum + count, 0),
  rules_hit: [...hits.entries()].filter(([rule]) => rule !== 'NEW' && rule !== 'UNPARSED').sort((a, b) => b[1] - a[1]).map(([rule, count]) => ({ rule, count })),
  new_tells: record.prompts.flatMap((entry) => entry.observations.filter((observation) => observation.rule === 'NEW').map((observation) => ({ prompt: entry.id, evidence: observation.evidence, note: observation.note }))),
};
await writeFile(join(runDir, 'run.json'), JSON.stringify(record, null, 2) + '\n');

// Ledger: one row per run, newest first.
const rows = [];
for (const name of (await readdir(runsDir)).sort().reverse()) {
  try {
    const run = JSON.parse(await readFile(join(runsDir, name, 'run.json'), 'utf8'));
    const top = run.summary.rules_hit.slice(0, 4).map((hit) => `${hit.rule} (${hit.count})`).join(', ');
    rows.push(`| ${run.date} | ${run.label} | ${run.summary.prompts} | ${run.summary.observations} | ${top || 'none'} | ${run.summary.new_tells.length} | ${run.reviewed ? 'yes' : 'draft'} |`);
  } catch {
    /* skip folders without a record */
  }
}
const ledger = [
  '# Release test ledger',
  '',
  'One row per model tested with the private suite. Observations are judge-model drafts until a maintainer reviews them; reviewed runs feed the stream.',
  '',
  '| Date | Model | Prompts | Observations | Most common rules | New tells | Reviewed |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
].join('\n');
await writeFile(join(benchmarkDir, 'LEDGER.md'), ledger);
console.log(`\nWrote private benchmark run ${runId} and refreshed the private ledger.`);
console.log(`Summary: ${record.summary.observations} observations across ${record.summary.prompts} prompts; ${record.summary.new_tells.length} new tells to review.`);
