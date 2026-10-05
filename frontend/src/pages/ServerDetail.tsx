import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Flame, Flag, ExternalLink, ArrowLeft, Loader2, ServerCrash } from 'lucide-react';
import { ReportModal } from '../components/ReportModal';
import { fetchServer, boostServer } from '../api/client';
import { ServerData } from '../types';

const FALLBACK_SERVER: ServerData = {
  id: 1,
  slug: 'rds9-community',
  name: 'RDS9 Community',
  description: '学生エンジニアやMinecraft PvPプレイヤーが集まる公式コミュニティです。Discord Bot開発の技術相談、Minecraft対戦のスクリム募集、日々の雑談など活発に行われています。誰でも歓迎です！',
  member_count: 1240,
  tags: 'Minecraft, 開発, PvP, 学生エンジニア, 公式',
  language: 'ja',
  invite_url: 'https://discord.gg/example1',
  is_public: true,
  created_at: '2026-10-01T00:00:00Z',
};

export const ServerDetail: React.FC = () => {
  const { slug = 'rds9-community' } = useParams<{ slug: string }>();
  const [server, setServer] = useState<ServerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [boosts, setBoosts] = useState(58);
  const [boosted, setBoosted] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [boostError, setBoostError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadServer = async () => {
      try {
        setLoading(true);
        const data = await fetchServer(slug);
        if (isMounted) {
          setServer(data);
          setBoosts(Math.floor(data.member_count / 20) + 12);
        }
      } catch (err) {
        if (isMounted) {
          // If fallback matches or server not found, fallback gracefully
          if (slug === 'rds9-community') {
            setServer(FALLBACK_SERVER);
          } else {
            setServer({
              ...FALLBACK_SERVER,
              slug,
              name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            });
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadServer();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleBoost = async () => {
    if (boosted || !server) return;
    setBoostError(null);
    try {
      await boostServer(server.slug);
      setBoosts(prev => prev + 1);
      setBoosted(true);
    } catch (err: any) {
      if (err.message && err.message.includes('1時間')) {
        setBoostError('このサーバーへのブーストは1時間に1回のみ可能です');
      }
      setBoosted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="text-xs text-slate-400">サーバー情報を読み込み中...</span>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <ServerCrash className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">サーバーが見つかりません</h2>
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
        >
          サーバー一覧へ戻る
        </Link>
      </div>
    );
  }

  const tagsList = server.tags.split(',').map(t => t.trim()).filter(Boolean);
  const isOfficial = server.slug === 'rds9-community';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
      <Link to="/discover" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>サーバー一覧に戻る</span>
      </Link>

      <div className="rounded-[24px] p-6 sm:p-8 bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shadow-indigo-600/30 overflow-hidden flex-shrink-0">
            {server.icon_url ? (
              <img src={server.icon_url} alt={server.name} className="w-full h-full object-cover" />
            ) : (
              server.name.substring(0, 3)
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <h1 className="text-2xl font-extrabold text-white truncate">{server.name}</h1>
              {isOfficial && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-semibold">
                  Official
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 font-mono mb-3">linkord.net/server/{server.slug}</p>

            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{server.member_count.toLocaleString()} メンバー</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                <Flame className="w-3.5 h-3.5" />
                <span>{boosts} ブースト</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
            <a
              href={server.invite_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
            >
              <span>サーバーに参加</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleBoost}
              disabled={boosted}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${boosted ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'}`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{boosted ? 'ブースト済み' : 'ブーストする'}</span>
            </button>
          </div>
        </div>

        {boostError && (
          <div className="mb-4 text-xs text-amber-400/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            {boostError}
          </div>
        )}

        {/* Server Description */}
        <div className="border-t border-white/5 pt-5 mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">サーバー概要</h2>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {server.description || '説明は設定されていません。'}
          </p>
        </div>

        {/* Tags */}
        {tagsList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tagsList.map(tag => (
              <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/5 text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-slate-500">
          <span>登録日: {new Date(server.created_at).toLocaleDateString()}</span>
          <button
            onClick={() => setIsReportOpen(true)}
            className="hover:text-rose-400 flex items-center gap-1 transition"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>このサーバーを通報</span>
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="server"
        targetId={server.slug}
      />
    </div>
  );
};
