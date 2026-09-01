import { json, PRICE_LABEL, SITE } from '../../lib/stream';
import { PASS_DAYS, RESOURCE_URL } from '../../lib/x402';

// OpenAPI for the feed with payment info in the shape agents and the Stripe
// Directory look for (x-payment-info.offers).
export async function GET() {
  const keyed = {
    security: [{ bearerKey: [] }],
    responses: {
      '200': { description: 'OK' },
      '401': { description: 'Missing, invalid, or rotated key. Body carries buy links.' },
      '402': { description: 'No active subscription or pass. Body carries buy links.' },
    },
  };
  return json(
    {
      openapi: '3.1.0',
      info: {
        title: 'Not Like Us Stream',
        version: '1.0.0',
        description: `Live rules feed for AI writing and interface work. ${PRICE_LABEL} by subscription, or a ${PASS_DAYS}-day pass. Agents pay USDC over x402 at ${RESOURCE_URL}.`,
        contact: { email: 'stream@adorellc.pro', url: `${SITE}/stream` },
        termsOfService: `${SITE}/stream#terms`,
      },
      servers: [{ url: SITE }],
      'x-payment-info': {
        offers: [
          { amount: '4.99', currency: 'USD', intent: 'session', period: `P${PASS_DAYS}D`, method: 'x402', endpoint: RESOURCE_URL, asset: 'USDC', networks: ['eip155:8453', 'eip155:137', 'eip155:42161'] },
          { amount: '4.99', currency: 'USD', intent: 'subscription', period: 'P1M', method: 'stripe-checkout', endpoint: `${SITE}/v1/checkout` },
          { amount: '4.99', currency: 'USD', intent: 'charge', period: `P${PASS_DAYS}D`, method: 'stripe-checkout', endpoint: `${SITE}/v1/pass`, note: 'Quantity 1 to 12 periods in one payment; no renewal.' },
        ],
      },
      components: { securitySchemes: { bearerKey: { type: 'http', scheme: 'bearer', description: 'Stream key, nlu_...' } } },
      paths: {
        '/v1/version': { get: { summary: 'Stream and snapshot versions', responses: { '200': { description: 'OK' } } } },
        '/v1/snapshot': { get: { summary: 'Public snapshot in feed format (free)', responses: { '200': { description: 'OK' } } } },
        '/v1/feed': { get: { summary: 'Current rules, guides, data, and changelog as one JSON document. Supports If-None-Match.', ...keyed } },
        '/v1/k/{key}/{path}': {
          get: {
            summary: 'One file from the feed with the key in the path, for tools that only fetch URLs (SKILL.md, AGENTS.md, prompt.txt, CHANGELOG.md, manual/...).',
            parameters: [
              { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'path', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: keyed.responses,
          },
        },
        '/v1/standing': { get: { summary: 'Subscription status for a key', ...keyed } },
        '/v1/x402/pass': {
          get: {
            summary: `Buy a ${PASS_DAYS}-day key with USDC over x402. Without PAYMENT-SIGNATURE the response is 402 with PAYMENT-REQUIRED.`,
            responses: {
              '200': { description: 'Key issued', content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string' }, until: { type: 'string', format: 'date-time' }, days: { type: 'integer' } } } } } },
              '402': { description: 'Payment required. Header PAYMENT-REQUIRED carries base64 x402 v2 requirements.' },
            },
          },
        },
        '/v1/checkout': { post: { summary: 'Redirect to Stripe Checkout for the monthly subscription', responses: { '303': { description: 'Redirect' } } } },
        '/v1/pass': { post: { summary: 'Redirect to Stripe Checkout for a prepaid pass', responses: { '303': { description: 'Redirect' } } } },
        '/v1/recover': { post: { summary: 'Email the key to the checkout address', responses: { '200': { description: 'Neutral response' } } } },
        '/v1/rotate': { post: { summary: 'Replace the key', ...keyed } },
      },
    },
    200,
    { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' },
  );
}
