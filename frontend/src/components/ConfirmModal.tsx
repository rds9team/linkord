import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  isLoading?: boolean;
  userInfo?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '実行する',
  cancelText = 'キャンセル',
  type = 'danger',
  icon,
  isLoading = false,
  userInfo,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

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

  const colorStyles = {
    danger: {
      iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/10',
      btn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25',
    },
    warning: {
      iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25',
    },
    info: {
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/10',
      btn: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25',
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-page-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={isLoading ? undefined : onClose} />

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
          {/* Top Icon Badge */}
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3.5 shadow-lg ${colorStyles.iconBg}`}>
            {icon || <AlertTriangle className="w-6 h-6" />}
          </div>

          <h3 className="text-base font-extrabold tracking-tight mb-1.5">
            {title}
          </h3>

          <div className={`text-xs mb-4 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {message}
          </div>

          {/* User Account Info Card if provided */}
          {userInfo && (userInfo.displayName || userInfo.username) && (
            <div
              className={`w-full p-2.5 rounded-2xl border flex items-center gap-3 mb-5 text-left ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userInfo.avatarUrl ? (
                  <img src={userInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(userInfo.displayName || userInfo.username || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">
                  {userInfo.displayName || userInfo.username}
                </p>
                {userInfo.username && (
                  <p className={`text-[10px] font-mono truncate ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    @{userInfo.username}
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
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${colorStyles.btn}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>処理中...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
