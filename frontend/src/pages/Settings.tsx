import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Palette, User, Gamepad2, Save, Check, Loader2, AlertCircle, LogIn, LogOut, Upload, Image as ImageIcon, Trash2, Radio, ExternalLink, Music, Film, Share2, Plus, X, Globe, MessageSquare, Github, Twitter, Code, Youtube, Twitch } from 'lucide-react';
import { fetchMe, updateMyProfile, uploadMedia, deleteAccount } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ProfileUpdateData } from '../types';
import { useTitle } from '../hooks/useTitle';
import { useTheme } from '../context/ThemeContext';
import { LogoutModal } from '../components/LogoutModal';
import { ConfirmModal } from '../components/ConfirmModal';

const PRESET_THEMES = [
  { id: 'midnight', name: 'Midnight (王道ダーク)' },
  { id: 'amoled', name: 'AMOLED (漆黒ミニマル)' },
  { id: 'cyber', name: 'Cyberpunk (ネオン)' },
  { id: 'sunset', name: 'Sunset (夕暮れ)' },
  { id: 'tokyo', name: 'Tokyo (ラベンダー)' },
  { id: 'emerald', name: 'Emerald (深緑)' },
  { id: 'sakura', name: 'Sakura (ローズ)' },
  { id: 'chrome', name: 'Y2K Chrome' },
  { id: 'crimson', name: 'Crimson (深紅)' },
  { id: 'glass', name: 'Glass (すりガラス)' },
  { id: 'pixel', name: 'Pixel (レトロ)' },
  { id: 'clean', name: 'Clean (クリーン)' },
];

const THEME_ACCENTS: Record<string, { glow: string; border: string; badge: string; sample: string }> = {
  midnight: { glow: 'from-purple-600/30 via-indigo-600/20 to-transparent', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', sample: '#8b5cf6' },
  amoled: { glow: 'from-white/10 via-zinc-800/20 to-transparent', border: 'border-white/20', badge: 'bg-white/10 text-white border-white/20', sample: '#ffffff' },
  cyber: { glow: 'from-cyan-500/30 via-blue-600/20 to-transparent', border: 'border-cyan-500/30', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', sample: '#06b6d4' },
  sunset: { glow: 'from-amber-500/30 via-orange-600/20 to-transparent', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', sample: '#f59e0b' },
  tokyo: { glow: 'from-fuchsia-500/30 via-pink-600/20 to-transparent', border: 'border-fuchsia-500/30', badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30', sample: '#d946ef' },
  emerald: { glow: 'from-emerald-500/30 via-teal-600/20 to-transparent', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', sample: '#10b981' },
  sakura: { glow: 'from-rose-400/30 via-pink-500/20 to-transparent', border: 'border-rose-400/30', badge: 'bg-rose-400/20 text-rose-300 border-rose-400/30', sample: '#fb7185' },
  chrome: { glow: 'from-slate-300/30 via-zinc-400/20 to-transparent', border: 'border-slate-300/30', badge: 'bg-slate-400/20 text-slate-200 border-slate-300/30', sample: '#cbd5e1' },
  crimson: { glow: 'from-red-600/30 via-rose-700/20 to-transparent', border: 'border-red-500/30', badge: 'bg-red-500/20 text-red-300 border-red-500/30', sample: '#ef4444' },
  glass: { glow: 'from-sky-400/30 via-cyan-500/20 to-transparent', border: 'border-sky-400/30', badge: 'bg-sky-400/20 text-sky-300 border-sky-400/30', sample: '#38bdf8' },
  pixel: { glow: 'from-green-500/30 via-emerald-600/20 to-transparent', border: 'border-green-500/30', badge: 'bg-green-500/20 text-green-300 border-green-500/30', sample: '#22c55e' },
  clean: { glow: 'from-slate-500/20 via-slate-600/10 to-transparent', border: 'border-slate-500/30', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30', sample: '#94a3b8' },
};

interface LinkItem {
  title: string;
  url: string;
  icon: string;
}

export const Settings: React.FC = () => {
  useTitle('設定');
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { refreshUser, user, logout } = useAuth();
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [themeId, setThemeId] = useState('midnight');
  const [hideBadges, setHideBadges] = useState(false);
  const [hideFollowers, setHideFollowers] = useState(false);
  const [minecraftId, setMinecraftId] = useState('');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setInitialLoading(true);
        const data = await fetchMe();
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
        setBackgroundUrl(data.background_url || '');
        setMusicUrl(data.music_url || '');
        setVideoUrl(data.video_url || '');
        setThemeMode(data.theme_mode === 'light' ? 'light' : 'dark');
        setThemeId(data.theme_id || 'midnight');
        setHideBadges(!!data.hide_badges);
        setHideFollowers(!!data.hide_followers);
        setMinecraftId(data.minecraft_uuid || '');
        if (data.links && Array.isArray(data.links)) {
          setLinks(data.links.map(l => ({ title: l.title, url: l.url, icon: l.icon || 'link' })));
        }
      } catch (err: any) {
        if (err.message && (err.message.includes('401') || err.message.includes('Not authenticated'))) {
          setNotLoggedIn(true);
        } else {
          setError(err.message || 'プロフィールの読み込みに失敗しました');
        }
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, []);

  const addPresetLink = (title: string, icon: string, defaultUrl: string = '') => {
    if (links.some(l => l.title.toLowerCase() === title.toLowerCase())) return;
    setLinks(prev => [...prev, { title, url: defaultUrl, icon }]);
  };

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: 'title' | 'url' | 'icon', value: string) => {
    setLinks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      setError(null);
      const res = await uploadMedia(file);
      setAvatarUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'アバターのアップロードに失敗しました');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBg(true);
      setError(null);
      const res = await uploadMedia(file);
      setBackgroundUrl(res.url);
    } catch (err: any) {
      setError(err.message || '背景画像のアップロードに失敗しました');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleMusicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMusic(true);
      setError(null);
      const res = await uploadMedia(file);
      setMusicUrl(res.url);
    } catch (err: any) {
      setError(err.message || '音楽ファイルのアップロードに失敗しました');
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingVideo(true);
      setError(null);
      const res = await uploadMedia(file);
      setVideoUrl(res.url);
    } catch (err: any) {
      setError(err.message || '背景動画のアップロードに失敗しました');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);

    try {
      const payload: ProfileUpdateData = {
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
        background_url: backgroundUrl,
        music_url: musicUrl,
        video_url: videoUrl,
        theme_id: themeId,
        theme_mode: themeMode,
        hide_badges: hideBadges,
        hide_followers: hideFollowers,
        minecraft_uuid: minecraftId,
        links: links.filter(l => l.title.trim() && l.url.trim()),
      };

      await updateMyProfile(payload);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutConfirm = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setIsLogoutOpen(false);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'ログアウトに失敗しました');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteAccount();
      await refreshUser();
      setIsDeleteOpen(false);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '退会処理に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="text-xs text-slate-400">プロフィール設定を読み込み中...</span>
      </div>
    );
  }

  if (notLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <LogIn className="w-10 h-10 text-purple-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">ログインが必要です</h2>
          <p className="text-xs text-slate-400 mb-6">
            プロフィール設定を編集するには、アカウントにログインしてください。
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
          >
            <span>ログインページへ</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          プロフィール設定
        </h1>
        <p className="text-xs text-slate-400">
          公開プロフィールの情報やデザインテーマを編集できます。
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Basic Info */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <User className="w-4 h-4 text-purple-400" />
            <span>基本情報</span>
          </div>

          {/* User ID & Tag */}
          {user && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-purple-300 font-semibold">ユーザーID（タグ）</p>
                <p className="text-xs font-mono text-white flex items-center gap-1 mt-0.5">
                  <span>@{user.username}</span>
                  {user.tag && <span className="text-purple-400 font-bold">#{user.tag}</span>}
                </p>
              </div>
              <Link
                to={`/@${user.username}`}
                className="text-[11px] text-purple-300 hover:text-white font-semibold underline underline-offset-2"
              >
                プロフィールを確認
              </Link>
            </div>
          )}

          {/* Avatar Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              アバター画像
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-slate-500" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition">
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>画像を選択 (最大10MB)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
                <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, WebP, GIFに対応しています</p>
              </div>
            </div>
          </div>

          {/* Background Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              背景画像
            </label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-14 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                {backgroundUrl ? (
                  <img src={backgroundUrl} alt="Background Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-500" />
                )}
                {uploadingBg && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition">
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>背景画像を選択</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleBgChange}
                    className="hidden"
                    disabled={uploadingBg}
                  />
                </label>
                {backgroundUrl && (
                  <button
                    type="button"
                    onClick={() => setBackgroundUrl('')}
                    className="ml-2 text-[11px] text-rose-400 hover:underline"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Background Video Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              背景動画（オプション）
            </label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-14 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                {videoUrl ? (
                  <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <Film className="w-6 h-6 text-slate-500" />
                )}
                {uploadingVideo && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>動画を選択 (MP4/WebM, 最大50MB)</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleVideoChange}
                    className="hidden"
                    disabled={uploadingVideo}
                  />
                </label>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="ml-2 text-[11px] text-rose-400 hover:underline"
                  >
                    削除
                  </button>
                )}
                <p className="text-[11px] text-slate-500 mt-1">プロフィール背景にシームレスにループ再生されます</p>
              </div>
            </div>
          </div>

          {/* Profile BGM Music Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              プロフィール BGM（音楽）
            </label>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                <Music className={`w-5 h-5 ${musicUrl ? 'text-purple-400' : 'text-slate-500'}`} />
                {uploadingMusic && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition">
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>音声を選択 (MP3, WAV, OGG, M4A, FLAC等, 最大50MB)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleMusicChange}
                    className="hidden"
                    disabled={uploadingMusic}
                  />
                </label>
                {musicUrl && (
                  <button
                    type="button"
                    onClick={() => setMusicUrl('')}
                    className="ml-2 text-[11px] text-rose-400 hover:underline"
                  >
                    削除
                  </button>
                )}
                <p className="text-[11px] text-slate-500 mt-1">プロフィール訪問時にBGMプレイヤーが表示されます</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              表示名
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              自己紹介 (Bio)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Theme Settings (User specified: Dark / White + Presets) */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Palette className="w-4 h-4 text-sky-400" />
            <span>テーマ設定</span>
          </div>

          {/* Theme Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              プリセットテーマ選択
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_THEMES.map(preset => {
                const accent = THEME_ACCENTS[preset.id] || THEME_ACCENTS.midnight;
                const isSelected = themeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setThemeId(preset.id)}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-medium transition flex items-center justify-between gap-1.5 ${isSelected ? 'bg-purple-600 border-purple-400 text-white shadow-md' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    <span className="truncate">{preset.name}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/30"
                      style={{ backgroundColor: accent.sample }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Theme Preview */}
          {(() => {
            const currentAccent = THEME_ACCENTS[themeId] || THEME_ACCENTS.midnight;
            const isLightPreview = isLight;
            return (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-300">リアルタイムプレビュー</span>
                  <span className="text-[10px] text-purple-400 font-mono">
                    {PRESET_THEMES.find(p => p.id === themeId)?.name}
                  </span>
                </div>
                <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${isLightPreview ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-[#0f1118] border-white/10 text-white'}`}>
                  {/* Background Accent Glow */}
                  {!isLightPreview && (
                    <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${currentAccent.glow} rounded-full blur-2xl pointer-events-none`}></div>
                  )}
                  {backgroundUrl && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none"
                      style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl border overflow-hidden flex items-center justify-center flex-shrink-0 ${isLightPreview ? 'bg-white border-slate-300' : 'bg-slate-800 border-white/10'}`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className={`w-6 h-6 ${isLightPreview ? 'text-slate-400' : 'text-slate-500'}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">
                          {displayName || (user ? user.display_name : '表示名')}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${currentAccent.badge}`}>
                          Supporter
                        </span>
                      </div>
                      <p className={`text-[10px] font-mono mt-0.5 ${isLightPreview ? 'text-slate-500' : 'text-slate-400'}`}>
                        @{user?.username || 'username'}
                      </p>
                      <p className={`text-[10px] mt-1 line-clamp-1 ${isLightPreview ? 'text-slate-600' : 'text-slate-300'}`}>
                        {bio || '自己紹介テキストのサンプルプレビューです。'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Badge Display Option */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-300">バッジを非表示にする</span>
            <input
              type="checkbox"
              checked={hideBadges}
              onChange={(e) => setHideBadges(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-white/10"
            />
          </div>

          {/* Followers Display Option */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-300">フォロワー数を非表示にする</span>
            <input
              type="checkbox"
              checked={hideFollowers}
              onChange={(e) => setHideFollowers(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-white/10"
            />
          </div>
        </div>

        {/* Social Links Integration */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Share2 className="w-4 h-4 text-sky-400" />
              <span>SNS & 外部リンク設定</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {links.length} / 8 件
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            プロフィールカードに配置するSNSや外部サイトのリンクを登録できます。
          </p>

          {/* Discord Quick Connect Assist */}
          {user?.discord_id && !links.some(l => l.title.toLowerCase() === 'discord') && (
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Discord 連携中</span>
                </p>
                <p className="text-[11px] text-slate-400 truncate font-mono">
                  https://discord.com/users/{user.discord_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addPresetLink('Discord', 'discord', `https://discord.com/users/${user.discord_id}`)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>追加</span>
              </button>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-2">
              プリセットから追加
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { title: 'Discord', icon: 'discord', defaultUrl: user?.discord_id ? `https://discord.com/users/${user.discord_id}` : 'https://discord.com/users/' },
                { title: 'GitHub', icon: 'github', defaultUrl: 'https://github.com/' },
                { title: 'X', icon: 'x', defaultUrl: 'https://x.com/' },
                { title: 'Qiita', icon: 'qiita', defaultUrl: 'https://qiita.com/' },
                { title: 'YouTube', icon: 'youtube', defaultUrl: 'https://youtube.com/@' },
                { title: 'Twitch', icon: 'twitch', defaultUrl: 'https://twitch.tv/' },
                { title: 'Website', icon: 'globe', defaultUrl: 'https://' },
              ].map(preset => {
                const isAdded = links.some(l => l.title.toLowerCase() === preset.title.toLowerCase());
                return (
                  <button
                    key={preset.title}
                    type="button"
                    disabled={isAdded || links.length >= 8}
                    onClick={() => addPresetLink(preset.title, preset.icon, preset.defaultUrl)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                      isAdded
                        ? 'opacity-40 border-white/5 bg-white/5 text-slate-500 cursor-not-allowed'
                        : 'border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:border-white/20 cursor-pointer'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{preset.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Registered Links List */}
          <div className="space-y-2 pt-2">
            {links.map((link, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="w-full sm:w-28 flex-shrink-0">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink(idx, 'title', e.target.value)}
                    placeholder="表示名"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(idx, 'url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div className="flex items-center justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    title="リンクを削除"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {links.length === 0 && (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-slate-500 text-xs">
                登録されたSNSリンクはありません。上のプリセットから追加してください。
              </div>
            )}
          </div>
        </div>

        {/* Minecraft PlayHive Integration */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <span>Minecraft PlayHive連携</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Minecraft ユーザー名 (Bedrock)
            </label>
            <input
              type="text"
              value={minecraftId}
              onChange={(e) => setMinecraftId(e.target.value)}
              placeholder="例: Plursche （PlayHive Bedrockゲーマータグ）"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Bedrock 版公式サーバー「The Hive (PlayHive)」公式APIと連携します。プロフィール画面で BedWars、The Bridge、SkyWars、Survival Games などの全ゲームモードの戦績が切り替えて表示されます。
            </p>
          </div>
        </div>

        {/* Discord Lanyard Presence Integration */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Radio className="w-4 h-4 text-purple-400" />
              <span>Discord リアルタイムステータス連携 (Lanyard)</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              WebSocket 完全同期
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Discord のオンライン状態・Spotify の再生中楽曲（動的プログレスバー付き）・プレイ中のゲームや VS Code の活動状況を、プロフィールに完全リアルタイムで自動表示できます。
          </p>

          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-purple-300">
                ステータスが表示されない場合
              </p>
              <p className="text-[11px] text-slate-400">
                Lanyard 公式 Discord サーバーに参加すると、ステータス同期が有効になります。
              </p>
            </div>
            <a
              href="https://discord.gg/lanyard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex-shrink-0"
            >
              <span>Lanyard Discord に参加</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>保存しました！</span>
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? '保存中...' : '設定を保存'}</span>
          </button>
        </div>

      </form>

      {/* Account Actions: Logout */}
      <div
        className={`mt-10 p-6 rounded-2xl border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 shadow-sm'
            : 'bg-white/[0.02] border-white/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <LogOut className="w-4 h-4 text-purple-500" />
              <span>ログアウト</span>
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              この端末からログアウトします。再度プロフィールの編集を行うにはログインが必要です。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0 self-start sm:self-auto cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div
        className={`mt-4 p-6 rounded-2xl border transition-colors ${
          isLight
            ? 'bg-rose-50 border-rose-200'
            : 'bg-rose-500/[0.04] border-rose-500/20'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
              <Trash2 className="w-4 h-4" />
              <span>アカウントの削除（退会）</span>
            </h3>
            <p className={`text-xs ${isLight ? 'text-rose-600/80' : 'text-slate-400'}`}>
              退会するとプロフィールは非公開・削除状態となり、元に戻すことはできません。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition flex-shrink-0 self-start sm:self-auto cursor-pointer shadow-lg shadow-rose-600/20"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>アカウントを削除</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {user && (
        <LogoutModal
          isOpen={isLogoutOpen}
          onClose={() => setIsLogoutOpen(false)}
          onConfirm={handleLogoutConfirm}
          isLoading={loggingOut}
          username={user.username}
          displayName={user.display_name}
          avatarUrl={user.avatar_url}
        />
      )}

      {/* Account Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={deleting}
        title="アカウントの完全削除"
        message={
          <>
            本当にアカウントを削除（退会）しますか？<br />
            この操作を実行すると、あなたのプロフィールは非公開・削除状態となり、元に戻すことはできません。
          </>
        }
        confirmText="退会する"
        cancelText="キャンセル"
        type="danger"
        userInfo={user ? {
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        } : undefined}
      />
    </div>
  );
};
