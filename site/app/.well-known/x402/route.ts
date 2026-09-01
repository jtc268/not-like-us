import { json, SITE } from '../../../lib/stream';
import { facilitator, PASS_DAYS, requirements, RESOURCE_URL, X402_VERSION } from '../../../lib/x402';

// Seller manifest for x402 discovery (IETF draft-hawkins-x402-dns-discovery
// shape, plus the resource list). Not required by any client yet; cheap to publish.
export async function GET() {
  return json(
    {
      x402Version: X402_VERSION,
      kind: 'seller',
      name: 'Not Like Us Stream',
      site: SITE,
      facilitator: { baseUrl: facilitator(), endpoints: { verify: '/verify', settle: '/settle', supported: '/supported' } },
      resources: [
        {
          url: RESOURCE_URL,
          method: 'GET',
          description: `${PASS_DAYS}-day key for the live rules feed. Pay USD 4.99 in USDC; the response is JSON with the key.`,
          accepts: requirements(),
          output: { type: 'json', example: { key: 'nlu_...', until: '2026-10-01T00:00:00.000Z', days: PASS_DAYS } },
        },
      ],
      also: { llms: `${SITE}/llms.txt`, openapi: `${SITE}/openapi.json`, agents: `${SITE}/agents`, humans: `${SITE}/stream` },
    },
    200,
    { 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' },
  );
}
