import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Radio, User as UserIcon, Settings, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/media';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const pathname = location.pathname;
  const search = location.search;

  // Active tab determination
  const isHome = pathname === '/';
  const isRecruitments = pathname === '/discover' && search.includes('type=recruitments');
  const isDiscover = (pathname === '/discover' || pathname.startsWith('/server/')) && !isRecruitments;
  const isMyProfile = user && pathname === `/@${user.username}`;
  const isSettings = pathname === '/settings';

  return (
    <nav
      aria-label="モバイルナビゲーション"
      className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 border-t backdrop-blur-2xl ${
        isLight
          ? 'bg-white/90 border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
          : 'bg-[#0b0c10]/95 border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]'
      }`}
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      <div className="grid grid-cols-4 h-14 items-center px-2">
        {/* 1. ホーム */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 ${
            isHome
              ? 'text-[#5865F2] font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform ${isHome ? 'scale-110' : ''}`} />
            {isHome && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#5865F2]" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">ホーム</span>
        </Link>

        {/* 2. 見つける */}
        <Link
          to="/discover"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 ${
            isDiscover
              ? 'text-[#5865F2] font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Compass className={`w-5 h-5 transition-transform ${isDiscover ? 'scale-110' : ''}`} />
            {isDiscover && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#5865F2]" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">見つける</span>
        </Link>

        {/* 3. 通話募集 */}
        <Link
          to="/discover?type=recruitments"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 ${
            isRecruitments
              ? 'text-rose-500 font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Radio className={`w-5 h-5 transition-transform ${isRecruitments ? 'scale-110 text-rose-500' : ''}`} />
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-white dark:ring-[#0b0c10]" />
            {isRecruitments && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-500" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">通話募集</span>
        </Link>

        {/* 4. マイページ / 設定 / ログイン */}
        {isAuthenticated && user ? (
          <Link
            to={`/@${user.username}`}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 ${
              isMyProfile || isSettings
                ? 'text-[#5865F2] font-bold'
                : isLight
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={resolveMediaUrl(user.avatar_url)}
                  alt={user.display_name}
                  className={`w-5 h-5 rounded-full object-cover transition-transform ${
                    isMyProfile || isSettings ? 'ring-2 ring-[#5865F2] scale-110' : ''
                  }`}
                />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white transition-transform ${
                    isMyProfile || isSettings ? 'ring-2 ring-[#5865F2] scale-110' : ''
                  }`}
                >
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              {(isMyProfile || isSettings) && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#5865F2]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">マイプロフ</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-95 ${
              pathname === '/login'
                ? 'text-[#5865F2] font-bold'
                : isLight
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <LogIn className={`w-5 h-5 transition-transform ${pathname === '/login' ? 'scale-110' : ''}`} />
              {pathname === '/login' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#5865F2]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">ログイン</span>
          </Link>
        )}
      </div>
    </nav>
  );
};
