import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Flame, Flag, ExternalLink, ArrowLeft, Loader2, ServerCrash, RefreshCw, Check, Code, ShieldCheck, Copy, Share2, Edit, Sparkles } from 'lucide-react';
import { ReportModal } from '../components/ReportModal';
import { EditServerModal } from '../components/EditServerModal';
import { ShareModal } from '../components/ShareModal';
import { fetchServer, boostServer, syncServerDiscordStats, fetchServerAlliances, getServerJoinUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ServerData, ServerAllianceItem } from '../types';
import { useTitle } from '../hooks/useTitle';
import { resolveMediaUrl } from '../utils/media';

const isSafeHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
};

export const ServerDetail: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [server, setServer] = useState<ServerData | null>(null);
  useTitle(server ? server.name : 'サーバー');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [boosts, setBoosts] = useState(0);
  const [boosted, setBoosted] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [boostError, setBoostError] = useState<string | null>(null);

  const handleGoBack = () => {
    const prevPath = sessionStorage.getItem('linkord_prev_internal_path');
    if (prevPath && prevPath !== window.location.pathname + window.location.search) {
      navigate(-1);
    } else {
      navigate('/discover');
    }
  };

  const [alliances, setAlliances] = useState<ServerAllianceItem[]>([]);
  const [copiedBadge, setCopiedBadge] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadServer = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await fetchServer(slug);
        if (isMounted) {
          setServer(data);
          setBoosts(data.boosts_count !== undefined ? data.boosts_count : 0);
        }
        // Load alliances
        try {
          const alData = await fetchServerAlliances(slug);
          if (isMounted) {
            setAlliances(alData || []);
          }
        } catch {
          // ignore alliance fetch errors
        }
      } catch {
        if (isMounted) {
          setServer(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadServer();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleBoost = async () => {
    if (boosted || !server) return;
    setBoostError(null);
    try {
      await boostServer(server.slug);
      setBoosts(prev => prev + 1);
      setBoosted(true);
    } catch (err: any) {
      if (err.message && err.message.includes('1時間')) {
        setBoostError('このサーバーへのブーストは1時間に1回のみ可能です');
      }
      setBoosted(true);
    }
  };

  const handleSync = async () => {
    if (!server || syncing) return;
    try {
      setSyncing(true);
      const res = await syncServerDiscordStats(server.slug);
      setServer(prev => prev ? {
        ...prev,
        member_count: res.member_count,
        icon_url: res.icon_url || prev.icon_url,
      } : null);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Discord情報の同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="text-xs text-slate-400">サーバー情報を読み込み中...</span>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <ServerCrash className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">サーバーが見つかりません</h2>
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
        >
          サーバー一覧へ戻る
        </Link>
      </div>
    );
  }

  const tagsList = server.tags.split(',').map(t => t.trim()).filter(Boolean);
  const isOfficial = server.slug === 'rds9-community';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition mb-6 cursor-pointer border border-white/10"
        title="見つける・前の一覧に戻る"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>戻る</span>
      </button>

      <div className="rounded-[24px] p-6 sm:p-8 bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shadow-indigo-600/30 overflow-hidden flex-shrink-0">
            {server.icon_url ? (
              <img
                src={resolveMediaUrl(server.icon_url)}
                alt={server.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src.endsWith('.gif')) {
                    target.src = target.src.replace(/\.gif($|\?)/, '.png$1');
                  } else {
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerText = server.name.substring(0, 3);
                    }
                  }
                }}
              />
            ) : (
              server.name.substring(0, 3)
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <h1 className="text-2xl font-extrabold text-white truncate">{server.name}</h1>
              {isOfficial && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-semibold">
                  Official
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 font-mono mb-3">linkord.net/server/{server.slug}</p>

            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{server.member_count.toLocaleString()} メンバー</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                <Flame className="w-3.5 h-3.5" />
                <span>{boosts} ブースト</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full sm:w-44">
            <a
              href={getServerJoinUrl(server.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-5 py-3 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
            >
              <span>サーバーに参加</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className={`grid ${server.can_edit ? 'grid-cols-2' : 'grid-cols-3'} sm:flex sm:flex-col gap-2 w-full`}>
              {server.can_edit && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl border border-purple-500/40 hover:border-purple-500/60 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition active:scale-[0.98]"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>編集</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleBoost}
                disabled={boosted}
                className={`px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl border border-amber-500/30 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition active:scale-[0.98] ${
                  boosted
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{boosted ? 'ブースト済' : 'ブースト'}</span>
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition active:scale-[0.98]"
                title="Discordから最新のメンバー数とアイコンを再取得"
              >
                {syncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                ) : syncSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{syncSuccess ? '同期完了' : '最新同期'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer active:scale-[0.98]"
                title="サーバーを共有・埋め込み"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>シェア</span>
              </button>
            </div>
          </div>
        </div>

        {boostError && (
          <div className="mb-4 text-xs text-amber-400/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            {boostError}
          </div>
        )}

        {/* Server Description */}
        <div className="border-t border-white/5 pt-5 mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">サーバー概要</h2>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {server.description || '説明は設定されていません。'}
          </p>
        </div>

        {/* Server Alliances (Feature 4) */}
        {alliances.length > 0 && (
          <div className="border-t border-white/5 pt-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                提携・同盟サーバー ({alliances.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alliances.map((al) => (
                <Link
                  key={al.id}
                  to={`/server/${al.partner_server_slug}`}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-purple-600/20 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                      {al.partner_server_icon_url ? (
                        <img src={al.partner_server_icon_url} alt={al.partner_server_name} className="w-full h-full object-cover" />
                      ) : (
                        al.partner_server_name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition">
                        {al.partner_server_name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {al.partner_server_member_count.toLocaleString()} メンバー
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Badge Widget Embed (Feature 5) */}
        <div className="border-t border-white/5 pt-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                外部埋め込みバッジ (ブログ・Wiki・GitHub用)
              </h2>
            </div>
            <button
              onClick={() => {
                const markdown = `[![${server.name} on Linkord](https://linkord.net/api/badge/${server.slug}.svg)](https://linkord.net/server/${server.slug})`;
                navigator.clipboard.writeText(markdown);
                setCopiedBadge(true);
                setTimeout(() => setCopiedBadge(false), 2000);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 transition flex items-center gap-1 cursor-pointer"
            >
              {copiedBadge ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedBadge ? 'コピー完了！' : 'Markdownをコピー'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            READMEやブログに貼ると、サーバーアイコン・リアルタイム人数・Linkordへのリンクが自動反映されます。
          </p>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto flex justify-center">
            <img
              src={`/api/badge/${server.slug}.svg`}
              alt={`${server.name} widget badge`}
              className="max-w-full h-auto rounded-xl shadow-md"
            />
          </div>
        </div>

        {/* Minecraft Tags */}
        {server.minecraft_tags && (
          <div className="border-t border-white/5 pt-5 mb-6">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Minecraft対応サーバー</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {server.minecraft_tags.split(',').map(t => t.trim()).filter(Boolean).map(mcTag => (
                <span
                  key={mcTag}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                >
                  {mcTag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tagsList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tagsList.map(tag => (
              <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/5 text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-slate-500">
          <span>登録日: {new Date(server.created_at).toLocaleDateString()}</span>
          <button
            onClick={() => setIsReportOpen(true)}
            className="hover:text-rose-400 flex items-center gap-1 transition"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>このサーバーを通報</span>
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="server"
        targetId={server.slug}
      />

      <EditServerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        server={server}
        onUpdated={(updated) => setServer(updated)}
      />

      {/* Share & Embed Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={server.name}
        shareUrl={`https://linkord.net/server/${server.slug}`}
        shareText={`Discordサーバー「${server.name}」(${server.member_count}名) をチェック！\n\n参加はこちら👇`}
        badgeSlugOrUsername={server.slug}
        type="server"
        customTitle="サーバーを共有・埋め込み"
      />
    </div>
  );
};
