import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Github, Twitter, Code, Music, Eye, Flame, Flag, Heart,
  Loader2, UserX, ExternalLink, Globe, Youtube, Twitch, Send, UserPlus, UserCheck, Users,
  Volume2, VolumeX, Play, Pause, Plus, ArrowLeft, Share2
} from 'lucide-react';
import { Badges } from '../components/Badges';
import { ReportModal } from '../components/ReportModal';
import { FollowListModal } from '../components/FollowListModal';
import { MusicPlayer } from '../components/MusicPlayer';
import { SpotifyWidget, ActivityWidget, CustomStatusBubble } from '../components/LanyardWidgets';
import { useLanyard } from '../hooks/useLanyard';
import { useTitle } from '../hooks/useTitle';
import { fetchProfile, boostProfile, toggleFollow, fetchMinecraftStats } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/media';
import { ProfileData } from '../types';

const PLAYHIVE_MODES = [
  { id: 'bed', name: 'BedWars', short: 'BED' },
  { id: 'bridge', name: 'The Bridge', short: 'BRIDGE' },
  { id: 'sky', name: 'SkyWars', short: 'SKY' },
  { id: 'sg', name: 'Survival Games', short: 'SG' },
  { id: 'murder', name: 'Murder Mystery', short: 'MURDER' },
  { id: 'dr', name: 'DeathRun', short: 'DR' },
  { id: 'drop', name: 'Block Drop', short: 'DROP' },
  { id: 'ground', name: 'Ground Wars', short: 'GROUND' },
  { id: 'ctf', name: 'Capture The Flag', short: 'CTF' },
  { id: 'wars', name: 'Treasure Wars', short: 'WARS' },
];

const THEME_ACCENTS: Record<string, { glow: string; border: string; badge: string }> = {
  midnight: { glow: 'bg-purple-600/15', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300' },
  amoled: { glow: 'bg-white/5', border: 'border-white/10', badge: 'bg-white/10 text-white' },
  cyber: { glow: 'bg-cyan-500/15', border: 'border-cyan-500/20', badge: 'bg-cyan-500/20 text-cyan-300' },
  sunset: { glow: 'bg-amber-600/15', border: 'border-amber-500/20', badge: 'bg-amber-500/20 text-amber-300' },
  tokyo: { glow: 'bg-fuchsia-600/15', border: 'border-fuchsia-500/20', badge: 'bg-fuchsia-500/20 text-fuchsia-300' },
  emerald: { glow: 'bg-emerald-600/15', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300' },
  sakura: { glow: 'bg-rose-500/15', border: 'border-rose-500/20', badge: 'bg-rose-500/20 text-rose-300' },
  chrome: { glow: 'bg-slate-400/15', border: 'border-slate-400/20', badge: 'bg-slate-400/20 text-slate-200' },
  crimson: { glow: 'bg-red-600/15', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-300' },
  glass: { glow: 'bg-sky-500/15', border: 'border-sky-500/20', badge: 'bg-sky-500/20 text-sky-300' },
  pixel: { glow: 'bg-green-600/15', border: 'border-green-500/20', badge: 'bg-green-500/20 text-green-300' },
  clean: { glow: 'bg-slate-500/10', border: 'border-slate-500/20', badge: 'bg-slate-500/20 text-slate-300' },
};

const normalizeLinkUrl = (url?: string): string | null => {
  if (!url) return null;
  let trimmed = url.trim();
  if (!trimmed || trimmed === '#') return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    // Prevent javascript: or data: dangerous pseudo-schemes
    if (/^[a-zA-Z0-9_-]+:/.test(trimmed)) {
      return null;
    }
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
};

const getSocialIcon = (iconName: string, url?: string) => {
  const icon = (iconName || '').toLowerCase();
  const lowerUrl = (url || '').toLowerCase();
  if (icon === 'discord' || lowerUrl.includes('discord.com') || lowerUrl.includes('discord.gg')) {
    return <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
  }
  if (icon === 'github' || lowerUrl.includes('github.com')) {
    return <Github className="w-5 h-5 text-slate-700 dark:text-slate-200" />;
  }
  if (icon === 'twitter' || icon === 'x' || lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) {
    return <Twitter className="w-5 h-5 text-sky-500 dark:text-sky-400" />;
  }
  if (icon === 'qiita' || lowerUrl.includes('qiita.com')) {
    return <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
  }
  if (icon === 'youtube' || lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return <Youtube className="w-5 h-5 text-rose-500" />;
  }
  if (icon === 'twitch' || lowerUrl.includes('twitch.tv')) {
    return <Twitch className="w-5 h-5 text-purple-400" />;
  }
  if (icon === 'telegram' || lowerUrl.includes('t.me')) {
    return <Send className="w-5 h-5 text-sky-400" />;
  }
  return <Globe className="w-5 h-5 text-slate-400" />;
};

const isSafeHttpUrl = (url?: string): boolean => {
  return normalizeLinkUrl(url) !== null;
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { username: rawUsername = 'yuto' } = useParams<{ username: string }>();
  const username = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState(false);

  const handleGoBack = () => {
    const prevPath = sessionStorage.getItem('linkord_prev_internal_path');
    if (prevPath && prevPath !== window.location.pathname + window.location.search) {
      navigate(-1);
    } else {
      navigate('/discover');
    }
  };

  useTitle(
    notFound
      ? 'ユーザーが見つかりません'
      : isDeleted
      ? '退会済みアカウント'
      : profile?.display_name
      ? `${profile.display_name}`
      : 'プロフィール'
  );

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [boostCount, setBoostCount] = useState(0);
  const [hasBoosted, setHasBoosted] = useState(false);

  // Background Audio / Video State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Follow State
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');

  // Real-time WebSocket Lanyard Presence
  const { data: lanyardData } = useLanyard(profile?.discord_id);
  const [mcData, setMcData] = useState<any>(null);
  const [mcGamemode, setMcGamemode] = useState('bed');
  const [mcLoading, setMcLoading] = useState(false);

  const handleSelectGamemode = (mode: string) => {
    if (!profile?.minecraft_uuid || mode === mcGamemode) return;
    setMcGamemode(mode);
    setMcLoading(true);
    fetchMinecraftStats(profile.minecraft_uuid, mode)
      .then(res => {
        if (res && res.data) {
          setMcData({
            ...res.data,
            has_stats: res.has_stats !== undefined ? res.has_stats : (res.data.has_stats ?? (Number(res.data.played || 0) > 0))
          });
        }
      })
      .catch(() => {})
      .finally(() => setMcLoading(false));
  };

  const customStatusActivity = lanyardData?.activities?.find(a => a.type === 4);
  const otherActivities = (lanyardData?.activities || []).filter(a => {
    // Exclude custom status (type 4)
    if (a.type === 4) return false;
    // Exclude Spotify (type 2, name "Spotify", or id starting with "spotify:") to prevent duplicate widgets
    if (a.type === 2 || a.name?.toLowerCase() === 'spotify' || a.id?.startsWith('spotify:')) return false;
    return true;
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        setIsDeleted(false);
        setError(null);
        const hashTag = window.location.hash ? window.location.hash.replace('#', '') : '';
        const identifier = hashTag && /^\d{4}$/.test(hashTag) ? `${username}#${hashTag}` : username;
        const data = await fetchProfile(identifier);
        setProfile(data);
        setBoostCount(data.boosts_count !== undefined ? data.boosts_count : 0);
        setFollowersCount(data.followers_count || 0);
        setIsFollowing(!!data.is_following);

        // Fetch PlayHive stats if minecraft_uuid exists
        if (data.minecraft_uuid) {
          fetchMinecraftStats(data.minecraft_uuid, 'bed')
            .then(res => {
              if (res && res.data) {
                setMcData({
                  ...res.data,
                  has_stats: res.has_stats !== undefined ? res.has_stats : (res.data.has_stats ?? (Number(res.data.played || 0) > 0))
                });
              }
            })
            .catch(() => {});
        }
      } catch (err: any) {
        if (err.message && (err.message.includes('410') || err.message.includes('退会済み'))) {
          setIsDeleted(true);
        } else if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
          setNotFound(true);
        } else {
          setError(err.message || 'プロフィールの読み込みに失敗しました');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  const handleBoost = async () => {
    if (hasBoosted || !profile) return;
    try {
      await boostProfile(profile.username);
      setBoostCount(prev => prev + 1);
      setHasBoosted(true);
    } catch (err: any) {
      // If already boosted or error, still set state
      setHasBoosted(true);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile || followLoading) return;
    if (!currentUser) {
      alert('ユーザーをフォローするにはログインが必要です');
      return;
    }
    try {
      setFollowLoading(true);
      const res = await toggleFollow(profile.username);
      setIsFollowing(res.is_following);
      setFollowersCount(res.followers_count);
    } catch (err: any) {
      alert(err.message || 'フォロー操作に失敗しました');
    } finally {
      setFollowLoading(false);
    }
  };

  const themeAccent = THEME_ACCENTS[profile?.theme_id || 'midnight'] || THEME_ACCENTS.midnight;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="text-xs text-slate-400">プロフィールを読み込み中...</span>
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-center">
          <UserX className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-white tracking-tight mb-2">
            退会済みのアカウントです
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            「@{username}」のプロフィールはユーザーによって削除されました。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/discover"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
            >
              他のユーザーを探す
            </Link>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition"
            >
              トップへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-center">
          <UserX className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-white tracking-tight mb-2">
            ユーザーが見つかりません
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            「@{username}」のプロフィールは存在しないか、非公開に設定されています。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/discover"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
            >
              他のユーザーを探す
            </Link>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition"
            >
              トップへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-6 px-4 flex flex-col items-center justify-center transition-colors duration-300 relative overflow-hidden ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#08090d] text-slate-100'} ${profile.music_url ? 'pb-24 sm:pb-28' : 'pb-8'}`}>
      
      {/* Background Video Loop (if set) */}
      {profile.video_url && (
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <video
            src={resolveMediaUrl(profile.video_url)}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
        </div>
      )}

      {/* Ambient Glow Effects (Dark only) */}
      {!isLight && !profile.video_url && (
        <>
          <div className={`fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] ${themeAccent.glow} rounded-full blur-[140px] pointer-events-none`}></div>
          <div className="fixed bottom-1/4 left-1/3 -translate-x-1/2 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        </>
      )}

      {/* Profile Header & Smart Back Navigation Bar */}
      <div className="w-full max-w-lg mb-3 flex items-center justify-between px-2 text-xs relative z-10 gap-2">
        <button
          type="button"
          onClick={handleGoBack}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition cursor-pointer flex-shrink-0 ${
            isLight
              ? 'bg-white/80 hover:bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
          }`}
          title="見つける・前の一覧に戻る"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">戻る</span>
        </button>

        <span className="font-mono text-slate-400 text-[11px] truncate text-center min-w-0">
          linkord.net/@{profile.username}
        </span>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Audio Status Pill Button */}
          {profile.music_url && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('linkord:toggle-bgm'));
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition cursor-pointer select-none active:scale-95 ${
                isPlayingAudio
                  ? 'border-purple-500/50 bg-purple-500/20 text-purple-200 shadow-sm shadow-purple-500/30'
                  : 'border-slate-300 dark:border-white/10 bg-slate-200/50 dark:bg-white/5 hover:bg-purple-500/10 text-slate-400 hover:text-purple-300'
              }`}
              title={isPlayingAudio ? 'BGMを停止' : 'BGMを再生'}
            >
              {isPlayingAudio ? (
                <Pause className="w-3 h-3 text-purple-400" />
              ) : (
                <Play className="w-3 h-3 text-purple-400 ml-0.5" />
              )}
              <span className="text-[10px] font-semibold">
                {isPlayingAudio ? 'BGM停止' : 'BGM再生'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Panel */}
      {(() => {
        const resolvedBanner = resolveMediaUrl(profile.background_url) || (
          lanyardData?.discord_user?.banner
            ? `https://cdn.discordapp.com/banners/${profile.discord_id || lanyardData.discord_user.id}/${lanyardData.discord_user.banner}.${lanyardData.discord_user.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024`
            : undefined
        );
        const hasBanner = Boolean(resolvedBanner && !bannerError);

        return (
          <main className={`w-full max-w-lg rounded-[28px] overflow-hidden relative z-10 transition duration-300 ${isLight ? 'glass-panel-light' : 'glass-panel-dark'} ${!isLight ? themeAccent.border : ''}`}>
            
            {/* Profile Cover / Background Banner */}
            {hasBanner ? (
              <div className="w-full h-36 sm:h-44 relative overflow-hidden bg-slate-900 border-b border-white/10">
                <img
                  src={resolvedBanner}
                  alt="Cover"
                  onError={() => setBannerError(true)}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              </div>
            ) : null}

            <div className={`px-6 pb-6 ${hasBanner ? 'pt-0' : 'pt-6'}`}>
              {/* Top: Avatar & User Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-5">
                <div className={`relative group flex-shrink-0 z-10 ${hasBanner ? '-mt-14 sm:-mt-16' : ''}`}>
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-white/20 shadow-2xl bg-slate-800 flex items-center justify-center ring-4 ring-[#08090d]/80">
                    {profile.avatar_url ? (
                      <img
                        src={resolveMediaUrl(profile.avatar_url)}
                        alt={profile.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Online Status Indicator based on Lanyard */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white dark:border-[#10121c] flex items-center justify-center ${
                      lanyardData?.discord_status === 'online'
                        ? 'bg-emerald-500'
                        : lanyardData?.discord_status === 'idle'
                        ? 'bg-amber-500'
                        : lanyardData?.discord_status === 'dnd'
                        ? 'bg-rose-500'
                        : 'bg-slate-500'
                    }`}
                    title={lanyardData?.discord_status ? `Discord: ${lanyardData.discord_status}` : 'オフライン'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0 pt-1 sm:pt-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate text-white">{profile.display_name}</h1>
                    {/* Badges in User's Requested Uniform Pill Style */}
                    {!profile.hide_badges && (
                      <Badges
                        hasDiscordAuthed={profile.has_discord_authed}
                        hasFounder={profile.has_founder}
                        hasTeam={profile.has_team}
                        hasSupporter={profile.has_supporter}
                      />
                    )}
                  </div>

            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2 flex-wrap">
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 flex items-center">
                <span>@{profile.username}</span>
                {profile.tag && <span className="text-purple-400 font-semibold opacity-90">#{profile.tag}</span>}
              </p>
              {!profile.hide_followers && (
                <>
                  <button
                    onClick={() => {
                      setFollowModalType('followers');
                      setIsFollowModalOpen(true);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full transition cursor-pointer"
                    title="フォロワー一覧を表示"
                  >
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="font-semibold text-slate-200">{followersCount}</span> フォロワー
                  </button>
                  <button
                    onClick={() => {
                      setFollowModalType('following');
                      setIsFollowModalOpen(true);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full transition cursor-pointer"
                    title="フォロー中一覧を表示"
                  >
                    <span className="font-semibold text-slate-200">{profile.following_count || 0}</span> フォロー中
                  </button>
                </>
              )}
              {currentUser?.username !== profile.username && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition flex items-center gap-1 shadow-sm ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-white/10 hover:border-rose-500/30'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>フォロー中</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" />
                      <span>フォロー</span>
                    </>
                  )}
                </button>
              )}

              {/* Share Profile to X (Twitter) */}
              <button
                onClick={() => {
                  const tweetText = `Linkordで ${profile.display_name} (@${profile.username}) のプロフィールをチェック！\n\n`;
                  const shareUrl = `https://linkord.net/@${profile.username}`;
                  const hashtags = `Linkord,プロフィール`;
                  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;
                  window.open(xUrl, '_blank', 'noopener,noreferrer');
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                title="X (Twitter) でこのプロフィールをシェア"
              >
                <Share2 className="w-3 h-3 text-sky-400" />
                <span>シェア</span>
              </button>
            </div>

            {/* Discord Custom Status Bubble (Lanyard) */}
            {customStatusActivity && (
              <div className="mb-2.5 flex justify-center sm:justify-start">
                <CustomStatusBubble activity={customStatusActivity} />
              </div>
            )}
            {profile.bio && (
              <p className="text-xs leading-relaxed max-w-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2">
                {profile.bio}
              </p>
            )}

            {/* Playstyle & Matchmaking Badges (Feature 7) */}
            {(profile.games || profile.active_hours || profile.play_style) && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                {profile.games && profile.games.split(',').map((g) => {
                  const clean = g.trim();
                  if (!clean) return null;
                  return (
                    <span key={clean} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-sky-300 flex items-center gap-1">
                      <span>🎮</span>
                      <span>{clean}</span>
                    </span>
                  );
                })}
                {profile.active_hours && (
                  <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-amber-300 flex items-center gap-1">
                    <span>⏰</span>
                    <span>{profile.active_hours}</span>
                  </span>
                )}
                {profile.play_style && (
                  <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-purple-300 flex items-center gap-1">
                    <span>🎧</span>
                    <span>{profile.play_style}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile BGM Widget (Interactive play/pause card) */}
        {profile.music_url && (
          <div
            onClick={() => {
              window.dispatchEvent(new CustomEvent('linkord:toggle-bgm'));
            }}
            className={`mb-4 p-3 rounded-2xl flex items-center justify-between gap-3 border transition cursor-pointer select-none group ${
              isPlayingAudio
                ? isLight
                  ? 'bg-purple-50 border-purple-300 shadow-md shadow-purple-200/50'
                  : 'bg-purple-950/30 border-purple-500/40 shadow-lg shadow-purple-900/20'
                : isLight
                  ? 'bg-white/60 hover:bg-white/90 border-slate-200'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-md flex-shrink-0 ${
                  isPlayingAudio
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-600/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white'
                }`}
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {profile.display_name || profile.username} のBGM
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    BGM
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {isPlayingAudio ? '再生中 (タップして停止)' : 'タップして再生'}
                </p>
              </div>
            </div>

            {isPlayingAudio && (
              <div className="flex items-end gap-0.5 h-4 px-2 flex-shrink-0">
                <span className="w-1 bg-purple-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-full" />
                <span className="w-1 bg-purple-500 rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.2s] h-3/4" />
                <span className="w-1 bg-purple-500 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.4s] h-1/2" />
              </div>
            )}
          </div>
        )}

        {/* Social Links Grid */}
        {(() => {
          let displayLinks = profile.links || [];
          if (displayLinks.length === 0 && profile.discord_id) {
            displayLinks = [
              {
                id: 0,
                title: 'Discord',
                url: `https://discord.com/users/${profile.discord_id}`,
                icon: 'discord',
              },
            ];
          }

          if (displayLinks.length > 0) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {displayLinks.map((link, idx) => {
                  const safeUrl = normalizeLinkUrl(link.url);
                  return (
                    <a
                      key={link.id || idx}
                      href={safeUrl || '#'}
                      target={safeUrl ? '_blank' : undefined}
                      rel={safeUrl ? 'noopener noreferrer' : undefined}
                      className={`rounded-xl p-2.5 flex items-center justify-center gap-2 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}
                    >
                      {getSocialIcon(link.icon || link.title, link.url)}
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[100px]">
                        {link.title}
                      </span>
                    </a>
                  );
                })}
              </div>
            );
          }

          if (currentUser?.username === profile.username) {
            return (
              <div className="mb-4 text-center">
                <Link
                  to="/settings"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    isLight ? 'border-dashed border-slate-300 text-slate-500 hover:text-slate-800' : 'border-dashed border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>SNSリンクを追加する</span>
                </Link>
              </div>
            );
          }

          return null;
        })()}

        {/* Spotify / Lanyard Presence Widget (Dynamic & WebSocket-synced) */}
        {lanyardData?.spotify && (
          <SpotifyWidget spotify={lanyardData.spotify} isLight={isLight} />
        )}

        {/* Discord Activities (Games, VS Code, Streaming etc.) */}
        {otherActivities.length > 0 && (
          <ActivityWidget activity={otherActivities[0]} isLight={isLight} />
        )}

        {/* Minecraft PlayHive Stats Card (if minecraft_uuid exists or mcData exists) */}
        {profile.minecraft_uuid && (
          <div className={`rounded-2xl p-3.5 mb-3 ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
                  <img
                    src={`https://mc-heads.net/avatar/${encodeURIComponent(profile.minecraft_uuid)}/28`}
                    alt="Skin"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-[10px] font-bold text-emerald-400 hidden">MC</span>
                </div>
                <span className="text-xs font-bold">
                  PlayHive ({mcData?.gamemode_name || PLAYHIVE_MODES.find(m => m.id === mcGamemode)?.name || 'Stats'})
                </span>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">({profile.minecraft_uuid})</span>
              </div>
              {mcData?.prestige !== undefined && mcData?.prestige > 0 && (
                <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                  P{mcData.prestige}
                </span>
              )}
            </div>

            {/* PlayHive Gamemode Selector Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2.5 scrollbar-thin">
              {PLAYHIVE_MODES.map(mode => {
                const isActive = mcGamemode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleSelectGamemode(mode.id)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isLight
                        ? 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {mode.name}
                  </button>
                );
              })}
            </div>

            {mcLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <span className="text-[10px] text-slate-400">戦績を読み込み中...</span>
              </div>
            ) : (!mcData?.has_stats && Number(mcData?.played || 0) === 0 && Number(mcData?.xp || 0) === 0) ? (
              <div className="py-4 px-3 rounded-xl bg-black/20 border border-white/5 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-300">戦績データを取得できませんでした</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  PlayHiveでのプレイ履歴がないか、または現在PlayHive APIが保護・メンテナンス中です。
                </p>
              </div>
            ) : (
              <>
                {/* Win Rate Banner with Progress Bar */}
                {(() => {
                  const played = Number(mcData?.played || 0);
                  const victories = Number(mcData?.victories || 0);
                  const losses = mcData?.losses !== undefined ? Number(mcData.losses) : Math.max(0, played - victories);
                  const winRate = mcData?.win_rate !== undefined
                    ? Number(mcData.win_rate)
                    : (played > 0 ? Number(((victories / played) * 100).toFixed(1)) : 0.0);

                  return (
                    <div className={`p-2.5 rounded-xl mb-2.5 ${isLight ? 'bg-slate-200/50' : 'bg-white/[0.03]'}`}>
                      <div className="flex items-center justify-between text-[11px] mb-1.5 font-semibold">
                        <span className="flex items-center gap-1.5 text-emerald-500">
                          <span>🏆 勝率</span>
                          <span className="font-mono font-extrabold text-xs">
                            {winRate.toFixed(1)}%
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {victories.toLocaleString()}勝 / {losses.toLocaleString()}敗 ({played.toLocaleString()}戦)
                        </span>
                      </div>
                      <div className="w-full bg-slate-300 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* 6-Grid Battle Stats */}
                <div className="grid grid-cols-3 gap-1.5 text-center mb-1">
                  <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                    <span className="block text-[9px] text-slate-500 dark:text-slate-400">K/D 比</span>
                    <span className="font-mono text-xs font-bold text-purple-500">
                      {mcData?.kd ?? '0.00'}
                    </span>
                  </div>
                  <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                    <span className="block text-[9px] text-slate-500 dark:text-slate-400">Kills / Deaths</span>
                    <span className="font-mono text-xs font-bold">
                      {(mcData?.kills ?? 0).toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">/ {(mcData?.deaths ?? 0).toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                    <span className="block text-[9px] text-slate-500 dark:text-slate-400 truncate">
                      {mcData?.special_label || 'Special'}
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-500">
                      {mcData?.special_value !== undefined ? mcData.special_value.toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                    <span className="block text-[9px] text-slate-500 dark:text-slate-400">Victories</span>
                    <span className="font-mono text-xs font-bold text-emerald-500">
                      {(mcData?.victories ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                    <span className="block text-[9px] text-slate-500 dark:text-slate-400">Played</span>
                    <span className="font-mono text-xs font-bold text-sky-500">
                      {(mcData?.played ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                    <span className="block text-[9px] text-slate-500 dark:text-slate-400">獲得 XP</span>
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {(mcData?.xp ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-slate-400 text-right mt-1.5 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500">api.playhive.com/v0</span>
                  <span>10分キャッシュ</span>
                </div>
              </>
            )}
          </div>
        )}



        {/* Footer: Views, Boost, Report */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="累計アクセス数">
              <Eye className="w-3.5 h-3.5" />
              <span>{(profile.views_count || 1).toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1" title="ブースト数">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-500 font-bold">{boostCount}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBoost}
              disabled={hasBoosted}
              className={`flex items-center gap-1 text-[11px] font-sans font-medium transition ${hasBoosted ? 'text-amber-500 font-bold' : 'hover:text-amber-500'}`}
              title="1ユーザー1時間に1回のみ"
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>{hasBoosted ? 'ブースト済み' : 'ブースト'}</span>
            </button>
            <span className="text-slate-400 dark:text-slate-700">|</span>
            <button
              onClick={() => setIsReportOpen(true)}
              className="hover:text-rose-500 transition flex items-center gap-1 text-[11px] font-sans font-medium"
            >
              <Flag className="w-3 h-3" />
              <span>通報</span>
            </button>
          </div>
        </div>

        </div>
      </main>
        );
      })()}

      {/* Powered by Watermark */}
      <footer className="mt-4 text-center">
        <p className="text-[11px] text-slate-500">
          Powered by <span className="font-semibold text-slate-700 dark:text-slate-400">rds9team</span> &middot; Linkord
        </p>
      </footer>

      {/* Spacer to prevent overlapping with floating music player */}
      {profile.music_url && (
        <div className="h-16 sm:h-20 pointer-events-none" aria-hidden="true" />
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="profile"
        targetId={profile.username}
      />

      {/* Follow List Modal */}
      <FollowListModal
        isOpen={isFollowModalOpen}
        onClose={() => setIsFollowModalOpen(false)}
        username={profile.username}
        type={followModalType}
      />

      {/* Rich BGM Player (User-controlled playback, no overlay, resolved URL) */}
      {profile.music_url && (
        <MusicPlayer
          musicUrl={resolveMediaUrl(profile.music_url) || profile.music_url}
          username={profile.username}
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          onPlayStateChange={(playing) => setIsPlayingAudio(playing)}
        />
      )}
    </div>
  );
};
