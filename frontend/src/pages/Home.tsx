import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import { SupportModal } from '../components/SupportModal';
import { fetchServers } from '../api/client';
import { resolveMediaUrl } from '../utils/media';
import { ServerData } from '../types';

const FEATURES = [
  {
    title: 'ステータスとBGM',
    body: 'Lanyard連携で、Discordのステータスや Spotify の再生中の曲がそのまま表示されます。BGMや背景動画も設定できます。',
  },
  {
    title: 'PlayHive の戦績',
    body: 'BedWars・SkyWars などのキル数や勝率を公式APIから取得して、プロフィールに載せられます。',
  },
  {
    title: 'サーバー掲載',
    body: '招待リンクを貼るだけで掲載できます。メンバー数やアイコンは自動で更新されます。',
  },
];

export const Home: React.FC = () => {
  useTitle();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportTab, setSupportTab] = useState<'form' | 'supporters'>('form');
  const [servers, setServers] = useState<ServerData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchServers({ sort: 'popular' })
      .then((res) => {
        if (!cancelled) setServers(res.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setServers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openSupport = (tab: 'form' | 'supporters') => {
    setSupportTab(tab);
    setIsSupportOpen(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-10 sm:pt-20 pb-20 relative z-10">

      {/* Hero */}
      <section className="max-w-2xl">
        <h1 className="text-[2rem] leading-[1.25] sm:text-5xl sm:leading-[1.2] font-extrabold tracking-tight text-slate-900 dark:text-white mb-5">
          Discordの自分を、<br />
          1ページで見せる。
        </h1>
        <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
          ステータス、聴いている曲、マイクラの戦績、SNSのリンク、入っているサーバー。
          Linkord なら <span className="font-mono text-slate-800 dark:text-slate-200">linkord.net/@あなた</span> にまとめておけます。
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/login"
            className="px-5 py-3 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <span>Discordではじめる</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/discover"
            className="px-5 py-3 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 font-semibold text-sm flex items-center justify-center transition"
          >
            サーバーを探す
          </Link>
        </div>
      </section>

      {/* Listed servers (real content instead of a feature grid) */}
      <section className="mt-16 sm:mt-24">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">掲載中のサーバー</h2>
          <Link to="/discover" className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
            すべて見る
          </Link>
        </div>

        {servers === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-lg bg-slate-200/60 dark:bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <p className="text-sm text-slate-500">まだ掲載されているサーバーはありません。</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {servers.map((srv) => (
              <li key={srv.id}>
                <Link
                  to={`/server/${srv.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/15 transition"
                >
                  {srv.icon_url ? (
                    <img
                      src={resolveMediaUrl(srv.icon_url)}
                      alt=""
                      loading="lazy"
                      className="w-11 h-11 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-white/5"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg shrink-0 bg-slate-200 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                      {srv.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{srv.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {srv.member_count.toLocaleString()} メンバー
                      {srv.description ? ` · ${srv.description}` : ''}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* What you can do */}
      <section className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
        {FEATURES.map((f) => (
          <div key={f.title} className="border-t border-slate-200 dark:border-white/10 pt-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Support / ads: one quiet line instead of two hero-sized cards */}
      <section className="mt-16 sm:mt-24 pt-6 border-t border-slate-200 dark:border-white/10 text-[13px] text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
        <span>Linkord は無料で使えます。運営を応援していただける方はこちらから。</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => openSupport('form')}
            className="font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            支援する
          </button>
          <button
            type="button"
            onClick={() => openSupport('supporters')}
            className="font-semibold text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
          >
            サポーター一覧
          </button>
          <a
            href="mailto:ad@linkord.net?subject=Linkord広告掲載について"
            className="font-semibold text-slate-700 dark:text-slate-300 hover:underline"
          >
            広告掲載のお問い合わせ
          </a>
        </div>
      </section>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        defaultTab={supportTab}
      />
    </div>
  );
};
