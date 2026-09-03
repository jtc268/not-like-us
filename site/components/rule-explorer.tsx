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
  reviewed: string;
};

type Source = { id: string; title: string; displayTitle?: string; publisher: string; url: string };
type Tool = { id: string; name: string };
const reviewStamp = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const sourceStamp = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' });

function RuleList({ rules, sourceById }: { rules: Rule[]; sourceById: Map<string, Source> }) {
  return (
    <div className="rule-list">
      {rules.map((rule) => (
        <article key={rule.id}>
          <header>
            <span>{rule.id}</span>
            <span>{rule.group}</span>
            <time dateTime={rule.reviewed}>Reviewed {reviewStamp.format(new Date(`${rule.reviewed}T00:00:00Z`))}</time>
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
              return source ? (
                <a href={source.url} key={id}>
                  {source.publisher}: {source.displayTitle ?? source.title} ↗
                </a>
              ) : null;
            })}
          </footer>
        </article>
      ))}
    </div>
  );
}

export default function RuleExplorer({ rules, sources, tools, checkedAt }: { rules: Rule[]; sources: Source[]; tools: Tool[]; checkedAt: string }) {
  const [kind, setKind] = useState('all');
  const [tool, setTool] = useState('all');
  const [query, setQuery] = useState('');
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const toolName = tools.find((item) => item.id === tool)?.name;
  const needle = query.trim().toLowerCase();

  const matches = rules.filter((rule) => {
    const matchesKind = kind === 'all' || rule.kind === kind;
    const matchesTool = tool === 'all' || rule.scope.includes('all') || rule.scope.includes(tool);
    const haystack = `${rule.id} ${rule.group} ${rule.title} ${rule.avoid} ${rule.better}`.toLowerCase();
    return matchesKind && matchesTool && haystack.includes(needle);
  });
  const flagged = tool === 'all' ? matches : matches.filter((rule) => rule.scope.includes(tool));
  const general = tool === 'all' ? [] : matches.filter((rule) => !rule.scope.includes(tool));

  function reset() {
    setKind('all');
    setTool('all');
    setQuery('');
  }

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
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="search" htmlFor="rule-search">
          <span>Search</span>
          <input
            id="rule-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="cards, em dashes, type..."
          />
        </label>
        <output>
          <span>
            {matches.length} {matches.length === 1 ? 'rule' : 'rules'}
          </span>
          <small>Sources checked {sourceStamp.format(new Date(checkedAt))}</small>
        </output>
      </div>

      {matches.length === 0 ? (
        <div className="empty" aria-live="polite">
          <p>
            No rule matches {needle ? `“${query.trim()}”` : 'these filters'}
            {kind === 'all' ? '' : ` under ${kind}`}
            {toolName ? ` for ${toolName}` : ''}.
          </p>
          <p>
            Try a rule ID such as D-COLOR-001, a group such as Typography, or a word from the pattern
            such as cards or recap.
          </p>
          <button type="button" onClick={reset}>
            Clear filters
          </button>
        </div>
      ) : tool === 'all' ? (
        <RuleList rules={matches} sourceById={sourceById} />
      ) : (
        <>
          <h3 className="group-heading">
            Flagged for {toolName} <span>{flagged.length}</span>
          </h3>
          {flagged.length === 0 ? (
            <p className="group-note">
              No rule names {toolName} specifically. The general rules below still apply.
            </p>
          ) : (
            <RuleList rules={flagged} sourceById={sourceById} />
          )}
          {general.length > 0 ? (
            <>
              <h3 className="group-heading">
                Applies to every tool <span>{general.length}</span>
              </h3>
              <RuleList rules={general} sourceById={sourceById} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
