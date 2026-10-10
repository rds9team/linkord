import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Server, CheckCircle2, XCircle, Clock, Eye, EyeOff, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  checkAdminAccess,
  fetchAdminStats,
  fetchAdminReports,
  updateAdminReport,
  toggleProfileVisibility,
  toggleServerVisibility,
} from '../api/client';
import { AdminStats, ReportItem } from '../types';

export const Admin: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
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

        const [statsData, reportsData] = await Promise.all([
          fetchAdminStats(),
          fetchAdminReports(statusFilter || undefined),
        ]);
        setStats(statsData);
        setReports(reportsData);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [statusFilter]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <span className="text-xs font-semibold">総通報件数</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">{stats.total_reports}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">未対応通報</span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 font-mono">{stats.pending_reports}</p>
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

      {/* Reports Section */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
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
    </div>
  );
};
