# Not Like Us Stream

The Stream is the paid, live edition of the manual. Subscribers' agents pull the current rules on their own, so a Claude Code, Codex, Cursor, OpenClaw, Hermes, Gemini CLI, or Copilot setup never drifts back to the defaults this manual exists to catch. $4.99 a month, one key per person, any number of machines. Subscribe at https://notlikeus.adorellc.pro/stream.

The public repository is a snapshot. It is free for noncommercial use and it does not update itself.

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
