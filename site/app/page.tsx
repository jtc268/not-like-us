import rules from '../../manual/data/rules.json';
import sources from '../../manual/data/sources.json';
import toolData from '../../manual/data/tools.json';
import quickRules from '../../manual/prompt.txt?raw';
import Link from 'next/link';
import CopyBlock from '../components/copy-block';
import RuleExplorer from '../components/rule-explorer';
import StreamStatus from '../components/stream-status';
import { PRICE_LABEL } from '../lib/stream';

const repo = 'https://github.com/jtc268/not-like-us';
const typeOrder = ['official', 'research', 'repository', 'community'];
const ledger = [...sources].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Not Like Us home">
          NLU<span>↗</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#rules">Rules</a>
          <a href="#tools">Tools</a>
          <Link href="/subscribe">Subscribe</Link>
          <a href={repo}>GitHub</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-index" aria-hidden="true">
          00 / FIELD MANUAL
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Field manual for AI-assisted work</p>
          <h1>
            NOT LIKE
            <br />
            US
          </h1>
          <p className="deck">Rules that make AI work look less the same.</p>
        </div>
        <aside className="hero-note edition-note">
          <span>Current edition</span>
          <strong>SEP 2026</strong>
        </aside>
      </section>

      <section className="quick" aria-labelledby="quick-title">
        <div className="section-label">
          <span>01</span>
          <h2 id="quick-title">Paste this into any AI</h2>
          <p>
            Or install it as a skill: <code>npx skills add jtc268/not-like-us</code>. Sources and full
            guides are on GitHub.
          </p>
        </div>
        <CopyBlock value={quickRules.trim()} />
      </section>

      <section className="catalog" id="rules" aria-labelledby="rules-title">
        <div className="section-label catalog-label">
          <span>02</span>
          <h2 id="rules-title">Rule catalog</h2>
          <p>Filter by medium or generator. Each row says what to reject and what to try next.</p>
        </div>
        <RuleExplorer rules={rules} sources={sources} tools={toolData} />
      </section>

      <section className="tool-strip" id="tools" aria-labelledby="tool-heading">
        <div className="section-label">
          <span>03</span>
          <h2 id="tool-heading">Tool guides</h2>
          <p>Separate writing and design checks for each generator.</p>
        </div>
        <div className="tool-list">
          {toolData.map((tool, index) => (
            <article id={tool.id} key={tool.id}>
              <div className="tool-title">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{tool.name}</h3>
              </div>
              <p>{tool.note}</p>
              <div className="tool-links">
                <a href={`${repo}/blob/main/manual/tools/${tool.id}/WRITING.md`}>Writing ↗</a>
                <a href={`${repo}/blob/main/manual/tools/${tool.id}/DESIGN.md`}>Design ↗</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="quick stream" id="stream" aria-labelledby="stream-title">
        <div className="section-label">
          <span>04</span>
          <h2 id="stream-title">Stream</h2>
          <p>
            This page is a snapshot. A daily release monitor tests newly callable models. Subscribers&apos; agents sync
            each rule after review.
          </p>
        </div>
        <div className="stream-offer">
          <strong>{PRICE_LABEL}</strong>
          <StreamStatus />
          <div className="stream-actions">
            <form method="post" action="/v1/checkout">
              <button type="submit" className="button">
                Subscribe with Stripe
              </button>
            </form>
            <Link href="/subscribe">How it works ↗</Link>
          </div>
        </div>
      </section>

      <section className="method" id="method">
        <div className="section-label">
          <span>05</span>
          <h2>How rules are checked</h2>
          <p>A script fetches every source and records what changed. People approve the guidance.</p>
        </div>
        <div className="source-ledger">
          {ledger.map((source) => (
            <a href={source.url} key={source.id}>
              <span>{source.type}</span>
              <strong>{source.title}</strong>
              <small>{source.publisher}</small>
            </a>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <p>One tell cannot prove authorship.</p>
        <a href={repo}>Fork the field manual ↗</a>
      </footer>
    </main>
  );
}
