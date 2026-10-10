export interface SocialLink {
  id: number;
  title: string;
  url: string;
  icon: string;
}

export interface ProfileData {
  username: string;
  tag?: string;
  full_username?: string;
  display_name: string;
  bio?: string;
  theme_id: string;
  theme_mode: 'dark' | 'light';
  is_public: boolean;
  avatar_url?: string;
  background_url?: string;
  has_discord_authed: boolean;
  has_supporter: boolean;
  has_team: boolean;
  has_founder: boolean;
  hide_badges: boolean;
  discord_id?: string;
  minecraft_uuid?: string;
  analytics_id?: string;
  views_count: number;
  boosts_count?: number;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  links: SocialLink[];
  created_at: string;
}

export interface ServerData {
  id: number;
  slug: string;
  name: string;
  description?: string;
  icon_url?: string;
  invite_url: string;
  tags: string;
  language: string;
  member_count: number;
  boosts_count?: number;
  is_public: boolean;
  created_at: string;
}

export interface ServerCreateData {
  slug: string;
  name: string;
  description?: string;
  icon_url?: string;
  invite_url: string;
  tags?: string;
  language?: string;
}

export interface ProfileUpdateData {
  display_name?: string;
  bio?: string;
  theme_id?: string;
  theme_mode?: 'dark' | 'light';
  is_public?: boolean;
  avatar_url?: string;
  background_url?: string;
  minecraft_uuid?: string;
  analytics_id?: string;
  hide_badges?: boolean;
}

export interface ReportData {
  target_type: 'profile' | 'server' | 'media';
  target_id: string;
  reason: string;
  description?: string;
}

export interface AuthResponse {
  status: string;
  user?: {
    id: number;
    username: string;
    tag?: string;
    full_username?: string;
    display_name?: string;
  };
}

export interface FollowUser {
  username: string;
  tag?: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  has_discord_authed?: boolean;
  has_supporter?: boolean;
  has_team?: boolean;
  has_founder?: boolean;
}

export interface ProfileSearchResult extends FollowUser {
  views_count: number;
  followers_count: number;
}

export interface ReportItem {
  id: number;
  reporter_id?: number;
  target_type: string;
  target_id: string;
  reason: string;
  description?: string;
  status: string;
  admin_note?: string;
  created_at: string;
  resolved_at?: string;
}

export interface AdminStats {
  total_users: number;
  total_servers: number;
  total_reports: number;
  pending_reports: number;
  total_donations?: number;
  pending_donations?: number;
}

export interface DonationItem {
  id: number;
  account_id?: number | null;
  donor_name: string;
  paypay_url: string;
  passcode?: string | null;
  amount?: number | null;
  message?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  created_at: string;
  resolved_at?: string | null;
  donor_username?: string | null;
  donor_avatar?: string | null;
}

