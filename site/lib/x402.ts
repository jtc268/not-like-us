// x402 v2: agents pay USDC for a 30-day Stream key without a human. The
// server never touches a private key. It publishes payment requirements,
// hands the signed authorization to a facilitator to verify and settle, and
// then issues the key. Spec: github.com/coinbase/x402, specs/x402-specification-v2.md

import { PRODUCT, SITE, StreamError } from './stream';

export const X402_VERSION = 2;
export const PASS_DAYS = 30;
export const PASS_AMOUNT = '4990000'; // USD 4.99 in USDC atomic units (6 decimals)
const DEFAULT_FACILITATOR = 'https://facilitator.payai.network';

// Native USDC contracts. The EIP-712 domain for USDC is name "USD Coin", version "2".
export const USDC: Record<string, { asset: string; label: string }> = {
  'eip155:8453': { asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', label: 'Base' },
  'eip155:137': { asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', label: 'Polygon' },
  'eip155:42161': { asset: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', label: 'Arbitrum One' },
};

export type Requirements = {
  scheme: 'exact';
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, string>;
};

export function payTo(): string | null {
  return process.env.NLU_X402_PAY_TO || null;
}

export function facilitator(): string {
  return (process.env.NLU_X402_FACILITATOR || DEFAULT_FACILITATOR).replace(/\/$/, '');
}

export function requirements(): Requirements[] {
  const to = payTo();
  if (!to) return [];
  return Object.entries(USDC).map(([network, usdc]) => ({
    scheme: 'exact',
    network,
    amount: PASS_AMOUNT,
    asset: usdc.asset,
    payTo: to,
    maxTimeoutSeconds: 300,
    extra: { name: 'USD Coin', version: '2' },
  }));
}

export const RESOURCE_URL = `${SITE}/v1/x402/pass`;

export function paymentRequired(error?: string) {
  return {
    x402Version: X402_VERSION,
    error: error ?? `Payment required: USD 4.99 in USDC buys a ${PASS_DAYS}-day Not Like Us Stream key.`,
    resource: {
      url: RESOURCE_URL,
      description: `${PASS_DAYS}-day key for the Not Like Us Stream, the live rules feed that keeps AI writing and interface work off recognizable defaults. The response is JSON with the key and its expiry. Use the key as Authorization: Bearer on ${SITE}/v1/feed.`,
      mimeType: 'application/json',
    },
    accepts: requirements(),
    extensions: {
      bazaar: {
        info: {
          input: { type: 'http', method: 'GET', queryParams: {} },
          output: { type: 'json', example: { key: 'nlu_...', until: '2026-10-01T00:00:00.000Z', days: PASS_DAYS, feed: `${SITE}/v1/feed` } },
        },
        schema: {
          output: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Bearer key for the Stream feed' },
              until: { type: 'string', format: 'date-time' },
              days: { type: 'integer' },
              feed: { type: 'string', format: 'uri' },
            },
          },
        },
      },
    },
  };
}

export function encode(value: unknown): string {
  return btoa(JSON.stringify(value));
}

export function decode(header: string): unknown {
  const normalized = header.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  return JSON.parse(atob(padded));
}

type PaymentPayload = {
  x402Version?: number;
  accepted?: { scheme?: string; network?: string };
  payload?: { authorization?: { from?: string } };
};

export function pickRequirement(payload: PaymentPayload): Requirements | null {
  const accepted = payload.accepted;
  if (!accepted) return null;
  return requirements().find((item) => item.network === accepted.network && item.scheme === (accepted.scheme ?? 'exact')) ?? null;
}

// A 4xx from the facilitator means the payment was rejected (bad signature,
// wrong amount, expired authorization) and is reported back to the payer as a
// fresh 402 with the reason. A 5xx is the facilitator being down.
async function facilitatorPost<T extends Verify | Settle>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${facilitator()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': `${PRODUCT}/1.0` },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (response.ok) return data;
  const reason = data.invalidReason ?? data.errorReason ?? data.error ?? data.message ?? `facilitator returned ${response.status}`;
  if (response.status < 500) return { isValid: false, success: false, invalidReason: reason, errorReason: reason } as T;
  throw new StreamError(502, `Facilitator ${path} returned ${response.status}: ${reason}`);
}

export type Verify = { isValid: boolean; invalidReason?: string; payer?: string };
export type Settle = { success: boolean; errorReason?: string; transaction?: string; network?: string; payer?: string };

export function verify(paymentPayload: unknown, paymentRequirements: Requirements): Promise<Verify> {
  return facilitatorPost<Verify>('/verify', { x402Version: X402_VERSION, paymentPayload, paymentRequirements });
}

export function settle(paymentPayload: unknown, paymentRequirements: Requirements): Promise<Settle> {
  return facilitatorPost<Settle>('/settle', { x402Version: X402_VERSION, paymentPayload, paymentRequirements });
}

export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'PAYMENT-SIGNATURE, X-PAYMENT, Content-Type, Authorization',
  'access-control-expose-headers': 'PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE',
};
