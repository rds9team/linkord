import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Footer: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const linkClass = `transition ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`;

  return (
    <footer className={`border-t relative z-10 text-xs py-8 px-4 mt-auto transition ${
      isLight
        ? 'border-slate-200 text-slate-600'
        : 'border-white/5 text-slate-400'
    }`}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <Link to="/" className={`flex items-center gap-2 font-bold text-sm tracking-tight hover:opacity-90 transition ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <div className="w-6 h-6 rounded-lg bg-[#5865F2] flex items-center justify-center shadow-sm">
              <img src="/logo.svg" alt="Linkord" className="w-4 h-4" />
            </div>
            <span>Linkord</span>
          </Link>
          <p className="text-[11px] text-slate-400">
            Discord プロフィール & サーバーポータル
          </p>
        </div>

        <div className="flex items-center gap-x-5 gap-y-2 text-xs flex-wrap justify-center">
          <Link to="/discover" className={linkClass}>見つける</Link>
          <Link to="/terms" className={linkClass}>利用規約</Link>
          <Link to="/privacy" className={linkClass}>プライバシーポリシー</Link>
          <a
            href="https://discord.gg/AMKjxRYKGF"
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} flex items-center gap-1`}
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
