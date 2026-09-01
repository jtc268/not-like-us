'use client';

import { useState } from 'react';

export default function CopyBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="copy-block">
      <button type="button" onClick={copy} aria-live="polite">
        {copied ? 'Copied' : 'Copy rules'}
      </button>
      <pre>
        <code>{value}</code>
      </pre>
    </div>
  );
}
