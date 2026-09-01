'use client';

import { useMemo, useState } from 'react';

type Rule = {
  id: string;
  kind: string;
  group: string;
  title: string;
  avoid: string;
  better: string;
  scope: string[];
  evidence: string;
  sources: string[];
};

type Source = { id: string; title: string; url: string };
type Tool = { id: string; name: string };

export default function RuleExplorer({ rules, sources, tools }: { rules: Rule[]; sources: Source[]; tools: Tool[] }) {
  const [kind, setKind] = useState('all');
  const [tool, setTool] = useState('all');
  const [query, setQuery] = useState('');
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);

  const filtered = rules.filter((rule) => {
    const matchesKind = kind === 'all' || rule.kind === kind;
    const matchesTool = tool === 'all' || rule.scope.includes('all') || rule.scope.includes(tool);
    const haystack = `${rule.id} ${rule.group} ${rule.title} ${rule.avoid} ${rule.better}`.toLowerCase();
    return matchesKind && matchesTool && haystack.includes(query.toLowerCase());
  });

  return (
    <div className="explorer">
      <div className="filters" aria-label="Rule filters">
        <div className="filter-tabs">
          {['all', 'writing', 'design'].map((value) => (
            <button
              className={kind === value ? 'active' : ''}
              key={value}
              onClick={() => setKind(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
        <label htmlFor="tool-filter">
          <span>Tool</span>
          <select id="tool-filter" value={tool} onChange={(event) => setTool(event.target.value)}>
            <option value="all">All tools</option>
            {tools.map((item) => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="search" htmlFor="rule-search">
          <span>Search</span>
          <input id="rule-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="cards, em dashes, type..." />
        </label>
        <output>{filtered.length} {filtered.length === 1 ? 'rule' : 'rules'}</output>
      </div>

      <div className="rule-list">
        {filtered.map((rule) => (
          <article key={rule.id}>
            <header>
              <span>{rule.id}</span>
              <span>{rule.group}</span>
              <b>{rule.evidence}</b>
            </header>
            <h3>{rule.title}</h3>
            <dl>
              <div>
                <dt>Reject</dt>
                <dd>{rule.avoid}</dd>
              </div>
              <div>
                <dt>Try</dt>
                <dd>{rule.better}</dd>
              </div>
            </dl>
            <footer>
              {rule.sources.map((id) => {
                const source = sourceById.get(id);
                return source ? <a href={source.url} key={id}>{source.title} ↗</a> : null;
              })}
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
