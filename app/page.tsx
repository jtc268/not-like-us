import CopyBlock from '../components/copy-block';
import RuleExplorer from '../components/rule-explorer';
import rules from '../data/rules.json';
import sources from '../data/sources.json';
import toolData from '../data/tools.json';

const quickRules = `Use the Not Like Us rules for every writing and interface decision.
Read: https://github.com/jtc268/not-like-us

Begin with the real user, job, content, and local brand. Local guidance wins.
Reject visual choices the tool supplied without a reason. Common tells include purple glow,
glass, excessive rounded cards, generic heroes, default component libraries, filler imagery,
and motion that explains nothing.
Reject empty writing patterns: setup before the point, fake contrast, vague consensus,
repetitive rhythm, inflated claims, recap endings, and em dashes.
Use real data and real states. Cite factual claims. Preserve the author's voice.
If the work could belong to any product after swapping the logo, make it specific.`;

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
          <a href="#method">Sources</a>
          <a href="https://github.com/jtc268/not-like-us">GitHub</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-index" aria-hidden="true">
          00 / FIELD MANUAL
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Cited rules for AI-assisted work</p>
          <h1>
            NOT LIKE
            <br />
            US
          </h1>
          <p className="deck">Cited field notes on defaults that make unrelated AI work look the same.</p>
        </div>
        <aside className="hero-note">
          <span>Current edition</span>
          <strong>SEP 2026</strong>
          <p>Rules carry sources and a better move, not a prescription.</p>
        </aside>
      </section>

      <section className="quick" aria-labelledby="quick-title">
        <div className="section-label">
          <span>01</span>
          <h2 id="quick-title">Paste this into any AI</h2>
          <p>Short project rules. The full repository carries the source trail.</p>
        </div>
        <CopyBlock value={quickRules} />
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
          <h2 id="tool-heading">Tool field guides</h2>
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
                <a href={`https://github.com/jtc268/not-like-us/blob/main/tools/${tool.id}/WRITING.md`}>
                  Writing ↗
                </a>
                <a href={`https://github.com/jtc268/not-like-us/blob/main/tools/${tool.id}/DESIGN.md`}>
                  Design ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="method" id="method">
        <div className="section-label">
          <span>04</span>
          <h2>How we check rules</h2>
          <p>A scheduled radar checks sources. People approve the guidance.</p>
        </div>
        <div className="source-ledger">
          {sources.map((source) => (
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
        <a href="https://github.com/jtc268/not-like-us">Fork the field manual ↗</a>
      </footer>
    </main>
  );
}
