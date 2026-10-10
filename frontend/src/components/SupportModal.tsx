import React, { useState } from 'react';
import { X, Heart, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitDonation } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [paypayUrl, setPaypayUrl] = useState('');
  const [passcode, setPasscode] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = paypayUrl.trim();
    if (!trimmedUrl) {
      setError('PayPay送金リンクを入力してください');
      return;
    }

    if (!trimmedUrl.startsWith('https://pay.paypay.ne.jp/')) {
      setError('有効なPayPay送金リンク（https://pay.paypay.ne.jp/...）を入力してください');
      return;
    }

    setLoading(true);
    try {
      await submitDonation({
        paypay_url: trimmedUrl,
        passcode: passcode.trim() || undefined,
        amount: amount ? parseInt(amount, 10) : undefined,
        message: message.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPaypayUrl('');
    setPasscode('');
    setAmount('');
    setMessage('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                <Heart className="w-5 h-5 fill-rose-500/30" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Linkord を支援する
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                    Supporter
                  </span>
                </h3>
                <p className="text-xs text-slate-400">PayPay送金リンクで運営をサポート</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="py-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">支援申請を受け付けました！</h4>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  温かいご支援ありがとうございます！管理者がPayPayの受け取りを確認後、あなたのアカウントに
                  <span className="text-rose-400 font-semibold">【Supporter】バッジ</span>が付与されます。
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* How it works info */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>📱 送金リンクの作成手順</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-0.5">
                  <li>PayPayアプリで「送る」をタップ</li>
                  <li>「SNSやメールで送る」または「リンクを作成」を選択</li>
                  <li>金額を設定してリンクを発行し、下記にURLを貼り付けてください</li>
                </ol>
              </div>

              {user ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                  <span className="text-slate-300">支援者アカウント:</span>
                  <span className="font-semibold text-purple-300">
                    @{user.full_username || user.username}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  ⚠️ ログインしていないため、Supporterバッジは付与されません（匿名支援となります）。ログインしてからの送信をおすすめします。
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  PayPay 送金リンク <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://pay.paypay.ne.jp/xxxxxx"
                  value={paypayUrl}
                  onChange={(e) => setPaypayUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    パスコード (任意)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="設定した場合のみ"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    金額目安 (円・任意)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="例: 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  メッセージ (任意)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="開発者への応援メッセージなど"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-lg shadow-rose-600/25 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>送信中...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-white/20" />
                      <span>支援を送信する</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
