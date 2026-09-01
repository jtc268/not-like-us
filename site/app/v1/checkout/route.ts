import { checkoutUrl, errorResponse } from '../../../lib/stream';

// Only a form post creates a Stripe Checkout session, so crawlers hitting the
// URL do not mint sessions.
export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    return Response.redirect(await checkoutUrl(origin), 303);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  return Response.redirect(`${new URL(request.url).origin}/stream`, 303);
}
