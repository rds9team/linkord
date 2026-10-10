function escapeHtml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function onRequest(context: any): Promise<Response> {
  const { request, next, env } = context;
  const userAgent = request.headers.get('user-agent') || '';

  // Check if crawler/bot requesting OGP
  const isCrawler = /Discordbot|Twitterbot|facebookexternalhit|Slackbot|TelegramBot|LinkedInBot|Embedly|WhatsApp/i.test(userAgent);

  if (!isCrawler) {
    const res = await next();
    if (res.status === 404 && request.method === 'GET') {
      const u = new URL(request.url);
      if (!u.pathname.startsWith('/api') && !u.pathname.includes('.')) {
        return env.ASSETS ? env.ASSETS.fetch(new Request(new URL('/', request.url), request)) : res;
      }
    }
    return res;
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const apiUrl = env?.API_URL || 'https://api.linkord.net';

  // 1. Profile: /@username or /:username
  const profileMatch = path.match(/^\/@?([a-zA-Z0-9_-]+)$/);
  if (profileMatch) {
    const username = profileMatch[1];
    const reserved = ['discover', 'server', 'settings', 'login', 'terms', 'privacy', 'admin', 'api', 'favicon.ico'];
    if (!reserved.includes(username.toLowerCase())) {
      try {
        const res = await fetch(`${apiUrl}/api/profile/${username}`);
        if (res.ok) {
          const profile: any = await res.json();
          const title = `${profile.display_name} (@${profile.username}) - Linkord`;
          const desc = profile.bio || `${profile.display_name} さんの Linkord プロフィール。SNSやMinecraft戦績、Discordステータスをチェック。`;
          const img = profile.avatar_url || 'https://linkord.net/logo.png';

          const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${escapeHtml(img)}">
  <meta property="og:url" content="${escapeHtml(url.href)}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Linkord">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(img)}">
  <meta name="theme-color" content="#9333ea">
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(desc)}</p>
</body>
</html>`;
          return new Response(html, {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          });
        }
      } catch (e) {
        // Fallback to normal response
      }
    }
  }

  // 2. Server: /server/:slug
  const serverMatch = path.match(/^\/server\/([a-zA-Z0-9_-]+)$/);
  if (serverMatch) {
    const slug = serverMatch[1];
    try {
      const res = await fetch(`${apiUrl}/api/servers/${slug}`);
      if (res.ok) {
        const server: any = await res.json();
        const title = `${server.name} - Linkord`;
        const desc = server.description || `${server.name} のDiscordコミュニティ情報・招待リンクをチェック。`;
        const img = server.icon_url || 'https://linkord.net/logo.png';

        const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${escapeHtml(img)}">
  <meta property="og:url" content="${escapeHtml(url.href)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Linkord">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(img)}">
  <meta name="theme-color" content="#5865f2">
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(desc)}</p>
</body>
</html>`;
        return new Response(html, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }
    } catch (e) {
      // Fallback to normal response
    }
  }

  const res = await next();
  if (res.status === 404 && request.method === 'GET') {
    const u = new URL(request.url);
    if (!u.pathname.startsWith('/api') && !u.pathname.includes('.')) {
      return env.ASSETS ? env.ASSETS.fetch(new Request(new URL('/', request.url), request)) : res;
    }
  }
  return res;
}
