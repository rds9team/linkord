import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { getDiscordLoginUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTitle } from '../hooks/useTitle';

export const Login: React.FC = () => {
  useTitle('ログイン');
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

  if (isAuthenticated && user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-sky-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-600/20">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight mb-2">
            ログイン済み: {user.display_name}
          </h1>
          <p className="text-xs text-slate-400 mb-6 flex items-center justify-center gap-1">
            <span>@{user.username}</span>
            {user.tag && <span className="text-purple-400 font-mono">#{user.tag}</span>}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
            >
              プロフィール設定へ
            </button>
            <button
              onClick={() => navigate(`/@${user.username}`)}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition"
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
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-sky-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-600/20">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            Linkord にログイン
          </h1>
          <p className="text-xs text-slate-400">
            Discord アカウントで連携して、プロフィールをはじめましょう。
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleDiscordLogin}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition shadow-lg shadow-[#5865F2]/25"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span>{loading ? 'リダイレクト中...' : 'Discord でログイン'}</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold ml-1">Authedバッジ付与</span>
        </button>

        <div className="pt-6 mt-6 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>アカウント情報は安全に暗号化・保護されます</span>
        </div>

      </div>
    </div>
  );
};
