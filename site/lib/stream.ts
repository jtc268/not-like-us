// Server-side helpers for the Not Like Us Stream: subscriber keys, Stripe,
// the private source repository, and email. Runs on the Workers runtime, so
// only fetch and WebCrypto are used.

import snapshotRules from '../../manual/data/rules.json';
import snapshotSources from '../../manual/data/sources.json';
import snapshotTools from '../../manual/data/tools.json';
import snapshotPrompt from '../../manual/prompt.txt?raw';
import snapshotSkill from '../../skills/not-like-us/SKILL.md?raw';
import snapshotAgents from '../../AGENTS.md?raw';
import snapshotWriting from '../../manual/rules/WRITING.md?raw';
import snapshotDesign from '../../manual/rules/DESIGN.md?raw';

// Every per-tool guide in the public snapshot, keyed by repository path.
const snapshotGuides = import.meta.glob('../../manual/tools/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const SITE = 'https://notlikeus.adorellc.pro';
export const PRODUCT = 'not-like-us-stream';
export const PRICE_LABEL = '$4.99 a month';

const encoder = new TextEncoder();

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new StreamError(503, `Server is missing ${name}`);
  return value;
}

export class StreamError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function text(body: string, type = 'text/plain; charset=utf-8', status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { 'content-type': type, 'cache-control': 'no-store', ...headers } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof StreamError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: 'Something failed on our side. Try again in a minute.' }, 500);
}

// ---------------------------------------------------------------------------
// Keys. A key encodes the Stripe customer id and a key version, signed with
// NLU_KEY_SECRET. Stripe is the only database: a key is valid while the
// customer has an active or trialing subscription and the version matches the
// customer's nlu_key_version metadata.

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return atob(padded);
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export async function makeKey(customerId: string, version = 1): Promise<string> {
  const payload = `${customerId}.${version}`;
  return `nlu_${base64url(payload)}_${await hmac(env('NLU_KEY_SECRET'), payload)}`;
}

export async function parseKey(key: string): Promise<{ customerId: string; version: number } | null> {
  const match = /^nlu_([A-Za-z0-9_-]+)_([a-f0-9]{32})$/.exec(key.trim());
  if (!match) return null;
  let payload: string;
  try {
    payload = fromBase64url(match[1]);
  } catch {
    return null;
  }
  const expected = await hmac(env('NLU_KEY_SECRET'), payload);
  if (!constantTimeEqual(expected, match[2])) return null;
  const [customerId, versionText] = payload.split('.');
  const version = Number(versionText);
  if (!customerId?.startsWith('cus_') || !Number.isInteger(version)) return null;
  return { customerId, version };
}

// ---------------------------------------------------------------------------
// Stripe, called directly over HTTPS with form encoding.

type StripeObject = Record<string, unknown> & { id?: string; error?: { message?: string } };

async function stripe(path: string, options: { method?: string; body?: Record<string, string> } = {}): Promise<StripeObject> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'not-like-us-stream/1.0',
    },
    body: options.body ? new URLSearchParams(options.body).toString() : undefined,
  });
  const data = (await response.json()) as StripeObject;
  if (!response.ok) throw new StreamError(502, data.error?.message ?? `Stripe returned ${response.status}`);
  return data;
}

type Subscription = { id: string; status: string; current_period_end?: number; cancel_at_period_end?: boolean };

export type Standing = {
  ok: boolean;
  status: string;
  renewsAt: string | null;
  cancelsAtPeriodEnd: boolean;
};

const GOOD = new Set(['active', 'trialing', 'past_due']);

export async function standing(customerId: string): Promise<Standing> {
  const list = await stripe(`/v1/subscriptions?customer=${customerId}&status=all&limit=10`);
  const subscriptions = (list.data as Subscription[] | undefined) ?? [];
  const best = subscriptions.find((item) => item.status === 'active' || item.status === 'trialing') ?? subscriptions.find((item) => item.status === 'past_due') ?? subscriptions[0];
  if (!best) return { ok: false, status: 'none', renewsAt: null, cancelsAtPeriodEnd: false };
  return {
    ok: GOOD.has(best.status),
    status: best.status,
    renewsAt: best.current_period_end ? new Date(best.current_period_end * 1000).toISOString() : null,
    cancelsAtPeriodEnd: Boolean(best.cancel_at_period_end),
  };
}

export async function customer(customerId: string): Promise<{ email: string | null; keyVersion: number; welcomeSent: boolean }> {
  const data = await stripe(`/v1/customers/${customerId}`);
  const metadata = (data.metadata as Record<string, string> | undefined) ?? {};
  return {
    email: (data.email as string | null) ?? null,
    keyVersion: Number(metadata.nlu_key_version ?? 1) || 1,
    welcomeSent: Boolean(metadata.nlu_welcome_sent),
  };
}

export async function setCustomerMetadata(customerId: string, values: Record<string, string>): Promise<void> {
  const body: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) body[`metadata[${key}]`] = value;
  await stripe(`/v1/customers/${customerId}`, { body });
}

export async function checkoutUrl(origin: string): Promise<string> {
  const session = await stripe('/v1/checkout/sessions', {
    body: {
      mode: 'subscription',
      'line_items[0][price]': env('STRIPE_PRICE_ID'),
      'line_items[0][quantity]': '1',
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/stream`,
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      'subscription_data[metadata][product]': PRODUCT,
      'metadata[product]': PRODUCT,
    },
  });
  return session.url as string;
}

export async function checkoutSession(sessionId: string): Promise<{ customerId: string | null; email: string | null; paid: boolean }> {
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) throw new StreamError(400, 'That checkout session id is not valid.');
  const session = await stripe(`/v1/checkout/sessions/${sessionId}`);
  const details = session.customer_details as { email?: string } | undefined;
  return {
    customerId: (session.customer as string | null) ?? null,
    email: details?.email ?? null,
    paid: session.status === 'complete' && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required'),
  };
}

export async function portalUrl(customerId: string, origin: string): Promise<string> {
  const session = await stripe('/v1/billing_portal/sessions', {
    body: {
      customer: customerId,
      return_url: `${origin}/stream`,
      configuration: env('STRIPE_PORTAL_CONFIG_ID'),
    },
  });
  return session.url as string;
}

export async function customersByEmail(email: string): Promise<string[]> {
  const list = await stripe(`/v1/customers?email=${encodeURIComponent(email)}&limit=10`);
  return ((list.data as { id: string }[] | undefined) ?? []).map((item) => item.id);
}

// ---------------------------------------------------------------------------
// Authorization with a short in-memory cache so a polling client does not hit
// Stripe on every request.

type Verdict = { ok: boolean; status: number; message: string; standing: Standing | null; customerId: string; until: number };
const verdicts = new Map<string, Verdict>();
const VERDICT_TTL = 10 * 60 * 1000;

export async function authorize(key: string | null): Promise<Verdict> {
  if (!key) return { ok: false, status: 401, message: 'Send your subscriber key as Authorization: Bearer nlu_... or in the URL path /v1/k/<key>/.', standing: null, customerId: '', until: 0 };
  const cached = verdicts.get(key);
  if (cached && cached.until > Date.now()) return cached;
  const parsed = await parseKey(key);
  if (!parsed) return { ok: false, status: 401, message: 'That key is not valid.', standing: null, customerId: '', until: 0 };
  let verdict: Verdict;
  try {
    const [account, current] = await Promise.all([customer(parsed.customerId), standing(parsed.customerId)]);
    if (account.keyVersion !== parsed.version) {
      verdict = { ok: false, status: 401, message: 'That key was rotated. Use the newest key from your welcome email or run nlu recover.', standing: current, customerId: parsed.customerId, until: Date.now() + VERDICT_TTL };
    } else if (!current.ok) {
      verdict = { ok: false, status: 402, message: `No active subscription (status: ${current.status}). Subscribe again at ${SITE}/stream.`, standing: current, customerId: parsed.customerId, until: Date.now() + VERDICT_TTL };
    } else {
      verdict = { ok: true, status: 200, message: 'ok', standing: current, customerId: parsed.customerId, until: Date.now() + VERDICT_TTL };
    }
  } catch (error) {
    if (cached) return { ...cached, until: Date.now() + 60 * 1000 };
    throw error;
  }
  verdicts.set(key, verdict);
  return verdict;
}

export function forget(key: string | null): void {
  if (key) verdicts.delete(key);
}

export function keyFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const url = new URL(request.url);
  return url.searchParams.get('key');
}

// ---------------------------------------------------------------------------
// Source: the private stream repository on GitHub. The latest commit on main is
// the version. Files are fetched once per commit and cached in memory. If
// GitHub is unreachable the last good copy is served, and before the first
// fetch the snapshot baked into this build is served.

export type Feed = {
  product: string;
  version: string;
  commit: string | null;
  updated_at: string;
  source: 'stream' | 'stale' | 'snapshot';
  rule_count: number;
  changelog: string;
  files: Record<string, string>;
};

type Tool = { id: string; name: string; note: string };

export function snapshotFeed(): Feed {
  const files: Record<string, string> = {
    'skills/not-like-us/SKILL.md': snapshotSkill,
    'AGENTS.md': snapshotAgents,
    'manual/prompt.txt': snapshotPrompt,
    'manual/rules/WRITING.md': snapshotWriting,
    'manual/rules/DESIGN.md': snapshotDesign,
    'manual/data/rules.json': JSON.stringify(snapshotRules, null, 2),
    'manual/data/sources.json': JSON.stringify(snapshotSources, null, 2),
    'manual/data/tools.json': JSON.stringify(snapshotTools, null, 2),
  };
  for (const [modulePath, body] of Object.entries(snapshotGuides)) {
    files[modulePath.replace(/^(\.\.\/)+/, '')] = body;
  }
  const reviewed = snapshotRules.map((rule) => rule.reviewed).sort().at(-1) ?? '2026-09-01';
  return {
    product: PRODUCT,
    version: `${reviewed}.snapshot`,
    commit: null,
    updated_at: `${reviewed}T00:00:00.000Z`,
    source: 'snapshot',
    rule_count: snapshotRules.length,
    changelog: '',
    files,
  };
}

export const snapshotVersion = snapshotFeed().version;
export const snapshotRuleCount = snapshotRules.length;

let feedCache: Feed | null = null;
let lastHeadCheck = 0;
const HEAD_CHECK_INTERVAL = 60 * 1000;

async function github(path: string, raw: boolean): Promise<Response> {
  const response = await fetch(`https://api.github.com/repos/${env('NLU_SOURCE_REPO')}/${path}`, {
    headers: {
      authorization: `Bearer ${env('NLU_SOURCE_TOKEN')}`,
      accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'user-agent': 'not-like-us-stream/1.0',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) throw new StreamError(502, `Source returned ${response.status} for ${path}`);
  return response;
}

async function sourceFile(path: string, ref: string): Promise<string> {
  return (await github(`contents/${path}?ref=${ref}`, true)).text();
}

async function loadFeed(): Promise<Feed> {
  const head = (await (await github('commits/main', false)).json()) as { sha: string; commit: { committer: { date: string } } };
  if (feedCache?.commit === head.sha) return feedCache;
  const tools = JSON.parse(await sourceFile('manual/data/tools.json', head.sha)) as Tool[];
  const paths = [
    'skills/not-like-us/SKILL.md',
    'AGENTS.md',
    'CHANGELOG.md',
    'manual/prompt.txt',
    'manual/rules/WRITING.md',
    'manual/rules/DESIGN.md',
    'manual/data/rules.json',
    'manual/data/sources.json',
    ...tools.flatMap((tool) => [`manual/tools/${tool.id}/WRITING.md`, `manual/tools/${tool.id}/DESIGN.md`]),
  ];
  const contents = await Promise.all(paths.map((path) => sourceFile(path, head.sha)));
  const files: Record<string, string> = { 'manual/data/tools.json': JSON.stringify(tools, null, 2) };
  paths.forEach((path, index) => {
    files[path] = contents[index];
  });
  const rules = JSON.parse(files['manual/data/rules.json']) as unknown[];
  const date = head.commit.committer.date.slice(0, 10);
  return {
    product: PRODUCT,
    version: `${date}.${head.sha.slice(0, 7)}`,
    commit: head.sha,
    updated_at: head.commit.committer.date,
    source: 'stream',
    rule_count: rules.length,
    changelog: files['CHANGELOG.md'],
    files,
  };
}

export async function feed(): Promise<Feed> {
  const now = Date.now();
  if (feedCache && now - lastHeadCheck < HEAD_CHECK_INTERVAL) return feedCache;
  try {
    feedCache = await loadFeed();
    lastHeadCheck = now;
    return feedCache;
  } catch (error) {
    console.error('stream source unavailable', error);
    lastHeadCheck = now;
    if (feedCache) return { ...feedCache, source: 'stale' };
    return snapshotFeed();
  }
}

export function contentTypeFor(path: string): string {
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.md')) return 'text/markdown; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

// ---------------------------------------------------------------------------
// Email through Resend. Plain text, in the manual's own voice.

export async function sendKeyEmail(to: string, key: string, subject = 'Your Not Like Us Stream key'): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NLU_FROM_EMAIL ?? 'stream@adorellc.pro';
  if (!apiKey) return false;
  const body = [
    'Thanks for subscribing. This is your Stream key. Keep it private; it is the only login.',
    '',
    key,
    '',
    'Set it up once (Node 18 or newer):',
    '',
    `  npx github:jtc268/not-like-us login ${key}`,
    '  npx github:jtc268/not-like-us sync',
    '  npx github:jtc268/not-like-us schedule',
    '',
    'sync writes the latest SKILL.md into every agent it finds on the machine (Claude Code, Codex, Cursor, OpenClaw, Hermes, Gemini CLI, Copilot, and the shared ~/.agents/skills folder). schedule makes that happen every morning.',
    '',
    `Hermes can pull straight from the URL instead: hermes skills install ${SITE}/v1/k/${key}/SKILL.md`,
    '',
    `MCP for any client: npx github:jtc268/not-like-us mcp. Setup for each tool is at ${SITE}/stream.`,
    '',
    `Manage or cancel billing any time at ${SITE}/stream (Manage billing). Lost this email? ${SITE}/stream has a recover form.`,
    '',
    'Not Like Us, Adore LLC',
  ].join('\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: `Not Like Us Stream <${from}>`, to: [to], subject, text: body }),
  });
  if (!response.ok) console.error('resend failed', response.status, await response.text());
  return response.ok;
}
