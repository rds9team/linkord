import React from 'react';
import { LogIn, ArrowRight, ShieldCheck, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const handleDiscordLogin = () => {
    // In dev, redirect or call /api/auth/discord/login
    window.location.href = '/@yuto';
  };

  const handleGoogleLogin = () => {
    window.location.href = '/@yuto';
  };

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

        <div className="space-y-3 mb-6">
          {/* Discord Login */}
          <button
            onClick={handleDiscordLogin}
            className="w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-[#5865F2]/20"
          >
            <span>Discord でログイン</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium">Authedバッジ付与</span>
          </button>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg"
          >
            <span>Google でログイン</span>
          </button>
        </div>

        <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>アカウント情報は安全に暗号化・保護されます</span>
        </div>

      </div>
    </div>
  );
};
