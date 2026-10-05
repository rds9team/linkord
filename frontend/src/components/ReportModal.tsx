import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: string;
  targetId: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
}) => {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, call /api/reports
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold text-white">通報フォーム</h2>
        </div>

        {submitted ? (
          <div className="text-center py-6 text-sm text-emerald-400 font-semibold">
            通報を受け付けました。管理者が内容を確認します。
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                通報理由
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="spam">スパム・宣伝行為</option>
                <option value="phishing">フィッシング・悪意のあるリンク</option>
                <option value="harassment">嫌がらせ・名誉毀損</option>
                <option value="nsfw">不適切な性的・暴力的コンテンツ</option>
                <option value="impersonation">なりすまし</option>
                <option value="other">その他規約違反</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                詳細（任意）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="問題の内容を具体的にご記入ください"
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition"
              >
                通報を送信
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
