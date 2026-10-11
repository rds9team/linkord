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

  // 検索エンジンおよびSNSクローラーの総合検知 (Googlebot, Bingbot, Twitter, Discord, etc.)
  const isCrawler = /Discordbot|Twitterbot|facebookexternalhit|Slackbot|TelegramBot|LinkedInBot|Embedly|WhatsApp|Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|Slurp|Applebot/i.test(userAgent);

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
    const reserved = ['discover', 'server', 'settings', 'login', 'terms', 'privacy', 'admin', 'api', 'favicon.ico', 'sitemap.xml', 'robots.txt'];
    if (!reserved.includes(username.toLowerCase())) {
      try {
        const res = await fetch(`${apiUrl}/api/profile/${username}`);
        if (res.ok) {
          const profile: any = await res.json();
          const displayName = profile.display_name || profile.username;
          const title = `${displayName} (@${profile.username}) | Discord プロフィール - Linkord`;
          const desc = profile.bio
            ? `${profile.bio.slice(0, 150)}${profile.bio.length > 150 ? '...' : ''}`
            : `${displayName} さんの Linkord プロフィール。Discordステータス、Spotify再生、Minecraft戦績、所属コミュニティを一覧表示。`;
          const avatarImg = profile.avatar_url || 'https://linkord.net/logo.svg';
          const bannerImg = profile.background_url || null;
          const ogImg = bannerImg || avatarImg;
          const twitterCard = bannerImg ? 'summary_large_image' : 'summary';
          const canonicalUrl = `https://linkord.net/@${profile.username}`;

          // Google 検索用 JSON-LD 構造化データ
          const jsonLd = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": displayName,
            "alternateName": `@${profile.username}`,
            "description": desc,
            "image": avatarImg,
            "url": canonicalUrl,
          });

          const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${escapeHtml(ogImg)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Linkord">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="${twitterCard}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(ogImg)}">
  <meta name="theme-color" content="#9333ea">
  <script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body style="font-family: sans-serif; background: #08090d; color: #f1f5f9; padding: 20px;">
  <article>
    <h1>${escapeHtml(displayName)} (@${escapeHtml(profile.username)})</h1>
    <p>${escapeHtml(desc)}</p>
    <p>閲覧数: ${profile.views_count || 0} | フォロワー: ${profile.followers_count || 0}</p>
    <a href="${escapeHtml(canonicalUrl)}">Linkordでプロフィールを見る</a>
  </article>
</body>
</html>`;
          return new Response(html, {
            headers: {
              'content-type': 'text/html; charset=utf-8',
              'x-robots-tag': 'index, follow',
            },
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
        const title = `${server.name} | Discord サーバー募集 - Linkord`;
        const desc = server.description
          ? `${server.description.slice(0, 150)}${server.description.length > 150 ? '...' : ''}`
          : `${server.name} の公式Discordコミュニティ情報、メンバー募集、招待リンクをチェック。`;
        const img = server.icon_url || 'https://linkord.net/logo.svg';
        const canonicalUrl = `https://linkord.net/server/${server.slug}`;

        const jsonLd = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "OnlineCommunity",
          "name": server.name,
          "description": desc,
          "image": img,
          "url": canonicalUrl,
        });

        const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${escapeHtml(img)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Linkord">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(img)}">
  <meta name="theme-color" content="#5865f2">
  <script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body style="font-family: sans-serif; background: #08090d; color: #f1f5f9; padding: 20px;">
  <article>
    <h1>${escapeHtml(server.name)}</h1>
    <p>${escapeHtml(desc)}</p>
    <p>メンバー数: ${server.member_count || 0}名</p>
    <a href="${escapeHtml(canonicalUrl)}">Linkordでコミュニティを見る</a>
  </article>
</body>
</html>`;
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-robots-tag': 'index, follow',
          },
        });
      }
    } catch (e) {
      // Fallback
    }
  }

  // 3. Fallback to default SPA handling
  const res = await next();
  if (res.status === 404 && request.method === 'GET') {
    const u = new URL(request.url);
    if (!u.pathname.startsWith('/api') && !u.pathname.includes('.')) {
      return env.ASSETS ? env.ASSETS.fetch(new Request(new URL('/', request.url), request)) : res;
    }
  }
  return res;
}
