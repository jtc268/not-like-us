export async function GET() {
  return Response.json({ status: 'ok', release: process.env.ADORE_RELEASE?.slice(0, 12) ?? 'local' });
}
