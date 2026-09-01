import { customer, customersByEmail, errorResponse, json, makeKey, sendKeyEmail, standing } from '../../../lib/stream';

const recent = new Map<string, number>();

// Emails the current key to a subscriber's address. The response is the same
// whether or not the address has a subscription.
export async function POST(request: Request) {
  try {
    const type = request.headers.get('content-type') ?? '';
    let email = '';
    if (type.includes('application/json')) {
      email = String(((await request.json()) as { email?: string }).email ?? '');
    } else {
      const field = (await request.formData()).get('email');
      email = typeof field === 'string' ? field : '';
    }
    email = email.trim().toLowerCase();
    const message = 'If that address has a Stream subscription, the key is on its way. Check spam if it does not arrive in a few minutes.';
    if (!email.includes('@')) return json({ error: 'Enter the email you used at checkout.' }, 400);
    const last = recent.get(email) ?? 0;
    if (Date.now() - last < 10 * 60 * 1000) return json({ message });
    recent.set(email, Date.now());
    for (const customerId of await customersByEmail(email)) {
      const current = await standing(customerId);
      if (!current.ok) continue;
      const account = await customer(customerId);
      await sendKeyEmail(email, await makeKey(customerId, account.keyVersion), 'Your Not Like Us Stream key (recovered)');
      break;
    }
    if (type.includes('application/json')) return json({ message });
    return Response.redirect(`${new URL(request.url).origin}/subscribe?recovered=1`, 303);
  } catch (error) {
    return errorResponse(error);
  }
}
