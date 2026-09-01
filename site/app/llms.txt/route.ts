// oxlint-disable-next-line import/default
import body from '../../../llms.txt?raw';
import { text } from '../../lib/stream';

export async function GET() {
  return text(body, 'text/plain; charset=utf-8', 200, { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' });
}
