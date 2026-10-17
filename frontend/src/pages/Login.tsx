import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2, Loader2, Sparkles, Server } from 'lucide-react';
import { getDiscordLoginUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTitle } from '../hooks/useTitle';

export const Login: React.FC = () => {
  useTitle('ログイン / Discord連携');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscordLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      const url = await getDiscordLoginUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Discordログインの初期化に失敗しました');
      setLoading(false);
    }
  };

  // 既にログインしている場合
  if (isAuthenticated && user) {
    const needsReauth = user.needs_discord_reauth || !user.discord_id || !user.has_discord_authed || user.has_discord_token === false;

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#5865F2] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#5865F2]/25">
            <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>

          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
            ログイン中: {user.display_name}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 flex items-center justify-center gap-1">
            <span>@{user.username}</span>
            {user.tag && <span className="text-purple-600 dark:text-purple-400 font-mono">#{user.tag}</span>}
          </p>

          {needsReauth ? (
            <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-950/60 dark:to-purple-950/60 border border-indigo-200 dark:border-[#5865F2]/40 text-left">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Discord 連携が必須です</span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                サーバー掲載時のギルド取得権限やステータス同期のため、Discordアカウントの再認証・最新権限の連携を行ってください。
              </p>
              <button
                onClick={handleDiscordLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-[#5865F2]/30 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Discord を再認証して連携する</span>
              </button>
            </div>
          ) : (
            <div className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Discord 連携完了済み（最新権限有効）</span>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
            >
              プロフィール設定へ
            </button>
            <button
              onClick={() => navigate(`/@${user.username}`)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              マイプロフィールを見る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#5865F2] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#5865F2]/30">
            <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#7289da] text-[11px] font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Discord 連携必須</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Linkord へログイン
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Linkord の全機能（プロフィール作成・サーバー募集・ステータス同期）をご利用いただくため、Discord アカウントでの連携が必須となっています。
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition shadow-lg shadow-[#5865F2]/25 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Discord へリダイレクト中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Discord でログイン / 連携する</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold ml-1">Authedバッジ付与</span>
              </>
            )}
          </button>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2 text-left">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>連携によって有効化される機能:</span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pl-5 list-disc leading-relaxed">
              <li>公式 Discord 認証（Authed バッジ）の自動付与</li>
              <li>管理権限を持つサーバーの一覧自動取得＆簡単掲載</li>
              <li>Spotify・アクティビティ等のリアルタイムステータス同期</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/5 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Discord公式OAuth2認証を使用。パスワードは安全に保護されます</span>
        </div>

      </div>
    </div>
  );
};
