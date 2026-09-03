import Link from 'next/link';
import CopyBlock from '../../components/copy-block';
import { fulfillCheckout, SITE } from '../../lib/stream';

type Search = Record<string, string | string[] | undefined>;

export const dynamic = 'force-dynamic';

export default async function Welcome({ searchParams }: { searchParams: Promise<Search> | Search }) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : '';
  let key = '';
  let email: string | null = null;
  let emailed = false;
  let error = '';
  let passUntil = '';

  try {
    if (!sessionId) throw new Error('This page needs the session id that Stripe adds after checkout.');
    ({ key, email, emailed, passUntil } = await fulfillCheckout(sessionId, true));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Something failed.';
  }

  return (
    <main>
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Not Like Us home">
          NLU<span>↗</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/#rules">Rules</Link>
          <Link href="/subscribe">Subscribe</Link>
          <a href="https://github.com/jtc268/not-like-us">GitHub</a>
        </nav>
      </header>

      {error ? (
        <section className="quick" aria-labelledby="welcome-title">
          <div className="section-label">
            <span>ERR</span>
            <h2 id="welcome-title">No key yet</h2>
            <p>{error}</p>
          </div>
          <div className="doc">
            <p>
              Already subscribed and lost the key? Use the recover form on <Link href="/subscribe#manage">the subscribe page</Link>.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="quick" aria-labelledby="welcome-title">
            <div className="section-label">
              <span>01</span>
              <h2 id="welcome-title">Payment complete</h2>
              <p>
                {emailed && email ? `Your key and setup command are in your inbox at ${email}. ` : ''}
                {passUntil ? `Your prepaid pass runs until ${passUntil.slice(0, 10)} and does not renew. ` : ''}
                The key below opens the current private Stream on every machine you own.
              </p>
            </div>
            <CopyBlock value={key} />
          </section>

          <section className="quick" aria-labelledby="setup-title">
            <div className="section-label">
              <span>02</span>
              <h2 id="setup-title">Copy one command</h2>
              <p>
                Open Terminal on Mac, or PowerShell on Windows. Paste the command and press Enter. Node 18 or newer.
              </p>
            </div>
            <CopyBlock value={`npx github:jtc268/not-like-us setup ${key}`} />
          </section>

          <section className="quick" aria-labelledby="done-title">
            <div className="section-label">
              <span>03</span>
              <h2 id="done-title">That is it</h2>
              <p>The installer finds supported AI tools, writes the current rules, and adds an update check when they start.</p>
            </div>
            <div className="doc">
              <p>
                Your agents now read the private Stream. New reviewed rules arrive on the next update check. Run{' '}
                <code>npx github:jtc268/not-like-us status</code> whenever you want to confirm the installed version.
              </p>
            </div>
          </section>

          <section className="quick" aria-labelledby="direct-title">
            <div className="section-label">
              <span>04</span>
              <h2 id="direct-title">Or pull by URL</h2>
              <p>
                Hermes installs skills from a link and re-fetches them on update.
              </p>
            </div>
            <CopyBlock value={`hermes skills install ${SITE}/v1/k/${key}/SKILL.md\nhermes cron create "0 6 * * *" "Run hermes skills update" --no-agent`} />
          </section>

          <section className="quick" aria-labelledby="mcp-title">
            <div className="section-label">
              <span>05</span>
              <h2 id="mcp-title">MCP for any client</h2>
              <p>
                Live rules over MCP. Setup for each client is on{' '}
                <Link href="/subscribe#setup">the subscribe page</Link>.
              </p>
            </div>
            <CopyBlock value={`claude mcp add --scope user not-like-us -- npx -y github:jtc268/not-like-us mcp`} />
          </section>

          <section className="method" id="manage">
            <div className="section-label">
              <span>06</span>
              <h2>Billing</h2>
              <p>Change the card or cancel. Access runs to the end of the paid month.</p>
            </div>
            <form className="inline-form" method="post" action="/v1/portal">
              <input type="hidden" name="key" value={key} />
              <button type="submit">Manage billing</button>
            </form>
          </section>
        </>
      )}

      <footer className="site-footer">
        <p>One tell cannot prove authorship.</p>
        <Link href="/subscribe">Setup ↗</Link>
      </footer>
    </main>
  );
}
