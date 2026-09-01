// The release test ledger, read from the recorded runs at build time.
type Run = {
  id: string;
  date: string;
  label: string;
  model: string;
  reviewed: boolean;
  summary: { prompts: number; observations: number; rules_hit: { rule: string; count: number }[]; new_tells: unknown[] };
};

const files = import.meta.glob('../../manual/benchmarks/runs/*/run.json', { eager: true, import: 'default' }) as Record<string, Run>;
const runs = Object.values(files).sort((a, b) => b.date.localeCompare(a.date) || a.label.localeCompare(b.label));

export default function ReleaseLedger() {
  if (!runs.length) return null;
  return (
    <div className="doc">
      <table className="plan-table ledger">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Model</th>
            <th scope="col">Prompts</th>
            <th scope="col">Defaults found</th>
            <th scope="col">Rules they hit</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>{run.date}</td>
              <td>{run.label}</td>
              <td>{run.summary.prompts}</td>
              <td>{run.summary.observations}</td>
              <td>{run.summary.rules_hit.slice(0, 4).map((hit) => `${hit.rule} (${hit.count})`).join(', ') || 'none'}</td>
              <td>{run.reviewed ? 'reviewed' : 'draft'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Draft rows are what the judge model found. A person reviews each one, and only reviewed findings become rules
        in the stream.
      </p>
    </div>
  );
}
