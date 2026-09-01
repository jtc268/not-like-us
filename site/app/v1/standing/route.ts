import { authorize, errorResponse, json, keyFromRequest } from '../../../lib/stream';

export async function GET(request: Request) {
  try {
    const verdict = await authorize(keyFromRequest(request));
    if (!verdict.ok) return json({ error: verdict.message, status: verdict.standing?.status ?? 'none' }, verdict.status);
    return json({ status: verdict.standing?.status, renewsAt: verdict.standing?.renewsAt, cancelsAtPeriodEnd: verdict.standing?.cancelsAtPeriodEnd });
  } catch (error) {
    return errorResponse(error);
  }
}
