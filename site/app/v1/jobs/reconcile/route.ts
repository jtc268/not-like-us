import { errorResponse, json, reconcileRecentCheckouts } from '../../../../lib/stream';

export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secret = process.env.NLU_JOB_SECRET;
  const header = request.headers.get('authorization') ?? '';
  return Boolean(secret && header === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return json({ error: 'Not found.' }, 404);
  try {
    const result = await reconcileRecentCheckouts();
    if (result.failed) return json(result, 502);
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
