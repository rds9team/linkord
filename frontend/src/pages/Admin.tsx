import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Server, CheckCircle2, XCircle, Clock, Eye, EyeOff, Search, Loader2, Heart, ExternalLink, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  checkAdminAccess,
  fetchAdminStats,
  fetchAdminReports,
  updateAdminReport,
  toggleProfileVisibility,
  toggleServerVisibility,
  fetchAdminDonations,
  resolveAdminDonation,
} from '../api/client';
import { AdminStats, ReportItem, DonationItem } from '../types';
import { useTitle } from '../hooks/useTitle';

export const Admin: React.FC = () => {
  useTitle('管理');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'donations'>('donations');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [donationFilter, setDonationFilter] = useState<string>('pending');
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Manual visibility toggle inputs
  const [targetUsername, setTargetUsername] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const adminCheck = await checkAdminAccess();
        setIsAdmin(adminCheck.is_admin);

        const [statsData, reportsData, donationsData] = await Promise.all([
          fetchAdminStats(),
          fetchAdminReports(statusFilter || undefined),
          fetchAdminDonations(donationFilter || undefined),
        ]);
        setStats(statsData);
        setReports(reportsData);
        setDonations(donationsData);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [statusFilter, donationFilter]);

  const handleUpdateStatus = async (reportId: number, newStatus: string) => {
    setActionLoading((prev) => ({ ...prev, [reportId]: true }));
    try {
      const updated = await updateAdminReport(reportId, { status: newStatus });
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
      setMessage({ text: `通報 #${reportId} のステータスを更新しました`, type: 'success' });
      // Refresh stats
      const statsData = await fetchAdminStats();
      setStats(statsData);
    } catch (err: any) {
      setMessage({ text: err.message || '更新に失敗しました', type: 'error' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const handleResolveDonation = async (donationId: number, action: 'approve' | 'reject') => {
    setActionLoading((prev) => ({ ...prev, [donationId]: true }));
    try {
      const updated = await resolveAdminDonation(donationId, { action });
      setDonations((prev) => prev.map((d) => (d.id === donationId ? updated : d)));
      setMessage({
        text: action === 'approve'
          ? `支援 #${donationId} を承認し、Supporterバッジを付与しました！`
          : `支援 #${donationId} を却下しました`,
        type: 'success',
      });
      // Refresh stats
      const statsData = await fetchAdminStats();
      setStats(statsData);
    } catch (err: any) {
      setMessage({ text: err.message || '支援の更新に失敗しました', type: 'error' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [donationId]: false }));
    }
  };

  const handleToggleProfile = async (username: string) => {
    setVisibilityLoading(true);
    try {
      const res = await toggleProfileVisibility(username);
      setMessage({ text: res.message || '公開状態を変更しました', type: 'success' });
      setTargetUsername('');
    } catch (err: any) {
      setMessage({ text: err.message || 'プロフィールの変更に失敗しました', type: 'error' });
    } finally {
      setVisibilityLoading(false);
    }
  };

  const handleToggleServer = async (slug: string) => {
    setVisibilityLoading(true);
    try {
      const res = await toggleServerVisibility(slug);
      setMessage({ text: res.message || '公開状態を変更しました', type: 'success' });
      setTargetSlug('');
    } catch (err: any) {
      setMessage({ text: err.message || 'サーバーの変更に失敗しました', type: 'error' });
    } finally {
      setVisibilityLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-sm">管理者権限を確認中...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">アクセス権限がありません</h2>
        <p className="text-xs text-slate-400 mb-6">
          このページは管理者アカウントのみアクセス可能です。
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
        >
          トップへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-purple-500/20 text-purple-400">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">管理画面 (Admin Dashboard)</h1>
          </div>
          <p className="text-xs text-slate-400">
            コミュニティの安全性維持、通報処理、コンテンツのモデレーションを行います。
          </p>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">ユーザー数</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">{stats.total_users}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">サーバー数</span>
              <Server className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">{stats.total_servers}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">未対応支援</span>
              <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
            </div>
            <p className="text-2xl font-black text-rose-400 font-mono">{stats.pending_donations ?? 0}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">総通報件数</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">{stats.total_reports}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">未対応通報</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono">{stats.pending_reports}</p>
          </div>
        </div>
      )}

      {/* Content Moderation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>ユーザー公開設定の強制切り替え</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            違反報告のあったプロフィールの公開/非公開を切り替えます。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="username (例: spammer123)"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleToggleProfile(targetUsername)}
              disabled={!targetUsername || visibilityLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition flex items-center gap-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>切替</span>
            </button>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            <span>サーバー公開設定の強制切り替え</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            規約違反サーバーの公開/非公開（掲載停止）を切り替えます。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="server slug (例: malicious-server)"
              value={targetSlug}
              onChange={(e) => setTargetSlug(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleToggleServer(targetSlug)}
              disabled={!targetSlug || visibilityLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition flex items-center gap-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>切替</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('donations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'donations'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Heart className="w-4 h-4 fill-current" />
          <span>PayPay支援管理</span>
          {(stats?.pending_donations ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-400 text-rose-950 font-black">
              {stats?.pending_donations}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'reports'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>通報一覧</span>
          {(stats?.pending_reports ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">
              {stats?.pending_reports}
            </span>
          )}
        </button>
      </div>

      {/* Donations Section */}
      {activeTab === 'donations' && (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                <span>PayPay支援申請一覧</span>
              </h2>
              <p className="text-xs text-slate-400">
                送金リンクを確認・受取後、「承認 & Supporterバッジ付与」を実行してください。
              </p>
            </div>

            <div className="flex items-center gap-2">
              {['pending', 'approved', 'rejected', ''].map((st) => (
                <button
                  key={st}
                  onClick={() => setDonationFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    donationFilter === st
                      ? 'bg-rose-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'pending'
                    ? '未対応'
                    : st === 'approved'
                    ? '承認済み'
                    : st === 'rejected'
                    ? '却下'
                    : 'すべて'}
                </button>
              ))}
            </div>
          </div>

          {donations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              該当する支援申請はありません。
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400">#{d.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          d.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : d.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {d.status === 'pending' ? '未対応' : d.status === 'approved' ? '承認済' : '却下'}
                      </span>
                      {d.donor_username ? (
                        <Link
                          to={`/@${d.donor_username}`}
                          target="_blank"
                          className="text-xs font-bold text-rose-400 hover:underline flex items-center gap-1"
                        >
                          <span>@{d.donor_username}</span>
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-slate-300">{d.donor_name} (匿名)</span>
                      )}
                      {d.amount && (
                        <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-white/10 font-mono">
                          ¥{d.amount.toLocaleString()}
                        </span>
                      )}
                      {d.passcode && (
                        <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded font-mono">
                          🔑 パスコード: <span className="text-white font-bold">{d.passcode}</span>
                        </span>
                      )}
                    </div>

                    {d.message && (
                      <p className="text-xs text-slate-300 bg-black/30 p-2.5 rounded-lg mb-2">
                        💬 {d.message}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>申請日時: {new Date(d.created_at).toLocaleString('ja-JP')}</span>
                      {d.resolved_at && (
                        <span>対応日時: {new Date(d.resolved_at).toLocaleString('ja-JP')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
                    <a
                      href={d.paypay_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>PayPayで開く</span>
                    </a>

                    {d.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResolveDonation(d.id, 'approve')}
                          disabled={actionLoading[d.id]}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition flex items-center gap-1"
                          title="受取完了とし、Supporterバッジを付与"
                        >
                          <BadgeCheck className="w-3.5 h-3.5" />
                          <span>承認 & バッジ付与</span>
                        </button>
                        <button
                          onClick={() => handleResolveDonation(d.id, 'reject')}
                          disabled={actionLoading[d.id]}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50 text-slate-400 transition flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>却下</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Section */}
      {activeTab === 'reports' && (
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>通報一覧</span>
            </h2>
            <p className="text-xs text-slate-400">
              ユーザーから送信された違反通報のレビューを行います。
            </p>
          </div>

          <div className="flex items-center gap-2">
            {['pending', 'resolved', 'rejected', ''].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'pending'
                  ? '未対応'
                  : st === 'resolved'
                  ? '解決済み'
                  : st === 'rejected'
                  ? '却下'
                  : 'すべて'}
              </button>
            ))}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            該当する通報はありません。
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs text-slate-400">#{report.id}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white uppercase">
                      {report.target_type}
                    </span>
                    <Link
                      to={
                        report.target_type === 'profile'
                          ? `/@${report.target_id}`
                          : report.target_type === 'server'
                          ? `/server/${report.target_id}`
                          : '#'
                      }
                      target="_blank"
                      className="text-xs font-bold text-purple-400 hover:underline"
                    >
                      {report.target_id}
                    </Link>
                    <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">
                      理由: {report.reason}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        report.status === 'pending'
                          ? 'bg-rose-500/20 text-rose-300'
                          : report.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  {report.description && (
                    <p className="text-xs text-slate-300 leading-relaxed mb-1">
                      {report.description}
                    </p>
                  )}

                  <p className="text-[10px] text-slate-500 font-mono">
                    通報日時: {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {report.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'resolved')}
                      disabled={actionLoading[report.id]}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-500 text-white transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>解決済みにする</span>
                    </button>
                  )}
                  {report.status !== 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'rejected')}
                      disabled={actionLoading[report.id]}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>却下</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
