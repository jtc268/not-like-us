'use client';

import { useEffect, useState } from 'react';

type Version = {
  stream: { version: string; updated_at: string; rule_count: number; source: string };
  snapshot: { version: string; rule_count: number };
};

export default function StreamStatus() {
  const [data, setData] = useState<Version | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/v1/version')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body) => setData(body as Version))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="stream-status">Version check unavailable right now.</p>;
  if (!data) return <p className="stream-status">Checking the stream version.</p>;
  const updated = data.stream.updated_at.slice(0, 10);
  return (
    <dl className="stream-status">
      <div>
        <dt>Stream</dt>
        <dd>
          {data.stream.version}, updated {updated}, {data.stream.rule_count} rules
        </dd>
      </div>
      <div>
        <dt>Public snapshot</dt>
        <dd>
          {data.snapshot.version}, {data.snapshot.rule_count} rules
        </dd>
      </div>
    </dl>
  );
}
