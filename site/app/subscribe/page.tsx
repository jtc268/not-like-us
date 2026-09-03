import Link from 'next/link';
import CopyBlock from '../../components/copy-block';
import ReleaseLedger from '../../components/release-ledger';
import StreamStatus from '../../components/stream-status';
import { PRICE_LABEL, SITE } from '../../lib/stream';

type Search = Record<string, string | string[] | undefined>;

const repo = 'https://github.com/jtc268/not-like-us';

export default async function Stream({ searchParams }: { searchParams: Promise<Search> | Search }) {
  const params = await searchParams;
  const recovered = params.recovered === '1';
  const offer = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Not Like Us Stream',
    description: 'Live rules feed for AI writing and interface work. Agents pull the current Not Like Us rules automatically.',
    brand: { '@type': 'Organization', name: 'Adore LLC' },
    url: `${SITE}/subscribe`,
    offers: [
      {
        '@type': 'Offer',
        name: 'Stream subscription',
        price: '4.99',
        priceCurrency: 'USD',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '4.99', priceCurrency: 'USD', billingDuration: 1, billingIncrement: 1, unitCode: 'MON' },
        availability: 'https://schema.org/InStock',
        url: `${SITE}/v1/checkout`,
        acceptedPaymentMethod: ['http://purl.org/goodrelations/v1#PaymentMethodCreditCard', 'http://purl.org/goodrelations/v1#DirectDebit', 'http://purl.org/goodrelations/v1#ByBankTransferInAdvance'],
      },
      {
        '@type': 'Offer',
        name: '30-day pass, prepaid, no renewal',
        price: '4.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE}/v1/pass`,
        acceptedPaymentMethod: ['http://purl.org/goodrelations/v1#PaymentMethodCreditCard', 'http://purl.org/goodrelations/v1#DirectDebit', 'https://x402.org', 'USDC'],
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offer) }} />
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Not Like Us home">
          NLU<span>↗</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/#rules">Rules</Link>
          <a href="#setup">Setup</a>
          <a href="#manage">Billing</a>
          <a href={repo}>GitHub</a>
        </nav>
      </header>

      <section className="hero stream-hero" id="top">
        <div className="hero-index" aria-hidden="true">
          05 / SUBSCRIBE
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Live rules for AI-assisted work</p>
          <h1>
            THE
            <br />
            STREAM
          </h1>
          <p className="deck">
            A daily release monitor checks major model catalogs. When a new model is callable, it gets the same six
            tests at default settings with no system prompt. After review, the new rules sync to subscribers&apos; agents
            so that model&apos;s defaults do not become their house style.
          </p>
          <StreamStatus />
        </div>
        <aside className="hero-note">
          <span>Stream</span>
          <strong>{PRICE_LABEL}</strong>
          <p>One key, every machine you own. Cancel from the billing portal any time.</p>
          <form method="post" action="/v1/checkout">
            <button type="submit" className="button">
              Subscribe with Stripe
            </button>
          </form>
          <form method="post" action="/v1/pass">
            <button type="submit" className="button secondary">
              Pay once, no renewal
            </button>
          </form>
          <p className="fine">
            Card, Apple Pay, Google Pay, Link, US bank debit, Amazon Pay, USDC where enabled. Pay once covers 1 to 12 months. Agents pay in USDC over x402.
          </p>
        </aside>
      </section>

      <section className="quick" id="test" aria-labelledby="test-title">
        <div className="section-label">
          <span>01</span>
          <h2 id="test-title">The test</h2>
          <p>
            The monitor checks for new models every day. A newly callable model gets the six prompts below, unchanged,
            at default settings with no system prompt. A judge model drafts findings against the catalog, then a person
            approves or rejects each finding before it can ship.
          </p>
        </div>
        <div className="test-body">
          <ul className="prompt-list">
            <li>Build a beautiful website</li>
            <li>Build the first screen of an operations app</li>
            <li>Write a poem</li>
            <li>Write the price-increase email</li>
            <li>Write homepage copy</li>
            <li>Write a timeout error message</li>
          </ul>
          <ReleaseLedger />
        </div>
      </section>

      <section className="quick" aria-labelledby="compare-title">
        <div className="section-label">
          <span>02</span>
          <h2 id="compare-title">Snapshot or stream</h2>
          <p>The public repository is a snapshot. It is free for noncommercial use and it stays where it was the day you cloned it.</p>
        </div>
        <div className="doc">
          <table className="plan-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Public snapshot</th>
                <th scope="col">Stream</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Rules and tool guides</th>
                <td>As of the last snapshot</td>
                <td>Current, within a minute of a change</td>
              </tr>
              <tr>
                <th scope="row">Updates</th>
                <td>Re-clone or re-install by hand</td>
                <td>Automatic on every session or every morning</td>
              </tr>
              <tr>
                <th scope="row">Changelog</th>
                <td>Git history</td>
                <td>Delivered with each sync, rule IDs named</td>
              </tr>
              <tr>
                <th scope="row">MCP server</th>
                <td>Snapshot rules</td>
                <td>Live rules, per-tool guides, review prompt</td>
              </tr>
              <tr>
                <th scope="row">Commercial use</th>
                <td>Not licensed</td>
                <td>Included for the subscriber</td>
              </tr>
              <tr>
                <th scope="row">Price</th>
                <td>Free</td>
                <td>{PRICE_LABEL}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="quick" id="setup" aria-labelledby="setup-title">
        <div className="section-label">
          <span>03</span>
          <h2 id="setup-title">Setup</h2>
          <p>
            After checkout you get a key that starts with <code>nlu_</code>. Three commands install and keep it current.
            Node 18 or newer.
          </p>
        </div>
        <CopyBlock value={`npx github:jtc268/not-like-us login nlu_...\nnpx github:jtc268/not-like-us sync\nnpx github:jtc268/not-like-us hook`} />
      </section>

      <section className="quick" aria-labelledby="where-title">
        <div className="section-label">
          <span>04</span>
          <h2 id="where-title">Where sync writes</h2>
          <p>Only folders that exist on the machine are touched. Managed blocks are marked and can be removed with uninstall.</p>
        </div>
        <div className="doc">
          <ul>
            <li>
              <b>Shared Agent Skills folder</b> <code>~/.agents/skills/not-like-us/</code>, read by Codex, Cursor, Gemini CLI,
              Copilot, OpenClaw, and the skills CLI.
            </li>
            <li>
              <b>Claude Code</b> <code>~/.claude/skills/not-like-us/</code> and an always-on rules file at{' '}
              <code>~/.claude/rules/not-like-us.md</code>.
            </li>
            <li>
              <b>Codex CLI</b> <code>~/.codex/skills/not-like-us/</code> and a managed block in <code>~/.codex/AGENTS.md</code>.
            </li>
            <li>
              <b>Cursor</b> <code>~/.cursor/skills/not-like-us/</code>.
            </li>
            <li>
              <b>Gemini CLI</b> <code>~/.gemini/skills/not-like-us/</code> and a managed block in <code>~/.gemini/GEMINI.md</code>.
            </li>
            <li>
              <b>GitHub Copilot</b> <code>~/.copilot/skills/not-like-us/</code> and a managed block in{' '}
              <code>~/.copilot/copilot-instructions.md</code>.
            </li>
            <li>
              <b>OpenClaw</b> <code>~/.openclaw/skills/not-like-us/</code> and a managed block in{' '}
              <code>~/.openclaw/workspace/AGENTS.md</code>.
            </li>
            <li>
              <b>Hermes Agent</b> <code>~/.hermes/skills/not-like-us/</code>.
            </li>
            <li>
              <b>Any project</b> <code>nlu sync --project</code> writes <code>.agents/skills/not-like-us/</code> and a block in the
              AGENTS.md of that project.
            </li>
          </ul>
        </div>
      </section>

      <section className="quick" aria-labelledby="auto-title">
        <div className="section-label">
          <span>05</span>
          <h2 id="auto-title">Keeping it current</h2>
          <p>
            <code>hook</code> adds a session-start hook to Claude Code, Codex, Cursor, Gemini CLI, and Copilot. It re-syncs
            when the last check is older than six hours and prints one line when something changed. <code>schedule</code>{' '}
            uses the OS scheduler instead. OpenClaw and Hermes have their own.
          </p>
        </div>
        <CopyBlock
          value={`# OpenClaw: daily at 06:00\nopenclaw automations create "0 6 * * *" --name not-like-us --command 'node ~/.config/not-like-us/nlu.mjs sync --quiet'\n\n# Hermes: install from the keyed URL, then let hermes skills update re-fetch it\nhermes skills install ${SITE}/v1/k/nlu_.../SKILL.md\nhermes cron create "0 6 * * *" "Run hermes skills update" --no-agent\n\n# Any machine, no npm: fetch the client and run it\ncurl -fsSL ${SITE}/nlu.mjs -o nlu.mjs && node nlu.mjs sync`}
        />
      </section>

      <section className="quick" aria-labelledby="mcp-title">
        <div className="section-label">
          <span>06</span>
          <h2 id="mcp-title">MCP</h2>
          <p>
            The same client runs as a stdio MCP server. Resources for the skill, the paste block, both rule sets, and every
            tool guide. One tool, <code>not_like_us_rules</code>, that returns the current rules plus the guide for a named
            generator. One prompt, <code>not-like-us-review</code>.
          </p>
        </div>
        <CopyBlock
          value={`# Claude Code\nclaude mcp add --scope user not-like-us -- npx -y github:jtc268/not-like-us mcp\n\n# Codex CLI, in ~/.codex/config.toml\n[mcp_servers.not-like-us]\ncommand = "npx"\nargs = ["-y", "github:jtc268/not-like-us", "mcp"]\n\n# Cursor ~/.cursor/mcp.json, Gemini ~/.gemini/settings.json, Copilot ~/.copilot/mcp-config.json\n{ "mcpServers": { "not-like-us": { "command": "npx", "args": ["-y", "github:jtc268/not-like-us", "mcp"] } } }\n\n# OpenClaw\nopenclaw mcp add not-like-us --command npx --arg -y --arg github:jtc268/not-like-us --arg mcp\n\n# Hermes, in ~/.hermes/config.yaml\nmcp_servers:\n  not-like-us:\n    command: "npx"\n    args: ["-y", "github:jtc268/not-like-us", "mcp"]`}
        />
      </section>

      <section className="quick" aria-labelledby="x402-title">
        <div className="section-label">
          <span>07</span>
          <h2 id="x402-title">Agents pay by themselves</h2>
          <p>
            An agent with a USDC wallet does not need you at the keyboard. The pass endpoint answers 402 with x402
            requirements; any x402 client pays and gets a key back. Paying again from the same wallet extends the same
            key. Machine-readable details at <code>/agents</code>, <code>/openapi.json</code>, and{' '}
            <code>/.well-known/x402</code>.
          </p>
        </div>
        <CopyBlock
          value={`# 1. Ask for the price (HTTP 402, x402 v2, USDC on Base, Polygon, or Arbitrum)\ncurl -i ${SITE}/v1/x402/pass\n\n# 2. Pay with any x402 client, for example @x402/fetch, and read the key from the JSON\n#    { "key": "nlu_...", "until": "...", "days": 30 }\n\n# 3. Use it\nnpx github:jtc268/not-like-us login nlu_... && npx github:jtc268/not-like-us sync`}
        />
      </section>

      <section className="quick" aria-labelledby="free-title">
        <div className="section-label">
          <span>08</span>
          <h2 id="free-title">Try it free first</h2>
          <p>Every command works without a key. It installs the public snapshot and tells you how far behind the stream it is.</p>
        </div>
        <CopyBlock value={`npx github:jtc268/not-like-us sync\nnpx skills add jtc268/not-like-us --skill not-like-us --global --yes\nhermes skills install ${SITE}/skills/not-like-us/SKILL.md`} />
      </section>

      <section className="method" id="manage">
        <div className="section-label">
          <span>09</span>
          <h2>Billing and keys</h2>
          <p>
            {recovered
              ? 'If that address has a subscription, the key is on its way.'
              : 'Manage billing with your key. Lost the key? Enter the checkout email and it is resent.'}
          </p>
        </div>
        <div className="doc">
          <form className="inline-form" method="post" action="/v1/portal">
            <label htmlFor="portal-key">Key</label>
            <input id="portal-key" name="key" placeholder="nlu_..." required />
            <button type="submit">Manage billing</button>
          </form>
          <form className="inline-form" method="post" action="/v1/recover">
            <label htmlFor="recover-email">Checkout email</label>
            <input id="recover-email" name="email" type="email" placeholder="you@example.com" required />
            <button type="submit">Resend key</button>
          </form>
          <p>
            Rotate a key from the client with <code>nlu rotate</code>. The old key stops working within ten minutes.
          </p>
        </div>
      </section>

      <section className="method" id="terms">
        <div className="section-label">
          <span>10</span>
          <h2>Terms</h2>
          <p>Plain language. The Stripe receipt and the billing portal are the record.</p>
        </div>
        <div className="doc terms">
          <p>
            <b>What you buy.</b> Access for one person to the Not Like Us Stream: the feed, the client, the MCP server, and
            the changelog, on any number of machines that person uses, for as long as the subscription is active.
          </p>
          <p>
            <b>Billing.</b> {PRICE_LABEL}, charged by Stripe on the day you subscribe and monthly after that. Cancel from
            the billing portal. Access continues to the end of the paid month. Refunds within seven days of a charge on
            request to stream@adorellc.pro.
          </p>
          <p>
            <b>Pay once.</b> A prepaid pass is $4.99 per 30 days for 1 to 12 months, paid once through any method Stripe
            offers, including USDC where enabled. It does not renew. Agents can buy a 30-day pass in USDC over x402.
            Prepaid passes are refundable within seven days if the key has not been used.
          </p>
          <p>
            <b>License.</b> The public repository is licensed under PolyForm Noncommercial 1.0.0. An active subscription
            also licenses the subscriber to use the rules and guides commercially, including inside products and client
            work. Sharing a key, redistributing the feed, or offering it as a service is not licensed.
          </p>
          <p>
            <b>Data.</b> Stripe holds the payment details and email. This site stores nothing else about you. The email is
            used for the key and billing messages only.
          </p>
          <p>
            <b>Provider.</b> Adore LLC, United States. Questions to stream@adorellc.pro.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <p>One tell cannot prove authorship.</p>
        <Link href="/">Back to the manual ↗</Link>
      </footer>
    </main>
  );
}
