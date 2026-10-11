import React, { useState, useEffect } from 'react';
import { X, Heart, CheckCircle2, AlertCircle, Loader2, Users, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { submitDonation, fetchPublicSupporters, PublicSupporterItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'form' | 'supporters';
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, defaultTab = 'form' }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'form' | 'supporters'>(defaultTab);
  const [paypayUrl, setPaypayUrl] = useState('');
  const [passcode, setPasscode] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        is_anonymous: isAnonymous,
      });
      setSuccess(true);
      loadSupporters();
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
    setIsAnonymous(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-lg border rounded-2xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
        isLight
          ? 'bg-slate-50 border-slate-200 text-slate-800'
          : 'bg-[#0e1017] border-white/10 text-white'
      }`}>
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                <Heart className="w-5 h-5 fill-rose-500/30" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  Linkord 開発支援
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium">
                    Supporter
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">PayPay送金リンクでLinkordの運営をサポート</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 p-1 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'form'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>支援する</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('supporters');
                loadSupporters();
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'supporters'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>サポーター一覧 ({supporters.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="overflow-y-auto pr-1 flex-1 scrollbar-thin">
            {activeTab === 'supporters' ? (
              <div className="space-y-3 py-1">
                {loadingSupporters ? (
                  <div className="text-center py-10 text-slate-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    <span>サポーター情報を読み込み中...</span>
                  </div>
                ) : supporters.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Heart className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs">まだサポーターがいません。最初の支援者になりませんか？</p>
                  </div>
                ) : (
                  supporters.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                        isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/5 hover:border-rose-500/20'
                      }`}
                    >
                      {s.donor_avatar ? (
                        <img
                          src={s.donor_avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-rose-500/30"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xs shrink-0">
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
                            <span className="text-[11px] font-mono font-bold text-rose-400 shrink-0">
                              ¥{s.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {s.message && (
                          <p className="text-[11px] text-slate-300 mt-1 break-words bg-black/20 p-2 rounded-lg">
                            {s.message}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {new Date(s.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : success ? (
              <div className="py-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold">支援申請を受け付けました！</h4>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    温かいご支援ありがとうございます！管理者がPayPayの受け取りを確認後、
                    {user ? (
                      <>
                        アカウントに<span className="text-rose-400 font-bold">【Supporter】バッジ</span>が付与されます。
                      </>
                    ) : (
                      '運営資金として大切に活用させていただきます。'
                    )}
                  </p>
                </div>
                <div className="pt-2 flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setActiveTab('supporters');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition"
                  >
                    サポーター一覧を見る
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* How it works info */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>📱 PayPay送金リンクの作成手順</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-400 pl-0.5 text-[11px]">
                    <li>PayPayアプリで「送る」をタップ</li>
                    <li>「SNSやメールで送る」または「リンクを作成」を選択</li>
                    <li>任意の金額を設定してリンクを発行し、下記にURLを貼り付けてください</li>
                  </ol>
                </div>

                {user ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="text-slate-300">支援者アカウント:</span>
                    <span className="font-semibold text-purple-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                      @{user.full_username || user.username}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                    ⚠️ ログインしていないため、Supporterバッジは付与されません（匿名支援となります）。バッジをご希望の場合はログイン後の送信をおすすめします。
                  </div>
                )}

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">
                    PayPay 送金リンク <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://pay.paypay.ne.jp/xxxxxx"
                    value={paypayUrl}
                    onChange={(e) => setPaypayUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold mb-1">
                      パスコード (任意)
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="設定した場合のみ"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      金額目安 (円・任意)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="例: 500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    メッセージ (任意)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="開発者への応援メッセージなど"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
                  />
                </div>

                {/* Anonymous Option */}
                {user && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-white/20 text-rose-500 focus:ring-rose-500"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-slate-300">支援者一覧に名前を表示しない（匿名希望）</span>
                      <p className="text-slate-500 text-[10px]">※ アカウントへのSupporterバッジは通常通り付与されます</p>
                    </div>
                  </label>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold transition-all shadow-lg shadow-rose-600/25 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>送信中...</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-3.5 h-3.5 fill-white/20" />
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
    </div>
  );
};
