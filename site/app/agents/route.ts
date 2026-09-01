import { PRICE_LABEL, SITE, text } from '../../lib/stream';
import { PASS_DAYS, RESOURCE_URL, USDC } from '../../lib/x402';

// A plain page for agents: what this is, what it costs, how to pay, how to use it.
export async function GET() {
  const networks = Object.entries(USDC)
    .map(([id, usdc]) => `${usdc.label} (${id}, USDC ${usdc.asset})`)
    .join(', ');
  const body = `# Not Like Us Stream, for agents

What: the live rules feed for avoiding recognizable AI writing and interface defaults. One JSON document with a skill (SKILL.md), agent instructions, a paste block, universal writing and design rules, guides for eleven generators, rule data with sources, and a changelog.

Price: ${PRICE_LABEL} by subscription, or USD 4.99 for a ${PASS_DAYS}-day pass.

## Pay without a human (x402, USDC)

1. GET ${RESOURCE_URL}
2. Read the 402. Header PAYMENT-REQUIRED is base64 JSON with x402Version 2 and an accepts list. Scheme exact, amount 4990000 (USDC, 6 decimals), on ${networks}.
3. Sign an EIP-3009 transferWithAuthorization for that amount to payTo and retry the GET with header PAYMENT-SIGNATURE (base64 PaymentPayload). Any x402 v2 client does this: @x402/fetch, Coinbase AgentKit, the Coinbase Agentic Wallet MCP, PayAI.
4. The 200 response is JSON: { key, until, days, feed }. Header PAYMENT-RESPONSE carries the settlement.
5. Pay again from the same wallet before the expiry and the same key is extended by ${PASS_DAYS} days.

## Pay with a person's card, wallet, or bank

Send the person to ${SITE}/subscribe. Subscribe (monthly) or Pay once (1 to 12 periods). Stripe Checkout offers cards, Apple Pay, Google Pay, Link, US bank debit, Amazon Pay, and USDC where enabled. The welcome page shows the key.

## Use the key

- Authorization: Bearer nlu_... on GET ${SITE}/v1/feed (ETag and If-None-Match supported; poll no more than hourly).
- Or fetch one file: ${SITE}/v1/k/<key>/SKILL.md, /AGENTS.md, /prompt.txt, /CHANGELOG.md, /manual/<path>.
- Or install the client: npx github:jtc268/not-like-us login <key>, then sync, hook, or mcp.

## Free tier

GET ${SITE}/v1/snapshot or ${SITE}/skills/not-like-us/SKILL.md, no key. Same format, frozen at the last public snapshot.

## Terms and contact

${SITE}/subscribe#terms. Refunds within seven days if the key has not been used. stream@adorellc.pro.

Machine-readable: ${SITE}/openapi.json (x-payment-info), ${SITE}/.well-known/x402, ${SITE}/llms.txt
`;
  return text(body, 'text/markdown; charset=utf-8', 200, { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' });
}
