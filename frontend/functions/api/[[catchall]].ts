export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;
  const apiUrl = (env?.API_URL || 'https://api.linkord.net').replace(/\/+$/, '');
  const url = new URL(request.url);

  // Construct target URL keeping path and search params
  const targetUrl = `${apiUrl}${url.pathname}${url.search}`;

  // Clone headers and set forwarding headers
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('X-Forwarded-Host', url.host);
  forwardHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  const fetchInit: RequestInit = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'manual',
  };

  // Attach body for requests that carry payloads
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchInit.body = request.body;
    // @ts-ignore Cloudflare Workers supports duplex for streaming
    fetchInit.duplex = 'half';
  }

  try {
    const upstreamRes = await fetch(targetUrl, fetchInit);

    // Return upstream response including status, headers and body
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: upstreamRes.headers,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        detail: 'バックエンドAPIサービスとの通信に失敗しました (502 Bad Gateway)',
        error: String(err?.message || err)
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
