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
  music_url?: string;
  video_url?: string;
  has_discord_authed: boolean;
  has_discord_token?: boolean;
  needs_discord_reauth?: boolean;
  has_supporter: boolean;
  has_team: boolean;
  has_founder: boolean;
  hide_badges: boolean;
  hide_followers?: boolean;
  discord_id?: string;
  minecraft_uuid?: string;
  analytics_id?: string;
  games?: string;
  active_hours?: string;
  play_style?: string;
  views_count: number;
  boosts_count?: number;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  username_changed_at?: string;
  links: SocialLink[];
  created_at: string;
}

export interface ServerData {
  id: number;
  slug: string;
  name: string;
  guild_id?: string;
  description?: string;
  icon_url?: string;
  invite_url: string;
  tags: string;
  language: string;
  member_count: number;
  boosts_count?: number;
  is_public: boolean;
  owner_id?: number;
  created_at: string;
}

export interface ServerCreateData {
  slug: string;
  name: string;
  guild_id?: string;
  description?: string;
  icon_url?: string;
  invite_url: string;
  tags?: string;
  language?: string;
}

export interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  bio?: string;
  theme_id?: string;
  theme_mode?: 'dark' | 'light';
  is_public?: boolean;
  avatar_url?: string;
  background_url?: string;
  music_url?: string;
  video_url?: string;
  minecraft_uuid?: string;
  analytics_id?: string;
  games?: string;
  active_hours?: string;
  play_style?: string;
  hide_badges?: boolean;
  hide_followers?: boolean;
  links?: Array<{ title: string; url: string; icon: string }>;
}

export interface VoiceRecruitmentItem {
  id: number;
  server_id: number;
  server_name: string;
  server_slug: string;
  server_icon_url?: string;
  server_invite_url: string;
  user_id: number;
  user_display_name: string;
  user_avatar_url?: string;
  title: string;
  game_tag?: string;
  target_count: number;
  voice_channel_url?: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export interface VoiceRecruitmentCreateData {
  server_id: number;
  title: string;
  game_tag?: string;
  target_count?: number;
  voice_channel_url?: string;
  duration_hours?: number;
}

export interface ServerAllianceItem {
  id: number;
  partner_server_id: number;
  partner_server_name: string;
  partner_server_slug: string;
  partner_server_icon_url?: string;
  partner_server_member_count: number;
  partner_server_invite_url: string;
  status: string;
  created_at: string;
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

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'update' | 'warning' | 'event' | string;
  link_url?: string | null;
  is_active: boolean;
  created_at: string;
}

