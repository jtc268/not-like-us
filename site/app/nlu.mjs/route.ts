// oxlint-disable-next-line import/default
import client from '../../../stream/nlu.mjs?raw';
import { text } from '../../lib/stream';

// The client, served from the site so a machine without npm can fetch it:
//   curl -fsSL https://notlikeus.adorellc.pro/nlu.mjs -o nlu.mjs && node nlu.mjs sync
export async function GET() {
  return text(client, 'text/javascript; charset=utf-8', 200, { 'cache-control': 'public, max-age=3600' });
}
