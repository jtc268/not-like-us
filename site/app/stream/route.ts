// The subscription page moved to /subscribe. Old links keep working.
export async function GET(request: Request) {
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/subscribe${url.search}${url.hash}`, 308);
}
