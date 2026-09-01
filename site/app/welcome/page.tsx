import Link from 'next/link';
import CopyBlock from '../../components/copy-block';
import { checkoutSession, customer, grantDays, makeKey, markGranted, sendKeyEmail, setCustomerMetadata, SITE } from '../../lib/stream';

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
    const session = await checkoutSession(sessionId);
    if (!session.customerId || !session.paid) {
      throw new Error('Checkout did not complete. If your card was charged, email stream@adorellc.pro with the time of purchase.');
    }
    if (session.mode === 'payment' && !session.granted) {
      const grant = await grantDays(session.customerId, 30 * session.months, { nlu_pass_months: String(session.months) });
      passUntil = grant.until;
      if (session.paymentIntentId) await markGranted(session.paymentIntentId, grant.until);
    }
    const account = await customer(session.customerId);
    key = await makeKey(session.customerId, account.keyVersion);
    email = session.email ?? account.email;
    emailed = account.welcomeSent;
    if (!account.welcomeSent && email) {
      emailed = await sendKeyEmail(email, key);
      if (emailed) await setCustomerMetadata(session.customerId, { nlu_welcome_sent: new Date().toISOString() });
    }
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
          <Link href="/stream">Stream</Link>
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
              Already subscribed and lost the key? Use the recover form on <Link href="/stream#manage">the Stream page</Link>.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="quick" aria-labelledby="welcome-title">
            <div className="section-label">
              <span>01</span>
              <h2 id="welcome-title">Your Stream key</h2>
              <p>
                {emailed && email ? `A copy is in your inbox at ${email}. ` : ''}
                {passUntil ? `Your prepaid pass runs until ${passUntil.slice(0, 10)} and does not renew. ` : ''}
                Keep it private. It is the only login, and it works on every machine you own.
              </p>
            </div>
            <CopyBlock value={key} />
          </section>

          <section className="quick" aria-labelledby="setup-title">
            <div className="section-label">
              <span>02</span>
              <h2 id="setup-title">Set up once</h2>
              <p>
                Node 18 or newer. The first command saves the key, the second installs the rules into every agent on the
                machine, the third keeps them current at the start of every session.
              </p>
            </div>
            <CopyBlock
              value={`npx github:jtc268/not-like-us login ${key}\nnpx github:jtc268/not-like-us sync\nnpx github:jtc268/not-like-us hook`}
            />
          </section>

          <section className="quick" aria-labelledby="direct-title">
            <div className="section-label">
              <span>03</span>
              <h2 id="direct-title">Or pull by URL</h2>
              <p>
                Hermes installs skills from a link and re-fetches them on update. Any tool that reads a URL can do the same.
              </p>
            </div>
            <CopyBlock value={`hermes skills install ${SITE}/v1/k/${key}/SKILL.md\nhermes cron create "0 6 * * *" "Run hermes skills update" --no-agent`} />
          </section>

          <section className="quick" aria-labelledby="mcp-title">
            <div className="section-label">
              <span>04</span>
              <h2 id="mcp-title">MCP for any client</h2>
              <p>
                Exposes the live rules as resources, a tool, and a review prompt. Setup for each tool is on{' '}
                <Link href="/stream#setup">the Stream page</Link>.
              </p>
            </div>
            <CopyBlock value={`claude mcp add --scope user not-like-us -- npx -y github:jtc268/not-like-us mcp`} />
          </section>

          <section className="method" id="manage">
            <div className="section-label">
              <span>05</span>
              <h2>Billing</h2>
              <p>Update the card, download invoices, or cancel. Cancelling stops the stream at the end of the paid month.</p>
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
        <Link href="/stream">Stream setup ↗</Link>
      </footer>
    </main>
  );
}
