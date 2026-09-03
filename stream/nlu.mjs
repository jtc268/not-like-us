#!/usr/bin/env node
// nlu: the Not Like Us Stream client. Node 18 or newer. No dependencies.
//
//   nlu setup <key>      save the key, install the current rules, and add update hooks
//   nlu login <key>      save your subscriber key
//   nlu sync             pull the latest rules into every agent on this machine
//   nlu hook             re-sync at the start of every Claude Code, Codex, Cursor, Gemini, and Copilot session
//   nlu schedule         re-sync every morning with the OS scheduler
//   nlu mcp              run as an MCP server so any client can read the live rules
//   nlu status           installed version, stream version, subscription standing
//   nlu recover <email>  email the key to the subscriber address
//   nlu rotate           replace the key (the old one stops working)
//   nlu uninstall        remove everything nlu wrote
//
// Without a key, sync installs the public snapshot from github.com/jtc268/not-like-us.

import { spawnSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const VERSION = '1.1.0';
const SITE = (process.env.NOT_LIKE_US_URL || 'https://notlikeus.art').replace(/\/$/, '');
const HOME = os.homedir();
const NLU_HOME = process.env.NOT_LIKE_US_HOME || path.join(HOME, '.config', 'not-like-us');
const KEY_FILE = path.join(NLU_HOME, 'key');
const STATE_FILE = path.join(NLU_HOME, 'state.json');
const FEED_FILE = path.join(NLU_HOME, 'feed.json');
const MIRROR = path.join(NLU_HOME, 'manual');
const SELF = path.join(NLU_HOME, 'nlu.mjs');
const SKILL = 'skills/not-like-us/SKILL.md';
const MARK_START = '<!-- not-like-us:start (managed by nlu sync, edits inside are overwritten) -->';
const MARK_END = '<!-- not-like-us:end -->';

// Where each agent reads skills. The shared .agents folder is read by Codex,
// Cursor, Gemini CLI, Copilot, OpenClaw, and the skills CLI. The rest are the
// per-tool folders those tools also read.
const SKILL_TARGETS = [
  { id: 'agents', name: 'shared Agent Skills folder', dir: '.agents/skills', always: true },
  { id: 'claude', name: 'Claude Code', dir: '.claude/skills', requires: '.claude' },
  { id: 'codex', name: 'Codex CLI', dir: '.codex/skills', requires: '.codex' },
  { id: 'cursor', name: 'Cursor', dir: '.cursor/skills', requires: '.cursor' },
  { id: 'gemini', name: 'Gemini CLI', dir: '.gemini/skills', requires: '.gemini' },
  { id: 'copilot', name: 'GitHub Copilot', dir: '.copilot/skills', requires: '.copilot' },
  { id: 'openclaw', name: 'OpenClaw', dir: '.openclaw/skills', requires: '.openclaw' },
  { id: 'hermes', name: 'Hermes Agent', dir: '.hermes/skills', requires: '.hermes' },
];

// Standing instructions that load on every session, so the rules apply even
// when nobody invokes the skill. Claude Code gets its own rules file. The
// others get a managed block appended to their global instructions file.
const RULE_TARGETS = [
  { id: 'claude', name: 'Claude Code rules', file: '.claude/rules/not-like-us.md', mode: 'file', requires: '.claude' },
  { id: 'codex', name: 'Codex global AGENTS.md', file: '.codex/AGENTS.md', mode: 'block', requires: '.codex' },
  { id: 'gemini', name: 'Gemini CLI GEMINI.md', file: '.gemini/GEMINI.md', mode: 'block', requires: '.gemini' },
  { id: 'copilot', name: 'Copilot instructions', file: '.copilot/copilot-instructions.md', mode: 'block', requires: '.copilot' },
  { id: 'openclaw', name: 'OpenClaw workspace AGENTS.md', file: '.openclaw/workspace/AGENTS.md', mode: 'block', requires: '.openclaw/workspace' },
];

const args = process.argv.slice(2);
const command = args[0] ?? 'help';
const flags = new Set(args.filter((item) => item.startsWith('--')));
const flagValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const quiet = flags.has('--quiet');
const say = (line) => {
  if (!quiet) console.log(line);
};

const home = (...parts) => path.join(HOME, ...parts);

async function readKey() {
  if (process.env.NOT_LIKE_US_KEY) return process.env.NOT_LIKE_US_KEY.trim();
  try {
    return (await fs.readFile(KEY_FILE, 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeState(state) {
  await fs.mkdir(NLU_HOME, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function selfInstall() {
  const here = fileURLToPath(import.meta.url);
  if (path.resolve(here) === path.resolve(SELF)) return;
  await fs.mkdir(NLU_HOME, { recursive: true });
  await fs.copyFile(here, SELF);
}

function parseDuration(value) {
  const match = /^(\d+)\s*(m|h|d)?$/.exec(String(value ?? ''));
  if (!match) return 0;
  const unit = { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] ?? 'h'];
  return Number(match[1]) * unit;
}

async function request(pathname, options = {}) {
  const key = options.key ?? (await readKey());
  const headers = { 'user-agent': `nlu/${VERSION}`, ...(options.headers ?? {}) };
  if (key && options.auth !== false) headers.authorization = `Bearer ${key}`;
  const response = await fetch(`${SITE}${pathname}`, { ...options, headers });
  return response;
}

async function fetchFeed({ key, etag }) {
  const response = await request(key ? '/v1/feed' : '/v1/snapshot', {
    key,
    auth: Boolean(key),
    headers: etag ? { 'if-none-match': etag } : {},
  });
  if (response.status === 304) return { unchanged: true };
  if (!response.ok) {
    let message = `${response.status}`;
    try {
      message = (await response.json()).error ?? message;
    } catch {
      /* keep status text */
    }
    throw new Error(message);
  }
  return { feed: await response.json(), etag: response.headers.get('etag') };
}

function withVersion(skill, version) {
  // Hermes and the skills CLI read a version field. Keep the frontmatter on line 1.
  if (!skill.startsWith('---')) return skill;
  if (/^version:/m.test(skill.split('\n---')[0])) return skill.replace(/^version:.*$/m, `version: ${version}`);
  return skill.replace(/^description:.*$/m, (line) => `${line}\nversion: ${version}`);
}

async function writeSkillFolder(root, feed) {
  await fs.mkdir(root, { recursive: true });
  const skill = withVersion(feed.files[SKILL], feed.version);
  await fs.writeFile(path.join(root, 'SKILL.md'), skill);
  await fs.writeFile(path.join(root, 'VERSION'), `${feed.version}\n`);
  for (const [file, body] of Object.entries(feed.files)) {
    if (!file.startsWith('manual/')) continue;
    const target = path.join(root, file.slice('manual/'.length));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  }
}

function rulesBlock(feed) {
  const prompt = (feed.files['manual/prompt.txt'] ?? '').trim();
  return [
    MARK_START,
    `# Not Like Us rules (stream version ${feed.version})`,
    '',
    prompt,
    '',
    `Full rules, per-tool guides, and sources: ${path.join(MIRROR, 'skills', 'not-like-us', 'SKILL.md')}`,
    MARK_END,
  ].join('\n');
}

async function upsertBlock(file, block) {
  let body = '';
  try {
    body = await fs.readFile(file, 'utf8');
  } catch {
    /* new file */
  }
  const start = body.indexOf(MARK_START);
  const end = body.indexOf(MARK_END);
  let next;
  if (start >= 0 && end > start) {
    next = body.slice(0, start) + block + body.slice(end + MARK_END.length);
  } else {
    next = body.trimEnd() + (body.trim() ? '\n\n' : '') + block + '\n';
  }
  if (next !== body) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, next);
    return true;
  }
  return false;
}

async function removeBlock(file) {
  let body;
  try {
    body = await fs.readFile(file, 'utf8');
  } catch {
    return false;
  }
  const start = body.indexOf(MARK_START);
  const end = body.indexOf(MARK_END);
  if (start < 0 || end < start) return false;
  const next = (body.slice(0, start) + body.slice(end + MARK_END.length)).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  await fs.writeFile(file, next.trim() ? next : '');
  return true;
}

async function sync() {
  await selfInstall();
  const key = await readKey();
  const state = await readState();
  const maxAge = parseDuration(flagValue('--max-age'));
  if (maxAge && state.checkedAt && Date.now() - new Date(state.checkedAt).getTime() < maxAge && state.version) {
    return;
  }
  const only = flagValue('--only')?.split(',');
  const projectMode = flags.has('--project');
  let result;
  try {
    result = await fetchFeed({ key, etag: flags.has('--force') ? undefined : state.etag });
  } catch (error) {
    if (quiet) return;
    throw new Error(`could not fetch the stream: ${error.message}`);
  }
  let feed;
  let etag;
  if (result.unchanged) {
    // Nothing new upstream. A project or target-limited sync still has files
    // to write, so reuse the last feed saved on disk.
    if (!projectMode && !only) {
      await writeState({ ...state, checkedAt: new Date().toISOString() });
      say(`Up to date: ${state.version} (${state.source}). Installed in ${state.targets?.length ?? 0} places.`);
      return;
    }
    try {
      feed = JSON.parse(await fs.readFile(FEED_FILE, 'utf8'));
      etag = state.etag;
    } catch {
      result = await fetchFeed({ key });
      ({ feed, etag } = result);
      await fs.mkdir(NLU_HOME, { recursive: true });
      await fs.writeFile(FEED_FILE, JSON.stringify(feed));
    }
  } else {
    ({ feed, etag } = result);
    await fs.mkdir(NLU_HOME, { recursive: true });
    await fs.writeFile(FEED_FILE, JSON.stringify(feed));
  }
  const written = [];

  await fs.rm(MIRROR, { recursive: true, force: true });
  for (const [file, body] of Object.entries(feed.files)) {
    const target = path.join(MIRROR, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  }
  await fs.writeFile(path.join(MIRROR, 'skills', 'not-like-us', 'SKILL.md'), withVersion(feed.files[SKILL], feed.version));
  const roots = projectMode ? [process.cwd()] : [HOME];
  for (const root of roots) {
    for (const target of SKILL_TARGETS) {
      if (only && !only.includes(target.id)) continue;
      if (projectMode && target.id !== 'agents') continue;
      if (!target.always && !existsSync(path.join(root, target.requires))) continue;
      const dir = path.join(root, target.dir, 'not-like-us');
      await writeSkillFolder(dir, feed);
      written.push(`${target.name}: ${dir}`);
    }
  }
  if (!projectMode && !flags.has('--no-rules')) {
    const block = rulesBlock(feed);
    for (const target of RULE_TARGETS) {
      if (only && !only.includes(target.id)) continue;
      if (!existsSync(home(target.requires))) continue;
      const file = home(target.file);
      if (target.mode === 'file') {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, block + '\n');
      } else {
        await upsertBlock(file, block);
      }
      written.push(`${target.name}: ${file}`);
    }
  }
  if (projectMode) {
    const agentsFile = path.join(process.cwd(), 'AGENTS.md');
    await upsertBlock(agentsFile, rulesBlock(feed));
    written.push(`project AGENTS.md: ${agentsFile}`);
  }

  await writeState({
    ...state,
    version: feed.version,
    source: feed.source,
    etag,
    updatedAt: feed.updated_at,
    checkedAt: new Date().toISOString(),
    targets: written,
    key: key ? 'stored' : 'none',
  });

  if (quiet) {
    console.log(`Not Like Us rules updated to ${feed.version}.`);
    return;
  }
  console.log(`Not Like Us ${feed.source === 'snapshot' ? 'snapshot' : 'stream'} ${feed.version}: ${feed.rule_count} rules.`);
  for (const line of written) console.log(`  wrote ${line}`);
  if (feed.changelog) {
    const latest = feed.changelog.split(/\n## /).slice(1, 2)[0];
    if (latest) console.log(`\nLatest change:\n## ${latest.trim()}\n`);
  }
  if (!key) {
    console.log(`\nThis is the public snapshot. The stream updates continuously and needs a key: ${SITE}/subscribe`);
  }
  if (!state.hooked && !projectMode) {
    console.log(`\nMake it automatic: nlu hook (per session) or nlu schedule (daily).`);
  }
}

// --- hooks ------------------------------------------------------------------

const HOOK_COMMAND = () => `node "${SELF}" sync --quiet --max-age 6h`;

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

function hasOurHook(list, key = 'command') {
  return JSON.stringify(list ?? []).includes('not-like-us');
}

async function hook() {
  await selfInstall();
  const cmd = HOOK_COMMAND();
  const done = [];

  if (existsSync(home('.claude'))) {
    const file = home('.claude', 'settings.json');
    const settings = await readJson(file, {});
    settings.hooks ??= {};
    settings.hooks.SessionStart ??= [];
    if (!hasOurHook(settings.hooks.SessionStart)) {
      settings.hooks.SessionStart.push({ matcher: 'startup', hooks: [{ type: 'command', command: cmd }] });
      await writeJson(file, settings);
    }
    done.push(`Claude Code: ${file}`);
  }
  if (existsSync(home('.codex'))) {
    const file = home('.codex', 'hooks.json');
    const config = await readJson(file, {});
    config.hooks ??= {};
    config.hooks.SessionStart ??= [];
    if (!hasOurHook(config.hooks.SessionStart)) {
      config.hooks.SessionStart.push({ matcher: 'startup|resume', hooks: [{ type: 'command', command: cmd }] });
      await writeJson(file, config);
    }
    done.push(`Codex CLI: ${file}`);
  }
  if (existsSync(home('.gemini'))) {
    const file = home('.gemini', 'settings.json');
    const settings = await readJson(file, {});
    settings.hooks ??= {};
    settings.hooks.SessionStart ??= [];
    if (!hasOurHook(settings.hooks.SessionStart)) {
      settings.hooks.SessionStart.push({ matcher: 'startup', hooks: [{ name: 'not-like-us', type: 'command', command: cmd, timeout: 60000 }] });
      await writeJson(file, settings);
    }
    done.push(`Gemini CLI: ${file}`);
  }
  if (existsSync(home('.cursor'))) {
    const file = home('.cursor', 'hooks.json');
    const config = await readJson(file, { version: 1, hooks: {} });
    config.version ??= 1;
    config.hooks ??= {};
    config.hooks.sessionStart ??= [];
    if (!hasOurHook(config.hooks.sessionStart)) {
      config.hooks.sessionStart.push({ command: cmd });
      await writeJson(file, config);
    }
    done.push(`Cursor: ${file}`);
  }
  if (existsSync(home('.copilot'))) {
    const file = home('.copilot', 'hooks', 'not-like-us.json');
    await writeJson(file, { version: 1, hooks: { sessionStart: [{ type: 'command', bash: cmd, powershell: cmd, timeoutSec: 30 }] } });
    done.push(`GitHub Copilot: ${file}`);
  }

  const state = await readState();
  await writeState({ ...state, hooked: true });
  if (!done.length) {
    console.log('No supported agent found in your home folder. Use nlu schedule instead, or the tool commands at ' + `${SITE}/subscribe.`);
    return;
  }
  console.log('Session-start hooks installed. Each session re-syncs if the last check is older than 6 hours.');
  for (const line of done) console.log(`  ${line}`);
  console.log('\nOpenClaw and Hermes have their own schedulers:');
  console.log(`  openclaw automations create "0 6 * * *" --name not-like-us --command '${cmd}'`);
  console.log(`  hermes cron create "0 6 * * *" "Run not-like-us sync" --no-agent`);
}

// --- OS scheduler -----------------------------------------------------------

async function schedule() {
  await selfInstall();
  const cmd = HOOK_COMMAND().replace(' --max-age 6h', '');
  if (process.platform === 'win32') {
    const result = spawnSync('schtasks', ['/Create', '/F', '/SC', 'DAILY', '/ST', '06:00', '/TN', 'Not Like Us sync', '/TR', cmd], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    console.log('Scheduled: Task Scheduler runs "Not Like Us sync" daily at 06:00.');
  } else if (process.platform === 'darwin') {
    const plist = home('Library', 'LaunchAgents', 'pro.adorellc.notlikeus.sync.plist');
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>pro.adorellc.notlikeus.sync</string>
  <key>ProgramArguments</key><array><string>/bin/sh</string><string>-lc</string><string>${cmd}</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>6</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
</dict></plist>
`;
    await fs.mkdir(path.dirname(plist), { recursive: true });
    await fs.writeFile(plist, body);
    spawnSync('launchctl', ['unload', plist], { stdio: 'ignore' });
    spawnSync('launchctl', ['load', plist], { stdio: 'ignore' });
    console.log(`Scheduled: launchd runs the sync daily at 06:00 (${plist}).`);
  } else {
    const current = spawnSync('crontab', ['-l'], { encoding: 'utf8' }).stdout ?? '';
    const kept = current.split('\n').filter((line) => line && !line.includes('not-like-us sync'));
    kept.push(`0 6 * * * ${cmd} # not-like-us sync`);
    const result = spawnSync('crontab', ['-'], { input: kept.join('\n') + '\n', encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || 'crontab failed');
    console.log('Scheduled: cron runs the sync daily at 06:00.');
  }
  const state = await readState();
  await writeState({ ...state, scheduled: true });
}

// --- MCP server -------------------------------------------------------------

async function mcp() {
  const key = await readKey();
  let cache = null;
  async function current() {
    if (!cache || Date.now() - cache.at > 3_600_000) {
      try {
        const result = await fetchFeed({ key });
        if (result.feed) cache = { feed: result.feed, at: Date.now() };
      } catch (error) {
        // A lapsed or rotated key still gets the public snapshot, so the
        // server keeps answering and the subscribe tool can explain how to renew.
        try {
          const fallback = await fetchFeed({ key: null });
          if (fallback.feed) cache = { feed: fallback.feed, at: Date.now(), reason: error.message };
        } catch (secondError) {
          if (!cache) throw secondError;
        }
      }
    }
    return cache.feed;
  }
  const tools = () => JSON.parse(cache?.feed.files['manual/data/tools.json'] ?? '[]');
  const resources = (feed) => [
    { uri: 'notlikeus://skill', name: 'Not Like Us rules (skill)', mimeType: 'text/markdown' },
    { uri: 'notlikeus://prompt', name: 'Not Like Us paste block', mimeType: 'text/plain' },
    { uri: 'notlikeus://rules/writing', name: 'Universal writing rules', mimeType: 'text/markdown' },
    { uri: 'notlikeus://rules/design', name: 'Universal design rules', mimeType: 'text/markdown' },
    ...Object.keys(feed.files)
      .filter((file) => file.startsWith('manual/tools/'))
      .map((file) => ({ uri: `notlikeus://${file.slice('manual/'.length)}`, name: file.slice('manual/tools/'.length), mimeType: 'text/markdown' })),
  ];
  const read = (feed, uri) => {
    const map = {
      'notlikeus://skill': feed.files[SKILL],
      'notlikeus://prompt': feed.files['manual/prompt.txt'],
      'notlikeus://rules/writing': feed.files['manual/rules/WRITING.md'],
      'notlikeus://rules/design': feed.files['manual/rules/DESIGN.md'],
    };
    if (map[uri]) return map[uri];
    const file = `manual/${uri.replace('notlikeus://', '')}`;
    return feed.files[file] ?? null;
  };
  const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
  const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
  const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    const { id, method, params = {} } = message;
    try {
      if (method === 'initialize') {
        reply(id, {
          protocolVersion: params.protocolVersion ?? '2025-06-18',
          capabilities: { resources: {}, tools: {}, prompts: {} },
          serverInfo: { name: 'not-like-us', version: VERSION },
          instructions: 'Read notlikeus://skill before writing copy or building interfaces. Call not_like_us_rules for the current rules and a per-tool guide.',
        });
      } else if (method === 'notifications/initialized' || method?.startsWith('notifications/')) {
        /* no reply */
      } else if (method === 'ping') {
        reply(id, {});
      } else if (method === 'resources/list') {
        reply(id, { resources: resources(await current()) });
      } else if (method === 'resources/read') {
        const feed = await current();
        const textBody = read(feed, params.uri);
        if (textBody === null) fail(id, -32602, `Unknown resource ${params.uri}`);
        else reply(id, { contents: [{ uri: params.uri, mimeType: params.uri.endsWith('prompt') ? 'text/plain' : 'text/markdown', text: textBody }] });
      } else if (method === 'tools/list') {
        await current();
        reply(id, {
          tools: [
            {
              name: 'not_like_us_rules',
              description: 'The current Not Like Us rules for avoiding recognizable AI writing and interface defaults, plus the guide for a specific tool when named.',
              inputSchema: {
                type: 'object',
                properties: {
                  tool: { type: 'string', description: 'Generator in use', enum: tools().map((tool) => tool.id) },
                  kind: { type: 'string', enum: ['writing', 'design', 'both'], description: 'Which guide to include for that tool' },
                },
              },
            },
            { name: 'not_like_us_version', description: 'Version and freshness of the rules this server is serving.', inputSchema: { type: 'object', properties: {} } },
            {
              name: 'not_like_us_subscribe',
              description: 'How to buy Stream access: a Stripe checkout link for a person (cards, wallets, bank debit, USDC), or the x402 endpoint where an agent pays $4.99 in USDC for a 30-day pass and receives a key. Returns instructions, never charges by itself.',
              inputSchema: { type: 'object', properties: { method: { type: 'string', enum: ['stripe', 'x402', 'any'], description: 'Preferred way to pay' } } },
            },
          ],
        });
      } else if (method === 'tools/call') {
        const feed = await current();
        if (params.name === 'not_like_us_version') {
          reply(id, { content: [{ type: 'text', text: `Not Like Us ${feed.source} ${feed.version}, updated ${feed.updated_at}, ${feed.rule_count} rules.` }] });
        } else if (params.name === 'not_like_us_subscribe') {
          const method = params.arguments?.method ?? 'any';
          const lines = [
            `Not Like Us Stream: $4.99 for 30 days of live rules. Current key: ${key ? 'saved' : 'none'}. Serving: ${feed.source} ${feed.version}.`,
          ];
          if (cache?.reason) lines.push(`The saved key was rejected: ${cache.reason}`);
          if (method !== 'x402') {
            lines.push(`Person at a keyboard: open ${SITE}/subscribe. Subscribe (monthly, cancel any time) or Pay once (1 to 12 months, no renewal). Cards, Apple Pay, Google Pay, Link, US bank debit, Amazon Pay, USDC where enabled. The welcome page shows the key; then run: nlu setup <key>.`);
          }
          if (method !== 'stripe') {
            lines.push(`Agent with a USDC wallet: GET ${SITE}/v1/x402/pass returns HTTP 402 with x402 payment requirements (USDC on Base). Pay with any x402 client, for example x402-fetch, and the response is JSON with a key and an expiry. Then run: nlu setup <key>. Discovery: ${SITE}/.well-known/x402`);
          }
          reply(id, { content: [{ type: 'text', text: lines.join('\n\n') }] });
        } else if (params.name === 'not_like_us_rules') {
          const parts = [feed.files[SKILL]];
          const tool = params.arguments?.tool;
          const kind = params.arguments?.kind ?? 'both';
          if (tool) {
            for (const guide of ['WRITING', 'DESIGN']) {
              if (kind === 'both' || kind === guide.toLowerCase()) {
                const body = feed.files[`manual/tools/${tool}/${guide}.md`];
                if (body) parts.push(body);
              }
            }
          }
          reply(id, { content: [{ type: 'text', text: parts.join('\n\n---\n\n') }] });
        } else {
          fail(id, -32602, `Unknown tool ${params.name}`);
        }
      } else if (method === 'prompts/list') {
        reply(id, { prompts: [{ name: 'not-like-us-review', description: 'Review a draft, page, or component against the Not Like Us rules.', arguments: [{ name: 'draft', description: 'The text or description to review', required: false }] }] });
      } else if (method === 'prompts/get') {
        const feed = await current();
        const draft = params.arguments?.draft ? `\n\nReview this:\n\n${params.arguments.draft}` : '';
        reply(id, { messages: [{ role: 'user', content: { type: 'text', text: `${feed.files[SKILL]}${draft}` } }] });
      } else if (id !== undefined) {
        fail(id, -32601, `Method not found: ${method}`);
      }
    } catch (error) {
      if (id !== undefined) fail(id, -32000, error.message);
    }
  }
}

// --- account ----------------------------------------------------------------

async function status() {
  const state = await readState();
  const key = await readKey();
  const version = await (await request('/v1/version', { auth: false })).json();
  console.log(`Installed: ${state.version ?? 'nothing yet'}${state.source ? ` (${state.source})` : ''}${state.checkedAt ? `, checked ${state.checkedAt}` : ''}`);
  console.log(`Stream:    ${version.stream.version}, updated ${version.stream.updated_at}, ${version.stream.rule_count} rules`);
  console.log(`Snapshot:  ${version.snapshot.version}, ${version.snapshot.rule_count} rules (free, github.com/jtc268/not-like-us)`);
  if (key) {
    const response = await request('/v1/standing');
    const body = await response.json();
    console.log(`Key:       ${response.ok ? `active (${body.status}${body.renewsAt ? `, renews ${body.renewsAt.slice(0, 10)}` : ''})` : body.error}`);
  } else {
    console.log(`Key:       none. Subscribe at ${SITE}/subscribe, then nlu setup <key>.`);
  }
  if (state.targets?.length) {
    console.log('Installed in:');
    for (const line of state.targets) console.log(`  ${line}`);
  }
}

async function login() {
  const key = args[1] ?? process.env.NOT_LIKE_US_KEY;
  if (!key?.startsWith('nlu_')) throw new Error('Usage: nlu login nlu_...');
  await selfInstall();
  await fs.mkdir(NLU_HOME, { recursive: true });
  await fs.writeFile(KEY_FILE, key.trim() + '\n', { mode: 0o600 });
  const response = await request('/v1/standing', { key });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'That key was rejected.');
  console.log(`Key saved to ${KEY_FILE}. Subscription ${body.status}. Run nlu sync.`);
}

async function setup() {
  const key = args[1] ?? process.env.NOT_LIKE_US_KEY;
  if (!key?.startsWith('nlu_')) throw new Error('Usage: nlu setup nlu_...');
  await login();
  await sync();
  await hook();
  console.log('\nSetup complete. Your installed agents now use the current Not Like Us Stream.');
}

async function recover() {
  const email = args[1];
  if (!email?.includes('@')) throw new Error('Usage: nlu recover you@example.com');
  const response = await request('/v1/recover', { method: 'POST', auth: false, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
  console.log((await response.json()).message);
}

async function rotate() {
  const response = await request('/v1/rotate', { method: 'POST' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error);
  await fs.writeFile(KEY_FILE, body.key + '\n', { mode: 0o600 });
  console.log(`New key saved to ${KEY_FILE}. The old key no longer works. Update any tool that has the old key in a URL.`);
}

async function uninstall() {
  const removed = [];
  for (const target of SKILL_TARGETS) {
    const dir = home(target.dir, 'not-like-us');
    if (existsSync(dir)) {
      await fs.rm(dir, { recursive: true, force: true });
      removed.push(dir);
    }
  }
  for (const target of RULE_TARGETS) {
    const file = home(target.file);
    if (target.mode === 'file') {
      if (existsSync(file)) {
        await fs.rm(file);
        removed.push(file);
      }
    } else if (await removeBlock(file)) removed.push(`${file} (managed block)`);
  }
  await fs.rm(NLU_HOME, { recursive: true, force: true });
  removed.push(NLU_HOME);
  console.log('Removed:');
  for (const line of removed) console.log(`  ${line}`);
  console.log('Session hooks and scheduled jobs that point at nlu.mjs will now do nothing. Remove them from settings when convenient.');
}

function help() {
  console.log(`nlu ${VERSION}: Not Like Us Stream client

  nlu setup <key>      save the key, install the current rules, and add update hooks
  nlu login <key>      save your subscriber key (${KEY_FILE})
  nlu sync             pull the latest rules into every agent on this machine
       --project         install into the current project (.agents/skills and AGENTS.md) instead
       --only a,b        limit to targets: ${SKILL_TARGETS.map((target) => target.id).join(', ')}
       --no-rules        skills only, do not touch global instruction files
       --force           ignore the cached ETag
  nlu hook             re-sync at the start of every Claude Code, Codex, Cursor, Gemini, and Copilot session
  nlu schedule         re-sync every morning with the OS scheduler
  nlu mcp              run as an MCP server (stdio)
  nlu status           installed version, stream version, subscription standing
  nlu recover <email>  email the key to the subscriber address
  nlu rotate           replace the key
  nlu uninstall        remove everything nlu wrote

Stream: ${SITE}/subscribe`);
}

const commands = { setup, login, sync, hook, schedule, mcp, status, recover, rotate, uninstall, help };
const run = commands[command] ?? help;
Promise.resolve()
  .then(() => run())
  .catch((error) => {
    console.error(`nlu: ${error.message}`);
    process.exitCode = 1;
  });
