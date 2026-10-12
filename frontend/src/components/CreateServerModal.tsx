import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Server as ServerIcon, Upload, Loader2, Sparkles, CheckCircle2, Shield, Search, Crown, ExternalLink, Bot, Clipboard, AlertCircle } from 'lucide-react';
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
            // Filter only guilds where user is owner or has admin permissions
            const filtered = res.guilds.filter(g => g.owner || g.can_manage);
            setMyGuilds(filtered);
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

  const handleInspectInvite = async (inviteInput?: string) => {
    let targetInvite = (inviteInput !== undefined ? inviteInput : inviteUrl).trim();
    if (!targetInvite) return;
    targetInvite = targetInvite.split('?')[0].split('#')[0].replace(/\/+$/, '');

    try {
      setInspecting(true);
      setError(null);
      const res = await inspectDiscordInvite(targetInvite);

      if (res.name && (!name || inspectSuccess)) {
        setName(res.name);
      }
      if (!slug || inspectSuccess) {
        const cleanSlug = res.name
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 30);
        if (cleanSlug.length >= 3) {
          setSlug(cleanSlug);
        }
      }
      if (res.icon_url && (!iconUrl || inspectSuccess)) {
        setIconUrl(res.icon_url);
      }
      if (res.description && !description) {
        setDescription(res.description);
      }
      if (res.invite_url) {
        setInviteUrl(res.invite_url);
      }
      setServerStats({
        member_count: res.member_count,
        presence_count: res.presence_count,
      });
      setInspectSuccess(true);
    } catch (err: any) {
      setError(err.message || '招待リンクの取得に失敗しました。期限切れか無効なリンクの可能性があります');
      setInspectSuccess(false);
      setServerStats(null);
    } finally {
      setInspecting(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        setInviteUrl(clean);
        handleInspectInvite(clean);
      }
    } catch {
      setError('クリップボードの読み取り権限がありません。手動で貼り付けてください');
    }
  };

  const handleInviteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInviteUrl(val);
    if (inspectSuccess) {
      setInspectSuccess(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('アイコン画像は5MB以下にしてください');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const res = await uploadMedia(file);
      setIconUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'アイコンのアップロードに失敗しました');
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
      setError('Discord招待URLを入力してください');
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

  if (!isOpen) return null;

  // Official Linkord Bot (App ID: 1558818096524034058)
  const botInviteUrl = selectedGuildId
    ? `https://discord.com/api/oauth2/authorize?client_id=1558818096524034058&permissions=274877991936&scope=bot%20applications.commands&guild_id=${selectedGuildId}`
    : `https://discord.com/api/oauth2/authorize?client_id=1558818096524034058&permissions=274877991936&scope=bot%20applications.commands`;

  const filteredGuilds = myGuilds.filter(g =>
    g.name.toLowerCase().includes(guildSearch.toLowerCase())
  );

  // Use createPortal to mount directly on document.body to avoid stacking context issues with PageTransition / Navbar
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0f111a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0f111a] shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/20">
              <ServerIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Discordサーバーを掲載</h2>
              <p className="text-[10px] text-slate-400">公式Bot連携専用・オーナー/管理者のみ掲載可能</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs scrollbar-thin flex-1">
          {!user ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-slate-300">
                サーバーを掲載するには、Linkordアカウントでログインしてください。
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                ログインページへ
              </button>
            </div>
          ) : (
            <form id="create-server-form" onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Discord Guilds Picker (Owner / Admin Only) */}
              {loadingGuilds ? (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                  <span>管理権限のある所属サーバー一覧を取得中...</span>
                </div>
              ) : myGuilds.length > 0 ? (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      <span>掲載するサーバーを選択 (管理者のみ)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {myGuilds.length}件の管理サーバー
                    </span>
                  </div>

                  {myGuilds.length > 4 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="サーバー名で絞り込み..."
                        value={guildSearch}
                        onChange={(e) => setGuildSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {filteredGuilds.map((g) => {
                      const isSelected = selectedGuildId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleSelectGuild(g)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                              : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {g.icon_url ? (
                              <img src={g.icon_url} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {g.name.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-xs truncate">{g.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                {g.owner && (
                                  <span className="text-amber-400 flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" /> オーナー
                                  </span>
                                )}
                                {!g.owner && g.can_manage && (
                                  <span className="text-indigo-300">管理者</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 shrink-0 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> 選択中
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 hover:text-white shrink-0">
                              選択
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Discord管理サーバーが見つかりません</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    あなたがオーナーまたは管理者権限を持つDiscordサーバーのみLinkordに掲載可能です。
                  </p>
                  {authUrl && (
                    <a
                      href={authUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Discordと再連携してサーバーを取得</span>
                    </a>
                  )}
                </div>
              )}

              {/* Official Bot Invitation Card */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-2.5 text-indigo-300">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-300 border border-indigo-500/30">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">公式Bot連携（必須）</span>
                      <span className="text-[10px] text-indigo-300">安全な掲載と自動バンプに対応</span>
                    </div>
                  </div>
                  <a
                    href={botInviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition shadow-md shadow-[#5865F2]/30 cursor-pointer shrink-0"
                  >
                    <span>Botを追加する</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-4 leading-relaxed">
                  <li>不正な他人のサーバー掲載を防止するため、公式Botの導入が必須です。</li>
                  <li>Discord内で <code className="bg-black/40 px-1 py-0.5 rounded text-indigo-200">/up</code> を実行すると掲載順位をトップに押し上げ（バンプ）できます。</li>
                  <li>人数やアイコンが完全自動でリアルタイム同期されます。</li>
                </ul>
              </div>

              {/* Invite URL Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Discord 招待URL <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition cursor-pointer"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>クリップボードから貼付</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="https://discord.gg/xxxxxx または招待コード"
                    value={inviteUrl}
                    onChange={handleInviteChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => handleInspectInvite()}
                    disabled={inspecting || !inviteUrl.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                  >
                    {inspecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-400" />}
                    <span>解析</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  ※ サイト訪問者が参加するための招待リンクです（無期限推奨）。
                </p>
              </div>

              {/* Basic Fields: Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    サーバー表示名 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: RDS9 コミュニティ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    識別URL (slug) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs">/server/</span>
                    <input
                      type="text"
                      required
                      placeholder="rds9-community"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      className="w-full pl-[62px] pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">サーバー説明文</label>
                <textarea
                  rows={3}
                  placeholder="サーバーの活動内容やルール、歓迎するユーザーなどを紹介してください。"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs resize-none"
                />
              </div>

              {/* Tags & Icon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">タグ (カンマ区切り)</label>
                  <input
                    type="text"
                    placeholder="コミュニティ, ゲーム, 雑談"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">アイコン画像</label>
                    {iconUrl && (
                      <button
                        type="button"
                        onClick={() => setIconUrl('')}
                        className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline transition cursor-pointer"
                      >
                        アイコンを削除
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {iconUrl ? (
                      <img src={iconUrl} alt="Icon Preview" className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
                        <ServerIcon className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <label className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-[11px] text-center cursor-pointer transition">
                      {uploading ? 'アップロード中...' : '画像を変更'}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                </div>
              </div>

            </form>
          )}
        </div>

        {/* Fixed Footer (Always visible, never clipped) */}
        {user && (
          <div className="px-6 py-4 border-t border-white/10 bg-[#0f111a] flex items-center justify-end gap-2.5 shrink-0 z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs transition cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="create-server-form"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? '掲載中...' : 'サーバーを掲載する'}</span>
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
