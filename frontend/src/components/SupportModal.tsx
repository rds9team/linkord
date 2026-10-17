import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Mail, Copy, Check, Users, ShieldCheck, Loader2 } from 'lucide-react';
import { fetchPublicSupporters, PublicSupporterItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/media';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'form' | 'supporters';
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, defaultTab = 'form' }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'form' | 'supporters'>(defaultTab);
  const [copied, setCopied] = useState(false);

  // Supporters list state
  const [supporters, setSupporters] = useState<PublicSupporterItem[]>([]);
  const [loadingSupporters, setLoadingSupporters] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      loadSupporters();
    }
  }, [isOpen, defaultTab]);

  const loadSupporters = async () => {
    try {
      setLoadingSupporters(true);
      const data = await fetchPublicSupporters();
      setSupporters(data);
    } catch {
      // ignore
    } finally {
      setLoadingSupporters(false);
    }
  };

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@linkord.net');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-lg border rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#10121a] border-white/10 text-white'
      }`}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 shrink-0">
                <Heart className="w-5 h-5 fill-rose-500/20" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 tracking-tight">
                  Linkord 開発支援
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">
                    Supporter
                  </span>
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1.5 mb-5 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>支援案内</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('supporters');
                loadSupporters();
              }}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'supporters'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>サポーター一覧 ({supporters.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="overflow-y-auto pr-1 flex-1 overscroll-contain">
            {activeTab === 'supporters' ? (
              <div className="space-y-3 py-1">
                {loadingSupporters ? (
                  <div className="text-center py-14 text-slate-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    <span>サポーター情報を読み込み中...</span>
                  </div>
                ) : supporters.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">サポーターはまだ登録されていません</p>
                      <p className="text-[11px] text-slate-500 mt-1">ご支援いただいた方のアカウントとメッセージがここに掲載されます</p>
                    </div>
                  </div>
                ) : (
                  supporters.map((s) => {
                    const resolvedAvatar = resolveMediaUrl(s.donor_avatar);
                    return (
                      <div
                        key={s.id}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3.5 transition ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
                        }`}
                      >
                        {resolvedAvatar ? (
                          <img
                            src={resolvedAvatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs shrink-0">
                            {s.donor_name.slice(0, 1)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-xs truncate">{s.donor_name}</span>
                              {s.donor_username && (
                                <span className="text-[10px] text-slate-400 truncate">@{s.donor_username}</span>
                              )}
                            </div>
                            {s.amount && (
                              <span className="text-[11px] font-mono font-bold text-rose-500 dark:text-rose-400 shrink-0">
                                ¥{s.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {s.message && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 break-words bg-slate-100 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 leading-relaxed">
                              {s.message}
                            </p>
                          )}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 block">
                            {new Date(s.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs py-1">
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
                }`}>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>Linkordの運営支援について</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                    Linkordのサーバー費用やドメイン代などの運営資金をご支援いただける場合は、下記メールアドレス宛にご連絡をお願いいたします。
                  </p>

                  <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-black/40 border-white/10'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="font-mono font-bold text-xs sm:text-sm text-purple-600 dark:text-purple-300 select-all truncate">
                        support@linkord.net
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[11px] font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">コピー完了</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>コピー</span>
                        </>
                      )}
                    </button>
                  </div>

                  <a
                    href="mailto:support@linkord.net?subject=Linkord開発支援について"
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>メールアプリを開いて連絡する</span>
                  </a>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 leading-relaxed text-slate-600 dark:text-slate-300 text-xs">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        支援者一覧に名前を表示しないかどうかメールに記入して送ってください。
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        ※ アカウントへのSupporterバッジは通常通り付与されます（バッジ付与を希望される場合はLinkordアカウントのユーザー名もご記載ください）。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
