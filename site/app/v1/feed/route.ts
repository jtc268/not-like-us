import { authorize, errorResponse, feed, json, keyFromRequest } from '../../../lib/stream';

export async function GET(request: Request) {
  try {
    const verdict = await authorize(keyFromRequest(request));
    if (!verdict.ok) return json({ error: verdict.message }, verdict.status);
    const current = await feed();
    const etag = `"${current.commit ?? current.version}"`;
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } });
    return json(current, 200, { etag });
  } catch (error) {
    return errorResponse(error);
  }
}
