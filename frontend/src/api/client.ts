import { ProfileData, ProfileUpdateData, ServerData, ServerCreateData, ReportData, FollowUser, ProfileSearchResult, ReportItem, AdminStats, DonationItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const fetchProfile = (username: string): Promise<ProfileData> => {
  return request<ProfileData>(`/api/profile/${encodeURIComponent(username)}`);
};

export const fetchMe = (): Promise<ProfileData> => {
  return request<ProfileData>('/api/profile/me');
};

export const updateMyProfile = (data: ProfileUpdateData): Promise<ProfileData> => {
  return request<ProfileData>('/api/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const getDiscordLoginUrl = async (): Promise<string> => {
  const res = await request<{ url: string }>('/api/auth/discord/login');
  return res.url;
};

export const logout = (): Promise<{ status: string }> => {
  return request<{ status: string }>('/api/auth/logout', {
    method: 'POST',
  });
};

export const fetchServers = (category?: string, search?: string): Promise<ServerData[]> => {
  return request<ServerData[]>('/api/servers', {
    params: {
      tag: category,
      search: search,
    },
  });
};

export const fetchServer = (slug: string): Promise<ServerData> => {
  return request<ServerData>(`/api/servers/${encodeURIComponent(slug)}`);
};

export const createServer = (data: ServerCreateData): Promise<ServerData> => {
  return request<ServerData>('/api/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const inspectDiscordInvite = (invite: string): Promise<{
  code: string;
  invite_url: string;
  guild_id?: string;
  name?: string;
  description?: string;
  icon_url?: string;
  member_count: number;
  presence_count: number;
}> => {
  return request(`/api/servers/inspect-invite`, {
    params: { invite },
  });
};

export const syncServerDiscordStats = (slug: string): Promise<{ status: string; member_count: number; icon_url?: string; message: string }> => {
  return request<{ status: string; member_count: number; icon_url?: string; message: string }>(`/api/servers/${encodeURIComponent(slug)}/sync`, {
    method: 'POST',
  });
};

export const deleteServer = (slug: string): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>(`/api/servers/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
};

export const toggleFollow = (username: string): Promise<{ status: string; is_following: boolean; followers_count: number; message: string }> => {
  return request<{ status: string; is_following: boolean; followers_count: number; message: string }>(`/api/profile/${encodeURIComponent(username)}/follow`, {
    method: 'POST',
  });
};

export const boostServer = (slug: string): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>(`/api/servers/${encodeURIComponent(slug)}/boost`, {
    method: 'POST',
  });
};

export const boostProfile = (username: string): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>(`/api/profile/${encodeURIComponent(username)}/boost`, {
    method: 'POST',
  });
};

export const createReport = (data: ReportData): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const uploadMedia = async (file: File): Promise<{ url: string; filename: string; size: number }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/media/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail || '画像のアップロードに失敗しました');
  }

  return response.json();
};

export const fetchLanyardPresence = async (discordId: string): Promise<any> => {
  return request<any>(`/api/lanyard/${encodeURIComponent(discordId)}`);
};

export const fetchMinecraftStats = async (uuid: string, gamemode: string = 'bedwars'): Promise<any> => {
  return request<any>(`/api/minecraft/${encodeURIComponent(uuid)}/${encodeURIComponent(gamemode)}`);
};

export const fetchFollowers = (username: string): Promise<FollowUser[]> => {
  return request<FollowUser[]>(`/api/profile/${encodeURIComponent(username)}/followers`);
};

export const fetchFollowing = (username: string): Promise<FollowUser[]> => {
  return request<FollowUser[]>(`/api/profile/${encodeURIComponent(username)}/following`);
};

export const searchProfiles = (query?: string): Promise<ProfileSearchResult[]> => {
  return request<ProfileSearchResult[]>('/api/profile/search', {
    params: { q: query },
  });
};

export const checkAdminAccess = (): Promise<{ status: string; is_admin: boolean; username: string }> => {
  return request<{ status: string; is_admin: boolean; username: string }>('/api/admin/check');
};

export const fetchAdminStats = (): Promise<AdminStats> => {
  return request<AdminStats>('/api/admin/stats');
};

export const fetchAdminReports = (status?: string): Promise<ReportItem[]> => {
  return request<ReportItem[]>('/api/admin/reports', {
    params: { status },
  });
};

export const updateAdminReport = (id: number, data: { status?: string; admin_note?: string }): Promise<ReportItem> => {
  return request<ReportItem>(`/api/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const toggleProfileVisibility = (username: string): Promise<any> => {
  return request<any>(`/api/admin/profiles/${encodeURIComponent(username)}/visibility`, {
    method: 'PATCH',
  });
};

export const toggleServerVisibility = (slug: string): Promise<any> => {
  return request<any>(`/api/admin/servers/${encodeURIComponent(slug)}/visibility`, {
    method: 'PATCH',
  });
};

export const deleteAccount = (): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>('/api/auth/delete-account', {
    method: 'POST',
  });
};

export const submitDonation = (data: {
  paypay_url: string;
  passcode?: string;
  amount?: number;
  message?: string;
}): Promise<DonationItem> => {
  return request<DonationItem>('/api/donations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const fetchAdminDonations = (status?: string): Promise<DonationItem[]> => {
  return request<DonationItem[]>('/api/admin/donations', {
    params: { status },
  });
};

export const resolveAdminDonation = (
  id: number,
  data: { action: 'approve' | 'reject'; admin_note?: string }
): Promise<DonationItem> => {
  return request<DonationItem>(`/api/admin/donations/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};


