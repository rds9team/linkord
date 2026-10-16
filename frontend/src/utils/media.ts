const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Resolves media URLs (images, videos, audio).
 * Handles relative paths such as `/uploads/xxx` by prepending the API base URL
 * when hosted across different origins (e.g., Cloudflare Pages -> API subdomain).
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Fully qualified URL or data/blob URI
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Relative /uploads/ or other relative static paths
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    
    // 1. Explicit environment variable
    if (API_BASE_URL) {
      const baseClean = API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');
      return `${baseClean}${cleanPath}`;
    }

    // 2. Production fallback: return cleanPath directly so it routes via same-origin proxy (/uploads/...)
    return cleanPath;
  }

  return trimmed;
}

/**
 * Builds Discord CDN banner URL from user ID and banner hash.
 */
export function getDiscordBannerUrl(userId?: string | null, bannerHash?: string | null): string | undefined {
  if (!userId || !bannerHash) return undefined;
  const isAnimated = bannerHash.startsWith('a_');
  const ext = isAnimated ? 'gif' : 'png';
  return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${ext}?size=1024`;
}
