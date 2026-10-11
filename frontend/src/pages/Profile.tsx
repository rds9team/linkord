import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MessageSquare, Github, Twitter, Code, Music, Eye, Flame, Flag, Heart,
  Loader2, UserX, ExternalLink, Globe, Youtube, Twitch, Send, UserPlus, UserCheck, Users,
  Volume2, VolumeX, Play, Pause
} from 'lucide-react';
import { Badges } from '../components/Badges';
import { ReportModal } from '../components/ReportModal';
import { FollowListModal } from '../components/FollowListModal';
import { SpotifyWidget, ActivityWidget, CustomStatusBubble } from '../components/LanyardWidgets';
import { useLanyard } from '../hooks/useLanyard';
import { useTitle } from '../hooks/useTitle';
import { fetchProfile, boostProfile, toggleFollow, fetchMinecraftStats } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ProfileData } from '../types';

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

const getSocialIcon = (iconName: string) => {
  const icon = iconName.toLowerCase();
  switch (icon) {
    case 'discord':
      return <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
    case 'github':
      return <Github className="w-5 h-5 text-slate-700 dark:text-slate-200" />;
    case 'twitter':
    case 'x':
      return <Twitter className="w-5 h-5 text-sky-500 dark:text-sky-400" />;
    case 'qiita':
    case 'code':
      return <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    case 'youtube':
      return <Youtube className="w-5 h-5 text-rose-500" />;
    case 'twitch':
      return <Twitch className="w-5 h-5 text-purple-400" />;
    case 'telegram':
      return <Send className="w-5 h-5 text-sky-400" />;
    default:
      return <Globe className="w-5 h-5 text-slate-400" />;
  }
};

const isSafeHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
};

export const Profile: React.FC = () => {
  const { username: rawUsername = 'yuto' } = useParams<{ username: string }>();
  const username = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useTitle(
    notFound
      ? 'ユーザーが見つかりません'
      : isDeleted
      ? '退会済みアカウント'
      : profile?.display_name
      ? `${profile.display_name}`
      : 'プロフィール'
  );

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [boostCount, setBoostCount] = useState(0);
  const [hasBoosted, setHasBoosted] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Background Audio / Video State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Follow State
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');

  // Real-time WebSocket Lanyard Presence
  const { data: lanyardData } = useLanyard(profile?.discord_id);
  const [mcData, setMcData] = useState<any>(null);

  const customStatusActivity = lanyardData?.activities?.find(a => a.type === 4);
  const otherActivities = lanyardData?.activities?.filter(a => a.type !== 4) || [];

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
        setThemeMode(data.theme_mode === 'light' ? 'light' : 'dark');

        // Fetch PlayHive stats if minecraft_uuid exists
        if (data.minecraft_uuid) {
          fetchMinecraftStats(data.minecraft_uuid, 'bedwars')
            .then(res => {
              if (res && res.data) setMcData(res.data);
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

  const isLight = themeMode === 'light';
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
    <div className={`min-h-screen py-6 px-4 flex flex-col items-center justify-center transition-colors duration-300 relative overflow-hidden ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#08090d] text-slate-100'}`}>
      
      {/* Background Video Loop (if set) */}
      {profile.video_url && (
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <video
            src={profile.video_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
        </div>
      )}

      {/* Audio Player (if music_url is set) */}
      {profile.music_url && (
        <audio
          ref={audioRef}
          src={profile.music_url}
          loop
          onPlay={() => setIsPlayingAudio(true)}
          onPause={() => setIsPlayingAudio(false)}
        />
      )}

      {/* Ambient Glow Effects (Dark only) */}
      {!isLight && !profile.video_url && (
        <>
          <div className={`fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] ${themeAccent.glow} rounded-full blur-[140px] pointer-events-none`}></div>
          <div className="fixed bottom-1/4 left-1/3 -translate-x-1/2 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        </>
      )}

      {/* Profile Creator / Viewer Theme & Audio Switcher Bar */}
      <div className="w-full max-w-lg mb-3 flex items-center justify-between px-2 text-xs relative z-10">
        <span className="font-mono text-slate-400">linkord.net/@{profile.username}</span>
        
        <div className="flex items-center gap-2">
          {/* Audio Play/Pause Button */}
          {profile.music_url && (
            <button
              onClick={() => {
                if (audioRef.current) {
                  if (isPlayingAudio) {
                    audioRef.current.pause();
                  } else {
                    audioRef.current.play().catch(() => {});
                  }
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition cursor-pointer"
              title="BGMの再生/一時停止"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-3 h-3 text-purple-300" />
                  <span className="text-[10px] font-semibold">再生中</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-purple-300" />
                  <span className="text-[10px] font-semibold">BGM再生</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-1.5 p-1 rounded-full border border-slate-300 dark:border-white/10 bg-slate-200/80 dark:bg-white/5">
            <button
              onClick={() => setThemeMode('dark')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition ${!isLight ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:text-black'}`}
            >
              Dark
            </button>
            <button
              onClick={() => setThemeMode('light')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition ${isLight ? 'bg-white text-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              White
            </button>
          </div>
        </div>
      </div>

      {/* Main Guns.lol Style Profile Panel */}
      <main className={`w-full max-w-lg rounded-[28px] overflow-hidden relative z-10 transition duration-300 ${isLight ? 'glass-panel-light' : 'glass-panel-dark'} ${!isLight ? themeAccent.border : ''}`}>
        
        {/* Profile Cover / Background Banner */}
        {profile.background_url ? (
          <div className="w-full h-32 relative overflow-hidden bg-slate-900 border-b border-white/10">
            <img src={profile.background_url} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
        ) : null}

        <div className="p-6">
          {/* Top: Avatar & User Info */}
          <div className={`flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-5 ${profile.background_url ? '-mt-12' : ''}`}>
            <div className="relative group flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-white/20 shadow-xl bg-slate-800 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
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

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-xl font-extrabold tracking-tight truncate">{profile.display_name}</h1>
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
            </div>

            {/* Discord Custom Status Bubble (Lanyard) */}
            {customStatusActivity && (
              <div className="mb-2.5 flex justify-center sm:justify-start">
                <CustomStatusBubble activity={customStatusActivity} />
              </div>
            )}
            {profile.bio && (
              <p className="text-xs leading-relaxed max-w-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Social Links Grid */}
        {profile.links && profile.links.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {profile.links.map(link => {
              const safe = isSafeHttpUrl(link.url);
              return (
                <a
                  key={link.id}
                  href={safe ? link.url : '#'}
                  target={safe ? '_blank' : undefined}
                  rel={safe ? 'noopener noreferrer' : undefined}
                  className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}
                >
                  {getSocialIcon(link.icon || link.title)}
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                    {link.title}
                  </span>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
              <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Discord</span>
            </a>
            <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
              <Github className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">GitHub</span>
            </a>
            <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
              <Twitter className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">X</span>
            </a>
            <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
              <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qiita</span>
            </a>
          </div>
        )}

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
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 text-[10px] font-bold">
                  MC
                </div>
                <span className="text-xs font-bold">PlayHive - BedWars</span>
                <span className="text-[10px] font-mono text-slate-400">({profile.minecraft_uuid})</span>
              </div>
              {mcData?.prestige !== undefined && mcData?.prestige > 0 && (
                <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                  P{mcData.prestige}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Kills</span>
                <span className="font-mono text-xs font-bold">{(mcData?.kills ?? 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Victories</span>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{(mcData?.victories ?? 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Played</span>
                <span className="font-mono text-xs font-bold text-sky-500">{(mcData?.played ?? 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">K/D</span>
                <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">{mcData?.kd ?? '0.0'}</span>
              </div>
            </div>
            <div className="text-[9px] font-mono text-slate-400 text-right mt-1.5 flex items-center justify-between">
              <span className="text-[9px] text-slate-500">playhive.com/api (BedWars)</span>
              <span>10分キャッシュ</span>
            </div>
          </div>
        )}



        {/* Footer: Views, Boost, Report */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="累計アクセス数">
              <Eye className="w-3.5 h-3.5" />
              <span>{(profile.views_count || 1).toLocaleString()}</span>
            </span>
            <button
              onClick={() => {
                setFollowModalType('followers');
                setIsFollowModalOpen(true);
              }}
              className="flex items-center gap-1 hover:text-white transition cursor-pointer"
              title="フォロワー一覧を表示"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{followersCount.toLocaleString()}</span>
            </button>
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

      {/* Powered by Watermark */}
      <footer className="mt-4 text-center">
        <p className="text-[11px] text-slate-500">
          Powered by <span className="font-semibold text-slate-700 dark:text-slate-400">rds9team</span> &middot; Linkord
        </p>
      </footer>

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
    </div>
  );
};
