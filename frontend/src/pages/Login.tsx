import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Terminal, AlertCircle } from 'lucide-react';
import { getDiscordLoginUrl, getGoogleLoginUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
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

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      const url = await getGoogleLoginUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Googleログインの初期化に失敗しました');
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      await login();
      navigate('/settings');
    } catch (err: any) {
      setError(err.message || '開発ログインに失敗しました');
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
            ログイン中: {user.display_name}
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            すでにログインしています。プロフィール設定またはマイページに移動できます。
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-center">
        
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-sky-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-600/20">
          <LogIn className="w-6 h-6 text-white" />
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
          Linkord にログイン
        </h1>
        <p className="text-xs text-slate-400 mb-8">
          アカウントを作成または連携して、プロフィールを管理しましょう。
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {/* Discord Login */}
          <button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-[#5865F2]/20"
          >
            <span>Discord でログイン</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium">Authedバッジ付与</span>
          </button>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg"
          >
            <span>Google でログイン</span>
          </button>

          {/* Dev Quick Login */}
          <div className="pt-2">
            <button
              onClick={handleDevLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>Dev Login（開発用クイックログイン）</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>アカウント情報は安全に暗号化・保護されます</span>
        </div>

      </div>
    </div>
  );
};
