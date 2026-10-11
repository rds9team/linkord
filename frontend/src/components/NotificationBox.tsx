import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, ExternalLink, Sparkles, AlertCircle, Info, Calendar, X, Trash2, Megaphone } from 'lucide-react';
import { fetchAnnouncements } from '../api/client';
import { AnnouncementItem } from '../types';
import { useTheme } from '../context/ThemeContext';

const READ_STORAGE_KEY = 'linkord_read_announcements';
const DELETED_STORAGE_KEY = 'linkord_deleted_announcements';

export const NotificationBox: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [readIds, setReadIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [deletedIds, setDeletedIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(DELETED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [incomingToast, setIncomingToast] = useState<AnnouncementItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const knownIdsRef = useRef<Set<number>>(new Set());

  const loadAnnouncements = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const items = await fetchAnnouncements(30);
      if (items && Array.isArray(items)) {
        // Detect newly arrived announcement for real-time toast
        if (!isFirstLoadRef.current) {
          const freshItem = items.find(
            (item) =>
              !knownIdsRef.current.has(item.id) &&
              !readIds.includes(item.id) &&
              !deletedIds.includes(item.id)
          );
          if (freshItem) {
            setIncomingToast(freshItem);
          }
        }

        // Update known IDs
        items.forEach((item) => knownIdsRef.current.add(item.id));
        isFirstLoadRef.current = false;
        setAnnouncements(items);
      }
    } catch {
      if (!isBackground) setAnnouncements([]);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements(false);
    // Real-time polling every 15 seconds
    const interval = setInterval(() => {
      loadAnnouncements(true);
    }, 15 * 1000);
    return () => clearInterval(interval);
  }, [readIds, deletedIds]);

  // Auto-dismiss incoming toast after 6 seconds
  useEffect(() => {
    if (!incomingToast) return;
    const timer = setTimeout(() => {
      setIncomingToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [incomingToast]);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const visibleAnnouncements = announcements.filter((a) => !deletedIds.includes(a.id));
  const unreadCount = visibleAnnouncements.filter((a) => !readIds.includes(a.id)).length;

  const handleMarkAllAsRead = () => {
    const allIds = Array.from(new Set([...readIds, ...visibleAnnouncements.map((a) => a.id)]));
    setReadIds(allIds);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const handleDeleteItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextDeleted = Array.from(new Set([...deletedIds, id]));
    setDeletedIds(nextDeleted);
    try {
      localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(nextDeleted));
    } catch {
      // ignore
    }
  };

  const handleDeleteAllRead = () => {
    const readItemIds = visibleAnnouncements
      .filter((a) => readIds.includes(a.id))
      .map((a) => a.id);
    if (readItemIds.length === 0) return;
    const nextDeleted = Array.from(new Set([...deletedIds, ...readItemIds]));
    setDeletedIds(nextDeleted);
    try {
      localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(nextDeleted));
    } catch {
      // ignore
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            アップデート
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-2.5 h-2.5" />
            重要
          </span>
        );
      case 'event':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Calendar className="w-2.5 h-2.5" />
            イベント
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Info className="w-2.5 h-2.5" />
            お知らせ
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Real-time Incoming Toast Popup */}
      {incomingToast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            onClick={() => {
              setIsOpen(true);
              setIncomingToast(null);
            }}
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-2xl cursor-pointer transition transform hover:scale-[1.02] ${
              isLight
                ? 'bg-white/95 border-purple-200 text-slate-900 shadow-purple-500/10'
                : 'bg-[#0f111a]/95 border-purple-500/30 text-white shadow-purple-900/30 ring-1 ring-purple-500/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <Megaphone className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase tracking-wider">
                    新着お知らせ
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">たった今</span>
                </div>
                <h4 className="text-xs font-bold truncate mb-1 text-purple-200">
                  {incomingToast.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {incomingToast.content}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIncomingToast(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative" ref={containerRef}>
        {/* Bell Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && unreadCount > 0) {
              handleMarkAllAsRead();
            }
          }}
          className={`relative p-2 rounded-xl transition cursor-pointer ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          } ${isOpen ? (isLight ? 'bg-slate-200' : 'bg-white/10 text-white') : ''}`}
          title="お知らせ・通知"
          aria-label="お知らせ通知"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-rose-500/50">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Popover Notification Box */}
        {isOpen && (
          <div
            className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
                : 'bg-[#0f111a]/95 border-white/10 text-white shadow-black/80'
            }`}
          >
            {/* Header */}
            <div
              className={`p-3.5 flex items-center justify-between border-b ${
                isLight ? 'border-slate-100 bg-slate-50/70' : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                  <Bell className="w-3.5 h-3.5" />
                </span>
                <h3 className="text-xs font-bold tracking-tight">お知らせ・通知</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-semibold">
                    {unreadCount}件未読
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {visibleAnnouncements.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                        isLight
                          ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="すべて既読にする"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>既読</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAllRead}
                      className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                        isLight
                          ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                          : 'text-slate-400 hover:text-rose-300 hover:bg-rose-500/10'
                      }`}
                      title="既読にしたお知らせをすべて削除"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>既読全削除</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded-lg transition ${
                    isLight
                      ? 'text-slate-400 hover:text-slate-600'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List of Announcements */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
              {visibleAnnouncements.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Bell className="w-8 h-8 text-slate-500/50 mx-auto mb-2 stroke-1" />
                  <p className="font-semibold text-slate-300 mb-1">新しいお知らせはありません</p>
                  <p className="text-[11px] text-slate-500">運営からの最新情報がここに届きます</p>
                </div>
              ) : (
                visibleAnnouncements.map((item) => {
                  const isUnread = !readIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 transition group relative ${
                        isUnread
                          ? isLight
                            ? 'bg-purple-50/70 hover:bg-purple-50'
                            : 'bg-purple-500/[0.06] hover:bg-purple-500/[0.1]'
                          : isLight
                          ? 'hover:bg-slate-50'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getTypeBadge(item.type)}
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatDate(item.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(item.id, e)}
                            className="opacity-60 group-hover:opacity-100 hover:text-rose-400 text-slate-400 p-0.5 rounded transition"
                            title="このお知らせを削除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold leading-snug mb-1 text-slate-900 dark:text-white">
                        {item.title}
                      </h4>

                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-4">
                        {item.content}
                      </p>

                      {item.link_url && (
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex justify-end">
                          <a
                            href={item.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition"
                          >
                            <span>詳細を見る</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
