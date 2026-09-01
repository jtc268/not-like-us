import { errorResponse, feed, json, snapshotFeed } from '../../../lib/stream';

// The free tier: the snapshot baked into this build, with the stream version
// alongside so a client can show how far behind it is.
export async function GET(request: Request) {
  try {
    const snapshot = snapshotFeed();
    const etag = `"${snapshot.version}"`;
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } });
    let streamVersion: string | null = null;
    try {
      streamVersion = (await feed()).version;
    } catch {
      streamVersion = null;
    }
    return json({ ...snapshot, stream_version: streamVersion }, 200, { etag, 'cache-control': 'public, max-age=300' });
  } catch (error) {
    return errorResponse(error);
  }
}
