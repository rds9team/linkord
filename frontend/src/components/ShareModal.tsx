import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink, Code, MessageSquare, Twitter, Globe, Smartphone } from 'lucide-react';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
  shareText?: string;
  badgeSlugOrUsername?: string;
  type?: 'server' | 'user' | 'recruitment';
  customTitle?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  shareUrl,
  shareText = '',
  badgeSlugOrUsername,
  type = 'server',
  customTitle,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<'sns' | 'embed'>('sns');

  if (!isOpen) return null;

  const canWebShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Handle native Web Share API
  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: title,
        text: shareText || title,
        url: shareUrl,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  // Copy URL to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Social Share URLs
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${shareText || title}\n`);
  const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=Linkord`;
  const lineIntentUrl = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;

  // Badge URLs
  const badgeUrl = badgeSlugOrUsername
    ? type === 'user'
      ? `https://linkord.net/api/badge/user/${badgeSlugOrUsername}.svg`
      : `https://linkord.net/api/badge/${badgeSlugOrUsername}.svg`
    : null;

  const markdownEmbed = badgeUrl
    ? `[![${title}](${badgeUrl})](${shareUrl})`
    : `[${title}](${shareUrl})`;

  const htmlEmbed = badgeUrl
    ? `<a href="${shareUrl}" target="_blank" rel="noopener noreferrer"><img src="${badgeUrl}" alt="${title}" /></a>`
    : `<a href="${shareUrl}" target="_blank" rel="noopener noreferrer">${title}</a>`;

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownEmbed);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {}
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlEmbed);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {customTitle || '共有・シェア'}
              </h2>
              <p className="text-[10px] text-slate-400 truncate max-w-[240px]">
                {title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sns')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'sns'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SNS・リンク共有</span>
          </button>
          {badgeUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('embed')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'embed'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>埋め込みバッジ</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'sns' ? (
            <>
              {/* Native System Share (Android, iOS, Safari) */}
              {canWebShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>端末の共有メニューで送る</span>
                </button>
              )}

              {/* Quick SNS Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* X (Twitter) */}
                <a
                  href={xIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/10 hover:border-sky-500/50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer group"
                >
                  <Twitter className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
                  <span>X (Twitter) で投稿</span>
                </a>

                {/* LINE */}
                <a
                  href={lineIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-[#06C755]/15 hover:bg-[#06C755]/25 border border-[#06C755]/30 hover:border-[#06C755]/60 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer group"
                >
                  <MessageSquare className="w-4 h-4 text-[#06C755] group-hover:scale-110 transition" />
                  <span>LINE で送る</span>
                </a>
              </div>

              {/* Copy URL Field */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  <span>共有リンク</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-slate-200 text-xs font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>コピー済</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>コピー</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Badge Preview */}
              {badgeUrl && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto flex justify-center">
                    <img
                      src={badgeUrl}
                      alt={title}
                      className="max-w-full h-auto rounded-xl shadow-md"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ブログ、GitHubのREADME、Wikiなどに貼ると、常に最新のステータスが自動反映されます。
                  </p>

                  {/* Markdown Copy */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300">Markdown形式 (GitHub・Qiita・Zenn)</span>
                      <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        {copiedMarkdown ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedMarkdown ? 'コピー完了！' : 'コピー'}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={2}
                      value={markdownEmbed}
                      className="w-full p-2 rounded-xl bg-black/50 border border-white/10 text-slate-300 text-[11px] font-mono select-all focus:outline-none resize-none"
                    />
                  </div>

                  {/* HTML Copy */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300">HTML形式 (ブログ・Webサイト)</span>
                      <button
                        type="button"
                        onClick={handleCopyHtml}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        {copiedHtml ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHtml ? 'コピー完了！' : 'コピー'}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={2}
                      value={htmlEmbed}
                      className="w-full p-2 rounded-xl bg-black/50 border border-white/10 text-slate-300 text-[11px] font-mono select-all focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
