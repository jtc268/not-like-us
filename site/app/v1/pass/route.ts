import { errorResponse, passCheckoutUrl } from '../../../lib/stream';

// Prepaid pass checkout: one payment, any method, 1 to 12 months, no renewal.
export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    return Response.redirect(await passCheckoutUrl(origin), 303);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  return Response.redirect(`${new URL(request.url).origin}/stream`, 303);
}
