import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ShieldCheck, Lock, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 bg-[#06070a]/80 backdrop-blur-md relative z-10 text-xs text-slate-400 py-8 px-4 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-sm tracking-tight hover:opacity-90 transition">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-[11px] shadow-sm">
              L
            </span>
            <span>Linkord</span>
          </Link>
          <p className="text-[11px] text-slate-500">
            Discord プロフィール & サーバーポータル
          </p>
        </div>

        <div className="flex items-center gap-6 text-[11px] flex-wrap justify-center">
          <Link to="/discover" className="hover:text-white transition flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>見つける</span>
          </Link>
          <Link to="/terms" className="hover:text-white transition flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>利用規約</span>
          </Link>
          <Link to="/privacy" className="hover:text-white transition flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>プライバシーポリシー</span>
          </Link>
          <Link to="/admin" className="hover:text-white transition flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>管理</span>
          </Link>
          <a
            href="https://discord.gg/example1"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition flex items-center gap-1 text-indigo-400"
          >
            <span>公式Discord</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <span>&copy; 2026 RDS9 Team</span>
        </div>
      </div>
    </footer>
  );
};
