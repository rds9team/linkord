import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Radio, Heart, LogIn, LogOut, User as UserIcon, Sun, Moon, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SupportModal } from './SupportModal';
import { LogoutModal } from './LogoutModal';
import { NotificationBox } from './NotificationBox';
import { resolveMediaUrl } from '../utils/media';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const lastScrollY = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setIsLogoutModalOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY > lastScrollY.current && currentY > 64) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
    lastScrollY.current = currentY;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.clientY <= 40) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleScroll, handleMouseMove]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLight = theme === 'light';

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${isLight ? 'bg-white/80' : 'bg-[#0b0c10]/80'} backdrop-blur-xl`}
    >
      <div className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] flex items-center justify-center transition">
            <img src="/logo.svg" alt="Linkord" className="w-5 h-5" />
          </div>
          <span className={`font-extrabold tracking-tight text-base transition ${isLight ? 'text-slate-900' : 'text-white'}`}>Linkord</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/discover"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">見つける</span>
          </Link>

          <Link
            to="/discover?type=recruitments"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">通話募集</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 text-[10px] font-bold">LIVE</span>
          </Link>

          <button
            onClick={() => setIsSupportOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
              isLight
                ? 'bg-rose-50/80 border-rose-200 text-rose-600 hover:bg-rose-100'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">応援する</span>
          </button>

          {/* Global Dark / White Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 border border-amber-300/60 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            {isLight ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="hidden sm:inline text-[11px] font-bold">White</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline text-[11px] font-bold">Dark</span>
              </>
            )}
          </button>

          {/* Notifications / Announcements Bell */}
          <NotificationBox />

          {isAuthenticated && user ? (
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                {user.avatar_url ? (
                  <img
                    src={resolveMediaUrl(user.avatar_url)}
                    alt={user.display_name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.display_name}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-lg py-1 z-50 ${
                    isLight
                      ? 'bg-white border-slate-200'
                      : 'bg-[#1a1b23] border-white/10'
                  }`}
                >
                  <Link
                    to={`/@${user.username}`}
                    onClick={() => setIsDropdownOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition ${
                      isLight
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    マイプロフィール
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition ${
                      isLight
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    設定
                  </Link>
                  <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`} />
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      isLight
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-rose-400 hover:bg-rose-500/10'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                isLight
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                  : 'bg-white text-black hover:bg-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>ログイン</span>
            </Link>
          )}
        </nav>
      </div>

      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      {user && (
        <LogoutModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleConfirmLogout}
          isLoading={isLoggingOut}
          username={user.username}
          displayName={user.display_name}
          avatarUrl={user.avatar_url}
        />
      )}
    </header>
  );
};
