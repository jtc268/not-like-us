import { authorize, buyHints, errorResponse, feed, json, PAYMENT_LINK } from '../../../../lib/stream';

type Context = { params: Promise<{ key: string }> | { key: string } };

// Key-in-URL form of /v1/feed for fetchers that cannot send headers.
export async function GET(_request: Request, context: Context) {
  try {
    const { key } = await context.params;
    const verdict = await authorize(key);
    if (!verdict.ok) return json({ error: verdict.message, buy: buyHints() }, verdict.status, PAYMENT_LINK);
    return json(await feed());
  } catch (error) {
    return errorResponse(error);
  }
}
