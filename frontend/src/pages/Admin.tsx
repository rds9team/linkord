import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Server, CheckCircle2, XCircle, Clock, Eye, EyeOff, Search, Loader2, Heart, ExternalLink, BadgeCheck, FileText, Bell, Trash2, Megaphone, Send, Sparkles } from 'lucide-react';
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
  deleteAdminDonation,
  createManualSupporter,
  updateProfileBadges,
  batchUpdateBadges,
  fetchAdminAuditLogs,
  fetchAnnouncements,
  fetchAdminAllAnnouncements,
  toggleAdminAnnouncement,
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  AdminAuditLogItem,
} from '../api/client';
import { AdminStats, ReportItem, DonationItem, AnnouncementItem } from '../types';
import { useTitle } from '../hooks/useTitle';

export const Admin: React.FC = () => {
  useTitle('管理');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'donations' | 'announcements' | 'audit'>('donations');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [donationFilter, setDonationFilter] = useState<string>('');
  const [supporterUsername, setSupporterUsername] = useState('');
  const [supporterDonorName, setSupporterDonorName] = useState('');
  const [supporterAmount, setSupporterAmount] = useState('');
  const [supporterMessage, setSupporterMessage] = useState('');
  const [supporterIsAnonymous, setSupporterIsAnonymous] = useState(false);
  const [addingSupporter, setAddingSupporter] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Manual visibility toggle inputs
  const [targetUsername, setTargetUsername] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  // Badge assignment inputs (supports single or multiple usernames)
  const [badgeUsernames, setBadgeUsernames] = useState('');
  const [badgeType, setBadgeType] = useState<'supporter' | 'team' | 'founder' | 'authed'>('supporter');
  const [badgeAction, setBadgeAction] = useState<boolean>(true);
  const [badgeLoading, setBadgeLoading] = useState(false);


  // Announcements inputs and list
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceContent, setNewAnnounceContent] = useState('');
  const [newAnnounceType, setNewAnnounceType] = useState<'info' | 'update' | 'warning' | 'event'>('info');
  const [newAnnounceLink, setNewAnnounceLink] = useState('');
  const [creatingAnnounce, setCreatingAnnounce] = useState(false);

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const items = await fetchAdminAllAnnouncements(100);
      setAnnouncements(items || []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const adminCheck = await checkAdminAccess();
        if (!adminCheck || !adminCheck.is_admin) {
          setIsAdmin(false);
          return;
        }
        setIsAdmin(true);

        // Fetch dashboard data independently so individual endpoint errors do not revoke admin UI
        try {
          const [statsData, reportsData, donationsData, annData] = await Promise.allSettled([
            fetchAdminStats(),
            fetchAdminReports(statusFilter || undefined),
            fetchAdminDonations(donationFilter || undefined),
            fetchAdminAllAnnouncements(100),
          ]);
          if (statsData.status === 'fulfilled') setStats(statsData.value);
          if (reportsData.status === 'fulfilled') setReports(reportsData.value);
          if (donationsData.status === 'fulfilled') setDonations(donationsData.value);
          if (annData.status === 'fulfilled') setAnnouncements(annData.value);
        } catch (fetchErr: any) {
          console.error('Admin data load warning:', fetchErr);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [statusFilter, donationFilter]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceTitle.trim() || !newAnnounceContent.trim()) {
      setMessage({ text: 'タイトルと本文を入力してください', type: 'error' });
      return;
    }
    try {
      setCreatingAnnounce(true);
      const created = await createAdminAnnouncement({
        title: newAnnounceTitle.trim(),
        content: newAnnounceContent.trim(),
        type: newAnnounceType,
        link_url: newAnnounceLink.trim() || undefined,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setNewAnnounceTitle('');
      setNewAnnounceContent('');
      setNewAnnounceLink('');
      setMessage({ text: '全ユーザー向けにお知らせを配信しました！', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'お知らせの配信に失敗しました', type: 'error' });
    } finally {
      setCreatingAnnounce(false);
    }
  };

  const handleToggleAnnouncement = async (id: number) => {
    try {
      const res = await toggleAdminAnnouncement(id);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: res.is_active } : a))
      );
      setMessage({
        text: res.is_active
          ? `お知らせ #${id} を再公開しました`
          : `お知らせ #${id} を取り下げました（非公開）`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err.message || '公開状態の変更に失敗しました', type: 'error' });
    }
  };

  const handleDeleteAnnouncementHistory = async (id: number) => {
    if (!confirm(`お知らせ #${id} を配信履歴データベースから完全に抹消しますか？\n※この操作は取り消せません。`)) return;
    try {
      await deleteAdminAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setMessage({ text: `お知らせ #${id} の配信履歴を完全に削除しました`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || '履歴の削除に失敗しました', type: 'error' });
    }
  };

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

  const handleAddSupporter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supporterUsername.trim() && !supporterDonorName.trim()) {
      setMessage({ text: 'ユーザー名または表示名を入力してください', type: 'error' });
      return;
    }
    try {
      setAddingSupporter(true);
      const created = await createManualSupporter({
        username: supporterUsername.trim() || undefined,
        donor_name: supporterDonorName.trim() || undefined,
        amount: supporterAmount ? parseInt(supporterAmount, 10) : undefined,
        message: supporterMessage.trim() || undefined,
        is_anonymous: supporterIsAnonymous,
      });
      setDonations((prev) => [created, ...prev]);
      setSupporterUsername('');
      setSupporterDonorName('');
      setSupporterAmount('');
      setSupporterMessage('');
      setSupporterIsAnonymous(false);
      setMessage({
        text: `サポーター「${created.donor_name}」を追加しました！${created.donor_username ? '（Supporterバッジを付与しました）' : ''}`,
        type: 'success',
      });
      const statsData = await fetchAdminStats();
      setStats(statsData);
    } catch (err: any) {
      setMessage({ text: err.message || 'サポーターの追加に失敗しました', type: 'error' });
    } finally {
      setAddingSupporter(false);
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

  const handleDeleteDonation = async (donationId: number) => {
    if (!confirm(`支援申請 #${donationId} を完全に削除しますか？`)) return;
    setActionLoading((prev) => ({ ...prev, [donationId]: true }));
    try {
      await deleteAdminDonation(donationId);
      setDonations((prev) => prev.filter((d) => d.id !== donationId));
      setMessage({ text: `支援申請 #${donationId} を削除しました`, type: 'success' });
      const statsData = await fetchAdminStats();
      setStats(statsData);
    } catch (err: any) {
      setMessage({ text: err.message || '支援の削除に失敗しました', type: 'error' });
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

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const data = await fetchAdminAuditLogs();
      setAuditLogs(data);
    } catch (err: any) {
      setMessage({ text: err.message || '監査ログの取得に失敗しました', type: 'error' });
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleUpdateBadge = async () => {
    const names = badgeUsernames
      .split(/[\n,、]+/)
      .map((s) => s.trim().replace(/^@/, ''))
      .filter(Boolean);
    if (names.length === 0) {
      setMessage({ text: '対象のユーザー名を入力してください', type: 'error' });
      return;
    }
    setBadgeLoading(true);
    try {
      const payload: any = { usernames: names };
      if (badgeType === 'supporter') payload.has_supporter = badgeAction;
      if (badgeType === 'team') payload.has_team = badgeAction;
      if (badgeType === 'founder') payload.has_founder = badgeAction;
      if (badgeType === 'authed') payload.has_discord_authed = badgeAction;

      const res = await batchUpdateBadges(payload);
      let feedback = res.message;
      if (res.not_found_users && res.not_found_users.length > 0) {
        feedback += ` (未検出: ${res.not_found_users.join(', ')})`;
      }
      setMessage({ text: feedback, type: 'success' });
      setBadgeUsernames('');
    } catch (err: any) {
      setMessage({ text: err.message || 'バッジの一括更新に失敗しました', type: 'error' });
    } finally {
      setBadgeLoading(false);
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
            <span className="p-1 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">管理画面 (Admin Dashboard)</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            コミュニティの安全性維持、通報処理、コンテンツのモデレーションを行います。
          </p>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
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
          <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold">ユーザー数</span>
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total_users}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold">サーバー数</span>
              <Server className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total_servers}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold">未対応支援</span>
              <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400 fill-rose-500/20" />
            </div>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{stats.pending_donations ?? 0}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold">総通報件数</span>
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total_reports}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold">未対応通報</span>
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.pending_reports}</p>
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

        {/* Manual Badge Management Card (Batch Support) */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-amber-400" />
              <span>ユーザーバッジの一括付与・剥奪（複数指定対応）</span>
            </h3>
            <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
              複数指定可能
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            対象ユーザーに対して Supporter, Team, Founder, Authed などのバッジを一括付与または一括解除します。複数人を指定する場合はカンマ（,）または改行で区切ってください。
          </p>
          <div className="space-y-3">
            <textarea
              rows={2}
              placeholder="ユーザー名を指定 (例: yuto, user1, user2 または 1行に1人ずつ改行入力)"
              value={badgeUsernames}
              onChange={(e) => setBadgeUsernames(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono resize-y"
            />
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <select
                value={badgeType}
                onChange={(e: any) => setBadgeType(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="supporter">Supporter バッジ</option>
                <option value="team">Team バッジ</option>
                <option value="founder">Founder バッジ</option>
                <option value="authed">Authed バッジ</option>
              </select>
              <select
                value={badgeAction ? 'grant' : 'revoke'}
                onChange={(e) => setBadgeAction(e.target.value === 'grant')}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="grant">一括付与 (True)</option>
                <option value="revoke">一括剥奪 (False)</option>
              </select>
              <button
                onClick={handleUpdateBadge}
                disabled={!badgeUsernames.trim() || badgeLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
              >
                {badgeLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BadgeCheck className="w-3.5 h-3.5" />
                )}
                <span>一括バッジ更新</span>
              </button>
            </div>
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
          <span>サポーター管理</span>
          {donations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-400 text-rose-950 font-black">
              {donations.length}
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

        <button
          onClick={() => {
            setActiveTab('announcements');
            loadAnnouncements();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'announcements'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>お知らせ配信</span>
          {announcements.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-400 text-emerald-950 font-black">
              {announcements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            loadAuditLogs();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>監査ログ</span>
        </button>
      </div>

      {/* Supporters Management Section */}
      {activeTab === 'donations' && (
        <div className="space-y-6 mb-8">
          {/* Manual Supporter Add Form */}
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
              <span>サポーターの追加</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              支援者（サポーター）を手動で追加します。Linkordのユーザー名を指定すると、アカウントに自動でSupporterバッジが付与されます。
            </p>

            <form onSubmit={handleAddSupporter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Linkord ユーザー名 <span className="text-slate-500">（任意）</span>
                  </label>
                  <input
                    type="text"
                    value={supporterUsername}
                    onChange={(e) => setSupporterUsername(e.target.value)}
                    placeholder="例: yuto0926"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">バッジ付与対象のアカウント</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    表示名 <span className="text-slate-500">（未入力時はユーザー名）</span>
                  </label>
                  <input
                    type="text"
                    value={supporterDonorName}
                    onChange={(e) => setSupporterDonorName(e.target.value)}
                    placeholder="例: たろう"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">サポーター一覧に表示する名前</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    支援金額（円） <span className="text-slate-500">（任意）</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={supporterAmount}
                    onChange={(e) => setSupporterAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">支援金額の記録</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  応援メッセージ <span className="text-slate-500">（任意）</span>
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={supporterMessage}
                  onChange={(e) => setSupporterMessage(e.target.value)}
                  placeholder="例: Linkord応援しています！"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={supporterIsAnonymous}
                    onChange={(e) => setSupporterIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-0 focus:outline-none"
                  />
                  <span>サポーター一覧に匿名で表示する</span>
                </label>

                <button
                  type="submit"
                  disabled={addingSupporter}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {addingSupporter ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>追加中...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>サポーターを追加</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Supporters List */}
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>登録済みサポーター一覧 ({donations.length})</span>
            </h2>

            {donations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                登録されているサポーターはありません。
              </div>
            ) : (
              <div className="space-y-3">
                {donations.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-bold text-xs text-white">{d.donor_name}</span>
                        {d.donor_username && (
                          <Link
                            to={`/@${d.donor_username}`}
                            target="_blank"
                            className="text-xs font-semibold text-rose-400 hover:underline"
                          >
                            @{d.donor_username}
                          </Link>
                        )}
                        {d.is_anonymous && (
                          <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded">
                            匿名
                          </span>
                        )}
                        {d.amount && (
                          <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-white/10 font-mono">
                            ¥{d.amount.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {d.message && (
                        <p className="text-xs text-slate-300 bg-black/30 p-2.5 rounded-lg mb-2">
                          💬 {d.message}
                        </p>
                      )}

                      <div className="text-[11px] text-slate-500">
                        登録日時: {new Date(d.created_at).toLocaleString('ja-JP')}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        onClick={() => handleDeleteDonation(d.id)}
                        disabled={actionLoading[d.id]}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 transition flex items-center gap-1 cursor-pointer"
                        title="サポーターを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>削除</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* Audit Logs Section */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>管理者操作ログ（監査ログ）</span>
              </h2>
              <p className="text-xs text-slate-400">
                管理者が実行した操作（バッジ付与、公開停止、支援承認など）の履歴です。
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              disabled={loadingAudit}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>更新</span>
            </button>
          </div>

          {loadingAudit ? (
            <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-xs">ログを読み込み中...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">まだ操作履歴がありません</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono">
                        {log.action}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {log.target_type}: <strong className="text-white">{log.target_id}</strong>
                      </span>
                      {log.admin_username && (
                        <span className="text-slate-500 text-[10px]">
                          by @{log.admin_username}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-slate-300 font-mono bg-black/30 px-2 py-1 rounded border border-white/5 truncate max-w-xl">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Announcements Section */}
      {activeTab === 'announcements' && (
        <div className="space-y-6 mb-8">
          {/* Create Announcement Form */}
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-400" />
              <span>全ユーザー向けお知らせの新規作成 & 配信</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              ここで配信したお知らせは、全ユーザーのヘッダー通知ベル（通知ボックス）にリアルタイムで届きます。
            </p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    タイトル <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: v1.2 アップデートのお知らせ"
                    value={newAnnounceTitle}
                    onChange={(e) => setNewAnnounceTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    種別
                  </label>
                  <select
                    value={newAnnounceType}
                    onChange={(e) => setNewAnnounceType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="info">お知らせ (Info)</option>
                    <option value="update">アップデート (Update)</option>
                    <option value="warning">重要 (Warning)</option>
                    <option value="event">イベント (Event)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  詳細リンクURL (任意)
                </label>
                <input
                  type="url"
                  placeholder="https://linkord.net/..."
                  value={newAnnounceLink}
                  onChange={(e) => setNewAnnounceLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  本文 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="お知らせの本文を入力してください..."
                  value={newAnnounceContent}
                  onChange={(e) => setNewAnnounceContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-y"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingAnnounce || !newAnnounceTitle.trim() || !newAnnounceContent.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {creatingAnnounce ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>全ユーザーへお知らせを配信する</span>
                </button>
              </div>
            </form>
          </div>

          {/* Announcements History */}
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>配信済みお知らせ一覧 ({announcements.length}件)</span>
            </h3>

            {loadingAnnouncements ? (
              <div className="text-center py-10 text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span className="text-xs">お知らせを読み込み中...</span>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">まだ配信されたお知らせはありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          #{item.id}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                          {item.type}
                        </span>
                        {item.is_active !== false ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            公開中
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            取り下げ済み (非公開)
                          </span>
                        )}
                        <h4 className={`text-xs font-bold ${item.is_active !== false ? 'text-white' : 'text-slate-400 line-through'}`}>
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {item.content}
                      </p>
                      {item.link_url && (
                        <a
                          href={item.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:underline"
                        >
                          <span>{item.link_url}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.created_at).toLocaleString('ja-JP')}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* お知らせ削除 (取り下げ / 再公開) */}
                        <button
                          type="button"
                          onClick={() => handleToggleAnnouncement(item.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                            item.is_active !== false
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                          title={item.is_active !== false ? '全ユーザーへの公開を取り下げます（履歴は保持）' : '再公開します'}
                        >
                          {item.is_active !== false ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>お知らせ取り下げ</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>再公開</span>
                            </>
                          )}
                        </button>

                        {/* 履歴削除 (DB完全抹消) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncementHistory(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="配信履歴データベースから完全に抹消します"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>履歴削除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
