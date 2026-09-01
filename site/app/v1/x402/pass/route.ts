import { customer, customerForPayer, errorResponse, grantDays, json, makeKey, SITE } from '../../../../lib/stream';
import { CORS, decode, encode, PASS_DAYS, paymentRequired, payTo, pickRequirement, settle, verify } from '../../../../lib/x402';

// GET without payment: HTTP 402 with x402 v2 requirements in the
// PAYMENT-REQUIRED header (and the same JSON in the body).
// GET with PAYMENT-SIGNATURE: verify and settle through the facilitator, then
// issue a 30-day key. Repeat payments from the same wallet extend the same key.
async function handle(request: Request): Promise<Response> {
  if (!payTo()) return json({ error: 'x402 payments are not configured on this server.' }, 503, CORS);

  const challenge = (error?: string) => {
    const body = paymentRequired(error);
    return new Response(JSON.stringify(body, null, 2), {
      status: 402,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'payment-required': encode(body), ...CORS },
    });
  };

  const header = request.headers.get('payment-signature') ?? request.headers.get('x-payment');
  if (!header) return challenge();

  let payload: Parameters<typeof pickRequirement>[0];
  try {
    payload = decode(header) as Parameters<typeof pickRequirement>[0];
  } catch {
    return challenge('PAYMENT-SIGNATURE is not base64 JSON.');
  }
  const requirement = pickRequirement(payload);
  if (!requirement) return challenge('No accepted requirement matches the payment. Use scheme exact on one of the listed networks.');

  try {
    const verified = await verify(payload, requirement);
    if (!verified.isValid) return challenge(`Payment not valid: ${verified.invalidReason ?? 'unknown reason'}.`);
    const settled = await settle(payload, requirement);
    if (!settled.success) return challenge(`Settlement failed: ${settled.errorReason ?? 'unknown reason'}.`);

    const payer = (settled.payer ?? verified.payer ?? payload.payload?.authorization?.from ?? 'unknown').toLowerCase();
    const paymentHeaders = { 'payment-response': encode(settled), 'x-payment-response': encode(settled), ...CORS };
    try {
      const customerId = await customerForPayer(payer, requirement.network);
      const grant = await grantDays(customerId, PASS_DAYS, {
        nlu_x402_payer: payer,
        nlu_x402_network: requirement.network,
        nlu_x402_transaction: settled.transaction ?? '',
      });
      const account = await customer(customerId);
      const key = await makeKey(customerId, account.keyVersion);
      return json(
        {
          key,
          until: grant.until,
          days: PASS_DAYS,
          payer,
          network: settled.network ?? requirement.network,
          transaction: settled.transaction ?? null,
          feed: `${SITE}/v1/feed`,
          skill: `${SITE}/v1/k/${key}/SKILL.md`,
          next: [`Authorization: Bearer ${key} on ${SITE}/v1/feed`, `npx github:jtc268/not-like-us login ${key}`, 'npx github:jtc268/not-like-us sync', 'Pay again from the same wallet before the expiry to extend the same key by 30 days.'],
        },
        200,
        paymentHeaders,
      );
    } catch (error) {
      console.error('x402 settled but grant failed', error);
      return json(
        {
          error: 'Payment settled but the key could not be issued. Email stream@adorellc.pro with the transaction and payer address.',
          payer,
          transaction: settled.transaction ?? null,
        },
        500,
        paymentHeaders,
      );
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = handle;
export const POST = handle;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
