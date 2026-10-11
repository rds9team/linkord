export async function onRequest(context: any): Promise<Response> {
  const { env } = context;
  const apiUrl = env?.API_URL || 'https://api.linkord.net';

  try {
    const res = await fetch(`${apiUrl}/api/seo/sitemap.xml`);
    if (res.ok) {
      const xml = await res.text();
      return new Response(xml, {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': 'public, max-age=3600, s-maxage=7200',
        },
      });
    }
  } catch {
    // fallback to static asset
  }

  return context.env.ASSETS ? context.env.ASSETS.fetch(context.request) : context.next();
}
