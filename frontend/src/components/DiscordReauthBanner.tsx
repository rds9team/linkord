import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDiscordLoginUrl } from '../api/client';

export const DiscordReauthBanner: React.FC = () => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check for successful link redirect
  useEffect(() => {
    if (searchParams.get('discord_linked') === 'success') {
      setSuccessMsg('Discord アカウントとの連携・最新権限の更新が完了しました！');
      refreshUser();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('discord_linked');
      setSearchParams(nextParams, { replace: true });

      const timer = setTimeout(() => {
        setSuccessMsg(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams, refreshUser]);

  const handleConnectDiscord = async () => {
    try {
      setLoading(true);
      const url = await getDiscordLoginUrl();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Discord認証の開始に失敗しました');
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 mb-4 z-30 relative animate-fadeIn">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-xl flex items-center justify-between gap-3 text-emerald-300 shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold truncate">{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  // Check if user needs discord linking or re-authorization
  const needsReauth = user.needs_discord_reauth || !user.discord_id || !user.has_discord_authed || user.has_discord_token === false;
  if (!needsReauth || dismissed) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mb-4 z-30 relative animate-fadeIn">
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-[#5865F2]/20 to-purple-950/80 border border-[#5865F2]/40 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl shadow-[#5865F2]/10">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#5865F2] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#5865F2]/30 mt-0.5 sm:mt-0">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Discord 連携が必須になりました
              </span>
              <span className="text-[10px] bg-[#5865F2]/40 text-indigo-200 border border-[#5865F2]/60 px-1.5 py-0.2 rounded font-semibold">
                必須設定
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-snug mt-0.5">
              サーバー掲載時の自動一覧取得や、ステータス同期、公式Authedバッジを適用するために、Discordアカウントの再連携を行ってください。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button
            onClick={handleConnectDiscord}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-[#5865F2]/30 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>連携中...</span>
              </>
            ) : (
              <>
                <span>今すぐDiscordと連携</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            title="後で"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
