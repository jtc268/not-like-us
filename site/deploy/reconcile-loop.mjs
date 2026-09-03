const secret = process.env.NLU_JOB_SECRET;
const endpoint = process.env.NLU_RECONCILE_URL || 'http://127.0.0.1:8080/v1/jobs/reconcile';

if (!secret) {
  console.error('checkout reconciliation disabled: NLU_JOB_SECRET is missing');
  process.exit(1);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await wait(15_000);
for (;;) {
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { authorization: `Bearer ${secret}` } });
    if (!response.ok) console.error('checkout reconciliation returned', response.status);
  } catch (error) {
    console.error('checkout reconciliation request failed', error instanceof Error ? error.message : String(error));
  }
  await wait(60_000);
}
