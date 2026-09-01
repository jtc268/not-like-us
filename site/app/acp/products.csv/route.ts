import { SITE, text } from '../../../lib/stream';

// OpenAI Agentic Commerce Protocol product feed, discovery only. ChatGPT
// checkout does not sell digital subscriptions, so is_eligible_checkout stays
// false and the url is where a person buys.
export async function GET() {
  const rows = [
    ['item_id', 'title', 'description', 'brand', 'url', 'image_url', 'price', 'availability', 'is_eligible_search', 'is_eligible_checkout', 'is_digital', 'seller_tos', 'seller_privacy_policy'],
    [
      'not-like-us-stream-monthly',
      'Not Like Us Stream (monthly)',
      'Live rules feed that keeps AI writing and interface work off recognizable defaults. Agents pull the current rules automatically. One key, every machine.',
      'Not Like Us',
      `${SITE}/stream`,
      `${SITE}/not-like-us-banner.png`,
      '4.99 USD',
      'in_stock',
      'true',
      'false',
      'true',
      `${SITE}/stream#terms`,
      `${SITE}/stream#terms`,
    ],
    [
      'not-like-us-stream-pass-30',
      'Not Like Us Stream 30-day pass',
      'Thirty days of the live rules feed for one payment, no renewal. Also purchasable by agents in USDC over x402.',
      'Not Like Us',
      `${SITE}/stream`,
      `${SITE}/not-like-us-banner.png`,
      '4.99 USD',
      'in_stock',
      'true',
      'false',
      'true',
      `${SITE}/stream#terms`,
      `${SITE}/stream#terms`,
    ],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
  return text(csv, 'text/csv; charset=utf-8', 200, { 'cache-control': 'public, max-age=3600' });
}
