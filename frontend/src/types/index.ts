export interface SocialLink {
  id: number;
  title: string;
  url: string;
  icon: string;
}

export interface ProfileData {
  username: string;
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
  is_public: boolean;
  created_at: string;
}
