import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, Compass, Settings, Heart, LogIn, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SupportModal } from './SupportModal';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isLight = theme === 'light';

  return (
    <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between z-20 relative">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-sky-400 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition">
          <Link2 className="w-4 h-4 text-white" />
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
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">見つける</span>
        </Link>

        {isAuthenticated && (
          <Link
            to="/settings"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">設定</span>
          </Link>
        )}

        <button
          onClick={() => setIsSupportOpen(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
            isLight
              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
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

        {isAuthenticated && user ? (
          <div className="flex items-center gap-1 sm:gap-2 ml-1">
            <Link
              to={`/@${user.username}`}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.display_name}</span>
            </Link>

            <button
              onClick={handleLogout}
              title="ログアウト"
              className={`p-1.5 rounded-xl transition flex items-center justify-center ${
                isLight
                  ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
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

      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </header>
  );
};
