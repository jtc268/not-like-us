import { SITE } from '../../lib/stream';

// The subscription page moved to /subscribe. Old links keep working. The
// absolute host is used because the container sits behind a proxy and only
// sees plain http.
export async function GET(request: Request) {
  const url = new URL(request.url);
  return Response.redirect(`${SITE}/subscribe${url.search}${url.hash}`, 308);
}
