import { authorize, customer, errorResponse, forget, json, keyFromRequest, makeKey, setCustomerMetadata } from '../../../lib/stream';

export async function POST(request: Request) {
  try {
    const key = keyFromRequest(request);
    const verdict = await authorize(key);
    if (!verdict.ok) return json({ error: verdict.message }, verdict.status);
    const account = await customer(verdict.customerId);
    const version = account.keyVersion + 1;
    await setCustomerMetadata(verdict.customerId, { nlu_key_version: String(version) });
    forget(key);
    return json({ key: await makeKey(verdict.customerId, version), version });
  } catch (error) {
    return errorResponse(error);
  }
}
