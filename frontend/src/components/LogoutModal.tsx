import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
  username?: string;
  avatarUrl?: string;
  displayName?: string;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  username,
  avatarUrl,
  displayName,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-page-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal Dialog Card */}
      <div
        className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-10 transition-all border transform ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
            : 'bg-[#0f111a]/95 border-white/10 text-white shadow-black/80'
        }`}
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="閉じる"
          className={`absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer ${
            isLight
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Top Icon with soft glow */}
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-3.5 shadow-lg shadow-rose-500/10">
            <LogOut className="w-6 h-6 ml-0.5" />
          </div>

          <h3 className="text-base font-extrabold tracking-tight mb-1">
            ログアウトの確認
          </h3>

          <p className={`text-xs mb-4 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Linkord からログアウトしますか？<br />
            設定の変更やサーバーの管理には再ログインが必要になります。
          </p>

          {/* User Account Info Card */}
          {(displayName || username) && (
            <div
              className={`w-full p-2.5 rounded-2xl border flex items-center gap-3 mb-5 text-left ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(displayName || username || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">
                  {displayName || username}
                </p>
                {username && (
                  <p className={`text-[10px] font-mono truncate ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    @{username}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>処理中...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ログアウト</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
