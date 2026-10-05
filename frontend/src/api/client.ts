import { ProfileData, ProfileUpdateData, ServerData, ReportData, AuthResponse } from '../types';

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

export const getGoogleLoginUrl = async (): Promise<string> => {
  const res = await request<{ url: string }>('/api/auth/google/login');
  return res.url;
};

export const devLogin = (): Promise<AuthResponse> => {
  return request<AuthResponse>('/api/auth/dev-login', {
    method: 'POST',
  });
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
