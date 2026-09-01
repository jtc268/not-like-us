import { feed, json, snapshotRuleCount, snapshotVersion, errorResponse, PRICE_LABEL, SITE } from '../../../lib/stream';

export async function GET() {
  try {
    const current = await feed();
    return json(
      {
        product: current.product,
        price: PRICE_LABEL,
        subscribe: `${SITE}/stream`,
        stream: {
          version: current.version,
          updated_at: current.updated_at,
          rule_count: current.rule_count,
          source: current.source,
        },
        snapshot: {
          version: snapshotVersion,
          rule_count: snapshotRuleCount,
          repository: 'https://github.com/jtc268/not-like-us',
        },
      },
      200,
      { 'cache-control': 'public, max-age=60' },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
