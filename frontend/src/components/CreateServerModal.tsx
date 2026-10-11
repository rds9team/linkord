import React, { useState, useEffect } from 'react';
import { X, Server as ServerIcon, Upload, Loader2, Sparkles, CheckCircle2, Users, Shield, Search, Crown, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createServer, uploadMedia, inspectDiscordInvite, fetchMyGuilds, DiscordGuildItem } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [inspectSuccess, setInspectSuccess] = useState(false);
  const [serverStats, setServerStats] = useState<{ member_count: number; presence_count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guilds from Discord OAuth2
  const [myGuilds, setMyGuilds] = useState<DiscordGuildItem[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [guildSearch, setGuildSearch] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && user) {
      setLoadingGuilds(true);
      fetchMyGuilds()
        .then((res) => {
          setConnected(res.connected);
          if (res.auth_url) setAuthUrl(res.auth_url);
          if (res.guilds && Array.isArray(res.guilds)) {
            setMyGuilds(res.guilds);
          } else {
            setMyGuilds([]);
          }
        })
        .catch(() => {
          setConnected(false);
          setMyGuilds([]);
        })
        .finally(() => {
          setLoadingGuilds(false);
        });
    }
  }, [isOpen, user]);

  const handleSelectGuild = (guild: DiscordGuildItem) => {
    setSelectedGuildId(guild.id);
    setName(guild.name);
    if (guild.icon_url) {
      setIconUrl(guild.icon_url);
    }
    const cleanSlug = guild.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    if (cleanSlug.length >= 3) {
      setSlug(cleanSlug);
    } else {
      setSlug(`server-${guild.id.slice(-6)}`);
    }
  };

  if (!isOpen) return null;

  const handleInspectInvite = async (inviteInput?: string) => {
    let targetInvite = (inviteInput !== undefined ? inviteInput : inviteUrl).trim();
    if (!targetInvite) return;
    targetInvite = targetInvite.split('?')[0].split('#')[0].replace(/\/+$/, '');

    try {
      setInspecting(true);
      setError(null);
      const res = await inspectDiscordInvite(targetInvite);

      // Auto-fill fields if empty or updated
      if (res.name && (!name || inspectSuccess)) {
        setName(res.name);
      }
      if (!slug || inspectSuccess) {
        // Auto-generate safe slug from guild name or code, with fallback for non-ASCII names
        const cleanedNameSlug = (res.name || '')
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 30);
        if (cleanedNameSlug.length >= 3) {
          setSlug(cleanedNameSlug);
        } else if (res.code && res.code.length >= 3) {
          setSlug(res.code.toLowerCase().slice(0, 30));
        } else {
          setSlug(`server-${Math.random().toString(36).substring(2, 8)}`);
        }
      }
      if (res.icon_url && (!iconUrl || inspectSuccess)) {
        setIconUrl(res.icon_url);
      }
      if (res.description && (!description || inspectSuccess)) {
        setDescription(res.description);
      }
      setInviteUrl(res.invite_url);
      setServerStats({
        member_count: res.member_count,
        presence_count: res.presence_count,
      });
      setInspectSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Discordサーバー情報の取得に失敗しました。招待URLを確認してください。');
      setInspectSuccess(false);
    } finally {
      setInspecting(false);
    }
  };

  const handleInviteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInviteUrl(val);
    setInspectSuccess(false);

    // Auto-inspect when a valid invite pattern is pasted
    const clean = val.trim();
    if (clean.includes('discord.gg/') || clean.includes('discord.com/invite/') || (clean.length >= 6 && !clean.includes(' '))) {
      handleInspectInvite(clean);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const res = await uploadMedia(file);
      setIconUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'アイコン画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('サーバーを掲載するにはログインが必要です');
      return;
    }

    if (!name.trim()) {
      setError('サーバー名を入力してください');
      return;
    }

    let finalInvite = inviteUrl.trim();
    if (!finalInvite) {
      setError('招待URLを入力してください');
      return;
    }
    if (!finalInvite.startsWith('http://') && !finalInvite.startsWith('https://')) {
      if (finalInvite.startsWith('discord.gg/') || finalInvite.startsWith('discord.com/')) {
        finalInvite = `https://${finalInvite}`;
      } else {
        finalInvite = `https://discord.gg/${finalInvite}`;
      }
    }

    if (!slug.match(/^[a-zA-Z0-9_-]{3,48}$/)) {
      setError('識別URL(slug)は3〜48文字の半角英数字・ハイフン・アンダースコアで入力してください');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const newServer = await createServer({
        slug: slug.trim(),
        name: name.trim(),
        guild_id: selectedGuildId || undefined,
        invite_url: finalInvite,
        icon_url: iconUrl.trim() || undefined,
        description: description.trim() || undefined,
        tags: tags.trim(),
        language: 'ja',
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
      navigate(`/server/${newServer.slug}`);
    } catch (err: any) {
      setError(err.message || 'サーバーの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-purple-400">
          <ServerIcon className="w-5 h-5" />
          <h2 className="text-base font-bold text-white">Discordサーバーを掲載</h2>
        </div>

        {!user ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-slate-300">
              サーバーを掲載するには、Linkordアカウントでログインしてください。
            </p>
            <button
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/30"
            >
              ログインページへ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Manageable Guilds Picker (Enhanced with Search and Badges) */}
            {loadingGuilds ? (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Discord所属サーバー一覧を取得中...</span>
              </div>
            ) : myGuilds.length > 0 ? (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Discordサーバー一覧から選択</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      {myGuilds.length}件
                    </span>
                  </span>

                  {myGuilds.length > 3 && (
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="サーバー名で検索..."
                        value={guildSearch}
                        onChange={(e) => setGuildSearch(e.target.value)}
                        className="pl-6 pr-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36"
                      />
                    </div>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {myGuilds
                    .filter((g) => !guildSearch.trim() || g.name.toLowerCase().includes(guildSearch.toLowerCase().trim()))
                    .map((g) => {
                      const isSelected = selectedGuildId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleSelectGuild(g)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition text-xs ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                              : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] text-slate-300 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {g.icon_url ? (
                              <img
                                src={g.icon_url}
                                alt=""
                                className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0 border border-white/10">
                                {g.name.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold truncate text-white">{g.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {g.owner ? (
                                  <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1 rounded flex items-center gap-0.5 font-semibold">
                                    <Crown className="w-2.5 h-2.5" />
                                    オーナー
                                  </span>
                                ) : g.can_manage ? (
                                  <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1 rounded flex items-center gap-0.5 font-semibold">
                                    <Shield className="w-2.5 h-2.5" />
                                    管理者
                                  </span>
                                ) : null}
                                {g.is_registered && (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded font-semibold">
                                    掲載中
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-lg shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>選択中</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 shrink-0">選択</span>
                          )}
                        </button>
                      );
                    })}
                </div>

                {selectedGuildId && (
                  <div className="text-[11px] text-indigo-300 bg-indigo-500/15 p-2.5 rounded-xl border border-indigo-500/30 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      サーバーを選択しました！Discordアプリでこのサーバーの「招待を作成」からリンクを取得し、下の招待URL欄に貼り付けてください。
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Discordサーバー連携</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed">
                  Discordと連携すると、所属しているサーバー一覧からワンクリックでサーバー情報を自動入力できます。
                </p>
                {authUrl && (
                  <a
                    href={authUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Discordと連携してサーバーを取得</span>
                  </a>
                )}
              </div>
            )}

            {/* Invite URL (Primary) */}
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <label className="block font-semibold text-purple-300 mb-1">
                Discord 招待URL <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={inviteUrl}
                  onChange={handleInviteChange}
                  onBlur={() => {
                    if (inviteUrl && !inspectSuccess) handleInspectInvite();
                  }}
                  placeholder="https://discord.gg/xxxxxx"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleInspectInvite()}
                  disabled={inspecting || !inviteUrl.trim()}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition whitespace-nowrap shadow-md shadow-purple-600/20"
                >
                  {inspecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>取得</span>
                </button>
              </div>

              {inspectSuccess && (
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Discord公式情報を自動取得しました</span>
                  </div>
                  {serverStats && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <span>{serverStats.member_count.toLocaleString()} 人</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Server Name */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                サーバー名 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: RDS9 Community"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                サーバーURLスラッグ (slug) <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-slate-400 focus-within:border-purple-500">
                <span className="text-[11px] select-none">linkord.net/server/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-community"
                  className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">3〜48文字の半角英数字、ハイフン、アンダースコア</p>
            </div>

            {/* Icon */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                アイコン画像（任意）
              </label>
              <div className="flex items-center gap-3">
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt="Server icon"
                    className="w-12 h-12 rounded-xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-xs font-bold">
                    Icon
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer border border-white/10 w-fit transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'アップロード中...' : '画像をアップロード'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="または画像URLを直接入力"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                サーバー説明（任意）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="サーバーの活動内容や特徴を紹介してください"
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                タグ（カンマ区切り、任意）
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Minecraft, 開発, PvP, コミュニティ"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting || uploading}
                className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? '登録中...' : 'サーバーを掲載する'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
