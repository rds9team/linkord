export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;
  const apiUrl = (env?.API_URL || 'https://api.linkord.net').replace(/\/+$/, '');
  const url = new URL(request.url);

  // Construct target URL for uploaded static assets
  const targetUrl = `${apiUrl}${url.pathname}${url.search}`;

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('X-Forwarded-Host', url.host);

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
    });

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: upstreamRes.headers,
    });
  } catch (err: any) {
    return new Response('Not found', { status: 404 });
  }
}
