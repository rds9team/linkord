import React, { useState } from 'react';
import { Search, Flame, Sparkles, Compass, Users, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_SERVERS = [
  {
    id: 1,
    slug: 'rds9-community',
    name: 'RDS9 Community',
    description: '学生エンジニアやMinecraft PvPプレイヤーが集まる公式コミュニティ。Bot開発や雑談も盛んです。',
    members: 1240,
    tags: ['Minecraft', '開発', 'PvP', 'コミュニティ'],
    boosts: 58,
    isOfficial: true,
  },
  {
    id: 2,
    slug: 'japan-pvp-lounge',
    name: 'Japan PvP Lounge',
    description: 'Minecraft Java & BedrockのPvPプレイヤー向け対戦・スクリム募集サーバー。初心者歓迎！',
    members: 890,
    tags: ['Minecraft', 'PvP', 'BedWars'],
    boosts: 34,
    isOfficial: false,
  },
  {
    id: 3,
    slug: 'dev-cafe',
    name: 'Dev Cafe JP',
    description: 'Web開発、Python、TypeScript、Discord Bot開発などを気軽に相談・共有できるプログラミングサーバー。',
    members: 2150,
    tags: ['プログラミング', '開発', 'Bot'],
    boosts: 76,
    isOfficial: false,
  },
];

export const Discover: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'new' | 'minecraft'>('popular');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          サーバー・プロフィールを見つける
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          気になるコミュニティやプレイヤーを発見して、新しいつながりを作ろう。
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="サーバー名、タグ、Minecraft IDで検索..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('popular')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'popular' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>人気ランキング</span>
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'new' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>新着サーバー</span>
        </button>
        <button
          onClick={() => setActiveTab('minecraft')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'minecraft' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Minecraft</span>
        </button>
      </div>

      {/* Servers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_SERVERS.map(server => (
          <div
            key={server.id}
            className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-white text-base shadow-md">
                    {server.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/server/${server.slug}`} className="font-bold text-white hover:text-purple-300 transition text-sm">
                        {server.name}
                      </Link>
                      {server.isOfficial && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                          Official
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{server.members.toLocaleString()} メンバー</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{server.boosts}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">
                {server.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {server.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-white/5">
              <Link
                to={`/server/${server.slug}`}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition text-center"
              >
                詳細を見る
              </Link>
              <a
                href="#"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1"
              >
                <span>参加</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
