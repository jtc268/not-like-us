import { authorize, errorResponse, json, parseKey, portalUrl } from '../../../lib/stream';

// Takes the subscriber key from a form or JSON body and sends the customer to
// the Stripe billing portal to update payment, view invoices, or cancel.
export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const type = request.headers.get('content-type') ?? '';
    let key = '';
    if (type.includes('application/json')) {
      key = String(((await request.json()) as { key?: string }).key ?? '');
    } else {
      const field = (await request.formData()).get('key');
      key = typeof field === 'string' ? field : '';
    }
    const parsed = await parseKey(key);
    if (!parsed) return json({ error: 'That key is not valid.' }, 401);
    // A canceled subscriber can still reach the portal to resubscribe or read invoices.
    await authorize(key);
    return Response.redirect(await portalUrl(parsed.customerId, origin), 303);
  } catch (error) {
    return errorResponse(error);
  }
}
