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

  // Discord CDN: Route through local API proxy to prevent i-FILTER blocks & optimize bandwidth
  if (trimmed.includes('cdn.discordapp.com') || trimmed.includes('media.discordapp.net')) {
    const baseClean = (API_BASE_URL || '').replace(/\/+$/, '');
    return `${baseClean}/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
  }

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
  const rawUrl = `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${ext}?size=1024`;
  return resolveMediaUrl(rawUrl);
}

/**
 * Normalizes Discord invite URLs to ensure direct universal linking (https://discord.gg/...)
 * Falls back to server join API proxy if inviteUrl is not available.
 */
export function formatDiscordInviteUrl(inviteUrl?: string | null, fallbackSlug?: string): string {
  if (!inviteUrl || !inviteUrl.trim()) {
    if (fallbackSlug) {
      const baseClean = (API_BASE_URL || '').replace(/\/+$/, '');
      return `${baseClean}/api/servers/${encodeURIComponent(fallbackSlug)}/join`;
    }
    return '#';
  }
  const clean = inviteUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://discord.gg/${clean}`;
}
