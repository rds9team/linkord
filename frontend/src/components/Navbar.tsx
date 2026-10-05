import React from 'react';
import { Link } from 'react-router-dom';
import { Link2, Compass, Settings, Heart, LogIn } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between z-20 relative">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-sky-400 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition">
          <Link2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-extrabold tracking-tight text-white text-base">Linkord</span>
      </Link>

      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          to="/discover"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
        >
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">見つける</span>
        </Link>

        <Link
          to="/settings"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">設定</span>
        </Link>

        <a
          href="https://linkord.net"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white flex items-center gap-1.5 transition"
        >
          <Heart className="w-3.5 h-3.5 text-rose-400" />
          <span>応援する</span>
        </a>

        <Link
          to="/login"
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-slate-200 transition flex items-center gap-1.5"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>ログイン</span>
        </Link>
      </nav>
    </header>
  );
};
