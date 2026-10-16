import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Server as ServerIcon, Loader2, Sparkles, CheckCircle2, Shield, Search, 
  Crown, ExternalLink, Bot, AlertCircle, Info, ArrowLeft, ArrowRight, RefreshCw, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createServer, fetchMyGuilds, checkBotInstalled, inspectDiscordInvite, DiscordGuildItem, BotCheckResult } from '../api/client';
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

  // Wizard steps: 1 = サーバー選択, 2 = Bot導入・確認, 3 = 詳細情報入力(slug, 説明, タグ)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selected guild & bot info
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuildItem | null>(null);
  const [checkingBot, setCheckingBot] = useState(false);
  const [botCheckData, setBotCheckData] = useState<BotCheckResult | null>(null);

  // Form fields for step 3
  const [slug, setSlug] = useState('');
  const [customInvite, setCustomInvite] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [minecraftTags, setMinecraftTags] = useState<string[]>([]);
  const [showSlugTooltip, setShowSlugTooltip] = useState(false);

  // Status & errors
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guilds from Discord OAuth2
  const [myGuilds, setMyGuilds] = useState<DiscordGuildItem[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [guildSearch, setGuildSearch] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setLoadingGuilds(true);
      fetchMyGuilds()
        .then((res) => {
          if (res.auth_url) setAuthUrl(res.auth_url);
          if (res.guilds && Array.isArray(res.guilds)) {
            const filtered = res.guilds.filter(g => g.owner || g.can_manage);
            setMyGuilds(filtered);
          } else {
            setMyGuilds([]);
          }
        })
        .catch(() => {
          setMyGuilds([]);
        })
        .finally(() => {
          setLoadingGuilds(false);
        });
    }
  }, [isOpen, user]);

  // モーダルが閉じたときにステートをリセット
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedGuild(null);
      setBotCheckData(null);
      setSlug('');
      setDescription('');
      setTags('');
      setMinecraftTags([]);
      setError(null);
      setShowSlugTooltip(false);
    }
  }, [isOpen]);

  const handleSelectGuild = (guild: DiscordGuildItem) => {
    setSelectedGuild(guild);
    setError(null);
    const cleanSlug = guild.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    setSlug(cleanSlug.length >= 3 ? cleanSlug : `server-${guild.id.slice(-6)}`);
    setStep(2);

    // バックグラウンドで既にBotが入っているか一度事前チェック
    setCheckingBot(true);
    checkBotInstalled(guild.id)
      .then((res) => {
        if (res.installed) {
          setBotCheckData(res);
          if (res.invite_url) {
            setCustomInvite(res.invite_url);
            setInviteVerified(true);
          }
          // 既に導入済みの場合は自動でステップ3へ進む
          setStep(3);
        }
      })
      .catch(() => {})
      .finally(() => {
        setCheckingBot(false);
      });
  };

  const [inspectingInvite, setInspectingInvite] = useState(false);
  const [inviteVerified, setInviteVerified] = useState(false);

  const handleInspectCustomInvite = async (inviteInput: string) => {
    const trimmed = inviteInput.trim();
    if (!trimmed) {
      setInviteVerified(false);
      return;
    }
    try {
      setInspectingInvite(true);
      setError(null);
      const res = await inspectDiscordInvite(trimmed);
      setInviteVerified(true);
      setCustomInvite(res.invite_url);
      if (res.name) {
        setBotCheckData(prev => ({
          installed: prev?.installed || false,
          guild_id: res.guild_id || prev?.guild_id,
          name: res.name || prev?.name || '',
          icon_url: res.icon_url || prev?.icon_url,
          member_count: res.member_count || prev?.member_count || 0,
          invite_url: res.invite_url,
        }));
      }
    } catch (err: any) {
      setInviteVerified(false);
      setError(err.message || 'Discord招待リンクの検証に失敗しました。有効なリンクか確認してください。');
    } finally {
      setInspectingInvite(false);
    }
  };

  const handleVerifyBot = async () => {
    if (!selectedGuild) return;
    try {
      setCheckingBot(true);
      setError(null);
      const res = await checkBotInstalled(selectedGuild.id);
      if (res.installed) {
        setBotCheckData(res);
        if (res.invite_url) {
          setCustomInvite(res.invite_url);
          setInviteVerified(true);
        }
        setStep(3);
      } else {
        setError(res.message || 'Botの参加が確認できませんでした。サーバーにBotを追加してからもう一度お試しください。');
      }
    } catch (err: any) {
      setError(err.message || 'Bot導入の確認通信に失敗しました');
    } finally {
      setCheckingBot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedGuild) {
      setError('サーバーを掲載するにはログインとサーバーの選択が必要です');
      return;
    }

    if (!slug.match(/^[a-zA-Z0-9_-]{3,48}$/)) {
      setError('識別URL(slug)は3〜48文字の半角英数字・ハイフン・アンダースコアで入力してください');
      return;
    }

    const finalInvite = (customInvite.trim() || botCheckData?.invite_url || '').trim();
    if (finalInvite.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i) || finalInvite.includes('cdn.discordapp.com')) {
      setError('招待リンクに画像URLが指定されています。https://discord.gg/... 形式の招待リンクを入力してください。');
      return;
    }
    if (!finalInvite) {
      setError('サーバーの招待リンクを取得できませんでした。招待URLを入力するか、Botに「招待リンク作成」権限があることを確認してください。');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const newServer = await createServer({
        slug: slug.trim(),
        name: botCheckData?.name || selectedGuild.name,
        guild_id: selectedGuild.id,
        invite_url: finalInvite,
        icon_url: botCheckData?.icon_url || selectedGuild.icon_url || undefined,
        description: description.trim() || undefined,
        tags: tags.trim(),
        minecraft_tags: minecraftTags.length > 0 ? minecraftTags.join(',') : undefined,
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

  const botInviteUrl = selectedGuild
    ? `https://discord.com/api/oauth2/authorize?client_id=1558818096524034058&permissions=274877991936&scope=bot%20applications.commands&guild_id=${selectedGuild.id}`
    : `https://discord.com/api/oauth2/authorize?client_id=1558818096524034058&permissions=274877991936&scope=bot%20applications.commands`;

  const filteredGuilds = myGuilds.filter(g =>
    g.name.toLowerCase().includes(guildSearch.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0f111a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Fixed Header with Step Progress */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0f111a] shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/20">
              <ServerIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Discordサーバーを掲載</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Step {step}/3
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {step === 1 && '掲載したいサーバーを選択'}
                {step === 2 && '公式Botの導入確認'}
                {step === 3 && 'slug・説明文・タグの設定'}
              </p>
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

        {/* Scrollable Modal Content */}
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
            <>
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: サーバー選択 */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span>掲載するサーバーを選択</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      （管理者またはオーナーのみ）
                    </span>
                  </div>

                  {loadingGuilds ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-indigo-300">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs">管理サーバー一覧を取得中...</span>
                    </div>
                  ) : myGuilds.length > 0 ? (
                    <div className="space-y-2">
                      {myGuilds.length > 4 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="サーバー名で検索..."
                            value={guildSearch}
                            onChange={(e) => setGuildSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        {filteredGuilds.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => handleSelectGuild(g)}
                            className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-purple-500/40 text-left transition cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {g.icon_url ? (
                                <img src={g.icon_url} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0 ring-1 ring-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                                  {g.name.slice(0, 1)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-white truncate group-hover:text-purple-300 transition">
                                  {g.name}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  {g.owner ? (
                                    <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                                      <Crown className="w-2.5 h-2.5" /> オーナー
                                    </span>
                                  ) : (
                                    <span className="text-indigo-300 font-semibold">管理者</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 group-hover:bg-purple-500 group-hover:text-white px-3 py-1 rounded-xl transition shrink-0 flex items-center gap-1">
                              <span>選択</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2 text-center py-8">
                      <p className="font-bold text-xs">管理権限のあるDiscordサーバーが見つかりません</p>
                      <p className="text-[11px] text-slate-300">
                        あなたがオーナーまたは管理者権限を持つサーバーのみ掲載できます。
                      </p>
                      {authUrl && (
                        <div className="pt-2">
                          <a
                            href={authUrl}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Discordと再連携してサーバーを取得</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: 公式Botの導入と確認 */}
              {step === 2 && selectedGuild && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Selected Server Summary Card */}
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selectedGuild.icon_url ? (
                        <img src={selectedGuild.icon_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-white/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedGuild.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">{selectedGuild.name}</div>
                        <div className="text-[10px] text-slate-400">ID: {selectedGuild.id}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer shrink-0"
                    >
                      変更
                    </button>
                  </div>

                  {/* Bot Invitation Guide Card */}
                  <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-3 text-indigo-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">公式Bot (rds9up) を導入してください</h3>
                        <p className="text-[11px] text-slate-300">サーバーの安全な掲載と自動同期・/upに必要です</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                      Botを導入すると、招待リンクの自動取得やメンバー数・アイコンの自動同期が行われ、次のステップに進めます。
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <a
                        href={botInviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#5865F2]/30 cursor-pointer"
                      >
                        <span>Botをサーバーに追加する</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={handleVerifyBot}
                        disabled={checkingBot}
                        className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer"
                      >
                        {checkingBot ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>確認中...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>導入を確認する</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: サーバー情報入力 (説明・タグ・slugのみ！) */}
              {step === 3 && selectedGuild && (
                <form id="create-server-form" onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
                  
                  {/* Verified Server Auto-Info Banner */}
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-emerald-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {botCheckData?.icon_url || selectedGuild.icon_url ? (
                        <img 
                          src={botCheckData?.icon_url || selectedGuild.icon_url} 
                          alt="" 
                          className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-emerald-500/30" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {selectedGuild.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">
                          {botCheckData?.name || selectedGuild.name}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                          <span>メンバー数: {botCheckData?.member_count || '同期済'}名</span>
                          <span>•</span>
                          <span>Bot導入済み</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3" /> 認証完了
                    </span>
                  </div>

                  {/* Slug Input with Interactive Info Tooltip */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        識別URL (slug) <span className="text-rose-400">*</span>
                      </label>

                      {/* ◯の中に i のツールチップボタン */}
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setShowSlugTooltip(!showSlugTooltip)}
                          onMouseEnter={() => setShowSlugTooltip(true)}
                          onMouseLeave={() => setShowSlugTooltip(false)}
                          className="text-slate-400 hover:text-purple-400 p-0.5 rounded-full transition cursor-pointer"
                          aria-label="slugの詳細説明"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>

                        {/* Floating Tooltip Popup */}
                        {showSlugTooltip && (
                          <div className="absolute left-6 -top-2 z-50 w-64 p-3 rounded-2xl bg-slate-900/95 border border-purple-500/40 text-slate-200 text-[11px] shadow-2xl backdrop-blur-md animate-fadeIn">
                            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1">
                              <span>識別URL (slug) とは？</span>
                            </div>
                            <p className="leading-relaxed text-slate-300">
                              Linkord上であなたのサーバーページを開くための固有URLになります。
                            </p>
                            <div className="mt-1.5 p-1.5 bg-black/40 rounded-lg font-mono text-[10px] text-purple-300">
                              linkord.net/server/<span className="text-white font-bold">{slug || 'your-server'}</span>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400">
                              ※ 半角英数字・ハイフン・アンダースコア（3〜48文字）
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-xs">/server/</span>
                      <input
                        type="text"
                        required
                        placeholder="your-server"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase())}
                        className="w-full pl-[62px] pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Invite URL Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        招待リンク (Discord Invite) <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {inviteVerified ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> 有効な招待リンク
                          </span>
                        ) : botCheckData?.invite_url ? (
                          'Botから取得済み（カスタムURL変更可）'
                        ) : (
                          '手動入力推奨'
                        )}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder={botCheckData?.invite_url || 'https://discord.gg/...'}
                        value={customInvite}
                        onChange={(e) => {
                          setCustomInvite(e.target.value);
                          setInviteVerified(false);
                        }}
                        onBlur={() => {
                          if (customInvite.trim()) {
                            handleInspectCustomInvite(customInvite);
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border text-white placeholder-slate-500 focus:outline-none text-xs font-mono transition ${
                          inviteVerified
                            ? 'border-emerald-500/50 focus:border-emerald-500'
                            : 'border-white/10 focus:border-purple-500'
                        }`}
                      />
                      {inspectingInvite && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      ※ サーバーの永続招待リンクまたはカスタムURL（https://discord.gg/...）を入力してください
                    </p>
                  </div>

                  {/* Server Description Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">サーバー説明文</label>
                    <textarea
                      rows={3}
                      placeholder="サーバーの活動内容やルール、歓迎するユーザーなどを紹介してください。"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs resize-none"
                    />
                  </div>

                  {/* Tags Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">タグ (カンマ区切り)</label>
                    <input
                      type="text"
                      placeholder="コミュニティ, ゲーム, 雑談"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
                    />
                  </div>

                  {/* Minecraft Tags Input (Feature) */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <label className="text-xs font-semibold text-emerald-300">
                        Minecraftサーバー設定 (Minecraftタブで優先表示)
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Minecraftサーバーの場合は該当するタグを選択してください（任意）。
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Java版',
                        '統合版(BE)',
                        'クロスプレイ',
                        'サバイバル',
                        '建築',
                        'PvP',
                        'ミニゲーム',
                        'MOD導入',
                        '経済/RPG',
                      ].map((tag) => {
                        const isSelected = minecraftTags.includes(tag);
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => {
                              if (isSelected) {
                                setMinecraftTags(minecraftTags.filter(t => t !== tag));
                              } else {
                                setMinecraftTags([...minecraftTags, tag]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </form>
              )}
            </>
          )}
        </div>

        {/* Fixed Footer with Step Controls */}
        {user && (
          <div className="px-6 py-4 border-t border-white/10 bg-[#0f111a] flex items-center justify-between shrink-0 z-20">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>戻る</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs transition cursor-pointer"
              >
                キャンセル
              </button>
            )}

            {step === 3 && (
              <button
                type="submit"
                form="create-server-form"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? '掲載中...' : 'サーバーを掲載する'}</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
