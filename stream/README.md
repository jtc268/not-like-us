# Not Like Us Stream

The Stream is the paid, live edition of the manual. Tool defaults change every few weeks. The Stream delivers each rule change to Claude Code, Codex, Cursor, OpenClaw, Hermes, Gemini CLI, and Copilot as it lands, so a subscriber's work keeps looking like theirs. $4.99 a month, one key per person, any number of machines. Subscribe at https://notlikeus.adorellc.pro/subscribe.

The public repository is a snapshot. It is free for noncommercial use and it does not update itself.

## Where the rules come from

Every model release gets the same private test at default settings with no system prompt. A judge model drafts the defaults it sees against the catalog. A person reviews each finding, and kept findings become rules with the model in their scope before they ship to the Stream.

## Paying

- **Subscribe** at `POST /v1/checkout`: $4.99 a month through Stripe Checkout, cancel any time from the billing portal.
- **Pay once** at `POST /v1/pass`: $4.99 per 30 days for 1 to 12 months in one payment. No renewal. The pass is a trialing subscription with no card on file, so the same key check covers it and it ends by itself.
- **Methods.** Checkout offers every method the Stripe account has active for the mode: cards with Apple Pay and Google Pay, Link, US bank debit, Amazon Pay, and for one-time passes Afterpay. Cash App, PayPal, Klarna, and USDC stablecoins appear the moment they are switched on in the Stripe Dashboard; the server reads the account's capabilities at request time, so no deploy is needed.
- **Agents** pay in USDC over x402: see the x402 section below.

## x402: agents pay by themselves

`GET https://notlikeus.adorellc.pro/v1/x402/pass` answers HTTP 402. The `PAYMENT-REQUIRED` header (and the body) carry x402 v2 requirements: scheme `exact`, amount `4990000` (USD 4.99 in USDC, six decimals), on Base `eip155:8453`, Polygon `eip155:137`, and Arbitrum One `eip155:42161`, paid to the Stream's wallet. An x402 client signs an EIP-3009 authorization and retries with `PAYMENT-SIGNATURE`. The server verifies and settles through a facilitator (PayAI by default, keyless; set `NLU_X402_FACILITATOR` to switch, for example to Coinbase's CDP facilitator for Bazaar indexing), then answers 200 with `{ key, until, days, feed }` and a `PAYMENT-RESPONSE` header.

Each paying wallet maps to one Stripe customer, and the pass is a 30-day trialing subscription with no card, so the key check is the same as for every other rail. Paying again from the same wallet before the expiry extends the same key by 30 days.

Clients that do this out of the box: `@x402/fetch` (`wrapFetchWithPayment`), Coinbase AgentKit's `make_http_request_with_x402`, the Coinbase Agentic Wallet MCP (`npx @coinbase/payments-mcp`, works in Claude Code, Codex CLI, Gemini CLI), and PayAI. The MCP server's `not_like_us_subscribe` tool explains the same flow to any agent that asks.

Discovery for agents: `/agents` (plain page), `/llms.txt`, `/openapi.json` with `x-payment-info.offers`, `/.well-known/x402` and `/x402.json` (seller manifest; the well-known copy is a static file in `site/public/.well-known/x402` and must be updated by hand if the wallet or facilitator changes), `/acp/products.csv` (OpenAI ACP feed, discovery only), and `robots.txt` that admits GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot, and Google-Extended. Keyless requests to `/v1/feed` return the buy links in the body and a `Link: rel="payment"` header.

Not done yet, each needs a Dashboard or account step: Stripe stablecoins (request Stablecoins and Crypto in the Stripe Dashboard; then USDC appears at Stripe Checkout automatically), Stripe MPP challenges and Stripe Directory (need a Stripe public profile), Coinbase Bazaar indexing (needs a CDP API key on the facilitator), Solana USDC (needs a Solana receiving address).

## How it works

- The live rules live in a private repository. Every commit to it is a new stream version within a minute.
- The feed at `https://notlikeus.adorellc.pro/v1/feed` serves the current skill, agent instructions, paste block, rules, tool guides, data, and changelog as one JSON document. It needs a key.
- A key encodes the Stripe customer and is signed by the server. Stripe is the only database. A key works while the subscription is active or trialing, and stops within ten minutes of a cancellation taking effect.
- The client in this folder, `nlu.mjs`, writes the feed into every agent it finds and can keep it current by session hook, OS schedule, or as an MCP server.

## Client

Run it with npx, or fetch it once:

```sh
npx github:jtc268/not-like-us sync
curl -fsSL https://notlikeus.adorellc.pro/nlu.mjs -o nlu.mjs && node nlu.mjs sync
```

| Command | What it does |
| --- | --- |
| `login <key>` | Saves the key to `~/.config/not-like-us/key` and checks it. |
| `sync` | Pulls the feed and writes it everywhere below. Without a key, installs the public snapshot. |
| `sync --project` | Writes `.agents/skills/not-like-us/` and a managed block in the project's `AGENTS.md`. |
| `hook` | Adds a session-start hook to Claude Code, Codex, Cursor, Gemini CLI, and Copilot that re-syncs when the last check is older than six hours. |
| `schedule` | Daily 06:00 job through Task Scheduler, launchd, or cron. |
| `mcp` | Runs as a stdio MCP server. |
| `status` | Installed version, stream version, subscription standing. |
| `recover <email>` | Emails the key to the checkout address. |
| `rotate` | Replaces the key. |
| `uninstall` | Removes every file and managed block the client wrote. |

### Where sync writes

| Target | Skill folder | Always-on rules |
| --- | --- | --- |
| Shared Agent Skills (Codex, Cursor, Gemini CLI, Copilot, OpenClaw, skills CLI) | `~/.agents/skills/not-like-us/` | |
| Claude Code | `~/.claude/skills/not-like-us/` | `~/.claude/rules/not-like-us.md` |
| Codex CLI | `~/.codex/skills/not-like-us/` | managed block in `~/.codex/AGENTS.md` |
| Cursor | `~/.cursor/skills/not-like-us/` | |
| Gemini CLI | `~/.gemini/skills/not-like-us/` | managed block in `~/.gemini/GEMINI.md` |
| GitHub Copilot | `~/.copilot/skills/not-like-us/` | managed block in `~/.copilot/copilot-instructions.md` |
| OpenClaw | `~/.openclaw/skills/not-like-us/` | managed block in `~/.openclaw/workspace/AGENTS.md` |
| Hermes Agent | `~/.hermes/skills/not-like-us/` | |

A target is written only when its parent folder exists. The full feed is mirrored to `~/.config/not-like-us/manual/`. Managed blocks sit between `<!-- not-like-us:start -->` and `<!-- not-like-us:end -->` markers and are the paste block plus a pointer to the full rules.

### Tool-native alternatives

Hermes installs skills from a URL and re-fetches them on `hermes skills update`:

```sh
hermes skills install https://notlikeus.adorellc.pro/v1/k/<key>/SKILL.md
hermes cron create "0 6 * * *" "Run hermes skills update" --no-agent
```

OpenClaw runs commands on a schedule:

```sh
openclaw automations create "0 6 * * *" --name not-like-us --command 'node ~/.config/not-like-us/nlu.mjs sync --quiet'
```

## Feed

All routes are on `https://notlikeus.adorellc.pro`. Send the key as `Authorization: Bearer nlu_...`, or put it in the path for tools that only fetch URLs.

| Route | Auth | Returns |
| --- | --- | --- |
| `GET /v1/version` | none | Stream and snapshot versions, rule counts. |
| `GET /v1/snapshot` | none | The public snapshot in feed format. |
| `GET /skills/not-like-us/SKILL.md` | none | The public skill, for URL installs. |
| `GET /v1/feed` | key | The full feed. Supports `If-None-Match` with the `ETag`. |
| `GET /v1/k/<key>` | path | Same as `/v1/feed`. |
| `GET /v1/k/<key>/SKILL.md` | path | One file. Also `AGENTS.md`, `prompt.txt`, `CHANGELOG.md`, and any `manual/...` path. |
| `GET /v1/standing` | key | Subscription status and renewal date. |
| `POST /v1/rotate` | key | A new key. The old one stops working. |
| `POST /v1/recover` | none | Emails the key to the checkout address. Body: `{ "email": "..." }` or a form. |
| `POST /v1/portal` | key in body | Redirects to the Stripe billing portal. |
| `POST /v1/checkout` | none | Redirects to Stripe Checkout. |

Feed shape:

```json
{
  "product": "not-like-us-stream",
  "version": "2026-09-01.2791666",
  "commit": "2791666...",
  "updated_at": "2026-09-01T19:52:33Z",
  "source": "stream",
  "rule_count": 24,
  "changelog": "# Not Like Us Stream changelog ...",
  "files": {
    "skills/not-like-us/SKILL.md": "...",
    "AGENTS.md": "...",
    "manual/prompt.txt": "...",
    "manual/rules/WRITING.md": "...",
    "manual/data/rules.json": "..."
  }
}
```

`source` is `stream` when served from the live repository, `stale` when the repository was unreachable and the last good copy is served, and `snapshot` before the first successful fetch.

## MCP server

`nlu mcp` speaks MCP over stdio with no dependencies.

- Resources: `notlikeus://skill`, `notlikeus://prompt`, `notlikeus://rules/writing`, `notlikeus://rules/design`, and `notlikeus://tools/<tool>/WRITING.md` or `DESIGN.md` for each tool.
- Tool `not_like_us_rules` with optional `tool` and `kind` arguments returns the skill plus the named tool's guide.
- Tool `not_like_us_version` reports version and freshness.
- Prompt `not-like-us-review` wraps a draft in the review instructions.

The feed is refreshed in-process once an hour.

## Operating it

Secrets the site needs are listed in `site/deploy/adore-manifest.json`. `NLU_KEY_SECRET` signs keys; rotating it invalidates every key at once. `NLU_SOURCE_REPO` and `NLU_SOURCE_TOKEN` point at the private repository. Stripe objects: product `Not Like Us Stream`, one monthly price, one billing-portal configuration. No webhook is required; the welcome page derives the key from the checkout session and emails it through Resend from `stream@adorellc.pro`.

To publish a change: commit to the private repository. To refresh the public snapshot: copy `manual/`, `skills/`, and `AGENTS.md` from the private repository into this one and commit.
