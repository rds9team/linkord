import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MessageSquare, Github, Twitter, Code, Music, Eye, Flame, Flag, Heart
} from 'lucide-react';
import { Badges } from '../components/Badges';
import { ReportModal } from '../components/ReportModal';

export const Profile: React.FC = () => {
  const { username = 'yuto' } = useParams<{ username: string }>();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [boostCount, setBoostCount] = useState(58);
  const [hasBoosted, setHasBoosted] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const handleBoost = () => {
    if (!hasBoosted) {
      setBoostCount(prev => prev + 1);
      setHasBoosted(true);
    }
  };

  const isLight = themeMode === 'light';

  return (
    <div className={`min-h-screen py-6 px-4 flex flex-col items-center justify-center transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#08090d] text-slate-100'}`}>
      
      {/* Ambient Glow Effects (Dark only) */}
      {!isLight && (
        <>
          <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="fixed bottom-1/4 left-1/3 -translate-x-1/2 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        </>
      )}

      {/* Profile Creator / Viewer Theme Switcher Bar */}
      <div className="w-full max-w-lg mb-3 flex items-center justify-between px-2 text-xs">
        <span className="font-mono text-slate-400">linkord.net/@{username}</span>
        <div className="flex items-center gap-1.5 p-1 rounded-full border border-slate-300 dark:border-white/10 bg-slate-200/80 dark:bg-white/5">
          <button
            onClick={() => setThemeMode('dark')}
            className={`px-2.5 py-0.5 rounded-full font-semibold transition ${!isLight ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:text-black'}`}
          >
            Dark
          </button>
          <button
            onClick={() => setThemeMode('light')}
            className={`px-2.5 py-0.5 rounded-full font-semibold transition ${isLight ? 'bg-white text-black shadow' : 'text-slate-400 hover:text-white'}`}
          >
            White
          </button>
        </div>
      </div>

      {/* Main Guns.lol Style Profile Panel */}
      <main className={`w-full max-w-lg rounded-[28px] p-6 relative z-10 transition duration-300 ${isLight ? 'glass-panel-light' : 'glass-panel-dark'}`}>
        
        {/* Top: Avatar & User Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-5">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 shadow-xl bg-slate-800">
              <img
                src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&h=300&fit=crop&crop=faces"
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Online Status Indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-white dark:border-[#10121c] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-xl font-extrabold tracking-tight">{username}</h1>
              {/* Badges in User's Requested Uniform Pill Style */}
              <Badges
                hasDiscordAuthed={true}
                hasFounder={true}
                hasTeam={true}
                hasSupporter={true}
              />
            </div>

            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-2">@{username}</p>
            <p className="text-xs leading-relaxed max-w-sm text-slate-600 dark:text-slate-300">
              Fullstack Developer & Minecraft PvP Player. Building Linkord & Web projects.
            </p>
          </div>
        </div>

        {/* Social Links Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
            <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Discord</span>
          </a>
          <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
            <Github className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">GitHub</span>
          </a>
          <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
            <Twitter className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">X</span>
          </a>
          <a href="#" className={`rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.02] ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
            <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qiita</span>
          </a>
        </div>

        {/* Spotify / Lanyard Presence Widget */}
        <div className={`rounded-2xl p-3.5 mb-3 flex items-center gap-3 relative overflow-hidden ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-300 dark:bg-slate-800 flex-shrink-0 relative">
            <img
              src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&h=120&fit=crop"
              alt="Album Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <Music className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Listening to Spotify
            </div>
            <p className="text-xs font-bold truncate">After Hours</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">The Weeknd</p>
          </div>
          <div className="text-[10px] font-mono text-slate-400 pr-1">
            2:45 / 3:50
          </div>
        </div>

        {/* Minecraft PlayHive Stats Card */}
        <div className={`rounded-2xl p-3.5 mb-3 ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 text-[10px] font-bold">
                MC
              </div>
              <span className="text-xs font-bold">PlayHive - BedWars</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-white/5 px-2 py-0.5 rounded">
              Level 42
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Kills</span>
              <span className="font-mono text-xs font-bold">3,892</span>
            </div>
            <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Victories</span>
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">540</span>
            </div>
            <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl py-2 px-1">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">K/D Ratio</span>
              <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">4.18</span>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-400 text-right mt-1.5">
            最終取得: 8分前 (10分キャッシュ)
          </div>
        </div>

        {/* Pinned Server Card */}
        <div className={`rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3 ${isLight ? 'glass-card-light' : 'glass-card-dark'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
              RDS
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold truncate">RDS9 Community</p>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.2 rounded font-medium">
                  Official
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>1,240 メンバー</span>
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex-shrink-0">
            参加
          </button>
        </div>

        {/* Footer: Views, Boost, Report */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="累計アクセス数">
              <Eye className="w-3.5 h-3.5" />
              <span>1,824</span>
            </span>
            <span className="flex items-center gap-1" title="ブースト数">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-500 font-bold">{boostCount}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBoost}
              disabled={hasBoosted}
              className={`flex items-center gap-1 text-[11px] font-sans font-medium transition ${hasBoosted ? 'text-amber-500 font-bold' : 'hover:text-amber-500'}`}
              title="1ユーザー1時間に1回のみ"
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>{hasBoosted ? 'ブースト済み' : 'ブースト'}</span>
            </button>
            <span className="text-slate-400 dark:text-slate-700">|</span>
            <button
              onClick={() => setIsReportOpen(true)}
              className="hover:text-rose-500 transition flex items-center gap-1 text-[11px] font-sans font-medium"
            >
              <Flag className="w-3 h-3" />
              <span>通報</span>
            </button>
          </div>
        </div>

      </main>

      {/* Powered by Watermark */}
      <footer className="mt-4 text-center">
        <p className="text-[11px] text-slate-500">
          Powered by <span className="font-semibold text-slate-700 dark:text-slate-400">rds9team</span> &middot; Linkord
        </p>
      </footer>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="profile"
        targetId={username}
      />
    </div>
  );
};
