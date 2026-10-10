import React, { useState, useEffect } from 'react';
import { Search, Flame, Sparkles, Compass, ExternalLink, Loader2, Plus, Users, User, ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchServers, searchProfiles } from '../api/client';
import { ServerData, ProfileSearchResult } from '../types';
import { CreateServerModal } from '../components/CreateServerModal';
import { Badges } from '../components/Badges';

const FALLBACK_SERVERS: ServerData[] = [
  {
    id: 1,
    slug: 'rds9-community',
    name: 'RDS9 Community',
    description: '学生エンジニアやMinecraft PvPプレイヤーが集まる公式コミュニティ。Bot開発や雑談も盛んです。',
    member_count: 1240,
    tags: 'Minecraft, 開発, PvP, コミュニティ',
    language: 'ja',
    invite_url: 'https://discord.gg/example1',
    is_public: true,
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 2,
    slug: 'japan-pvp-lounge',
    name: 'Japan PvP Lounge',
    description: 'Minecraft Java & BedrockのPvPプレイヤー向け対戦・スクリム募集サーバー。初心者歓迎！',
    member_count: 890,
    tags: 'Minecraft, PvP, BedWars',
    language: 'ja',
    invite_url: 'https://discord.gg/example2',
    is_public: true,
    created_at: '2026-10-02T00:00:00Z',
  },
  {
    id: 3,
    slug: 'dev-cafe',
    name: 'Dev Cafe JP',
    description: 'Web開発、Python、TypeScript、Discord Bot開発などを気軽に相談・共有できるプログラミングサーバー。',
    member_count: 2150,
    tags: 'プログラミング, 開発, Bot',
    language: 'ja',
    invite_url: 'https://discord.gg/example3',
    is_public: true,
    created_at: '2026-10-03T00:00:00Z',
  },
];

export const Discover: React.FC = () => {
  const [mainCategory, setMainCategory] = useState<'servers' | 'users'>('servers');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'new' | 'minecraft'>('popular');
  const [servers, setServers] = useState<ServerData[]>(FALLBACK_SERVERS);
  const [users, setUsers] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (mainCategory === 'servers') {
      const loadServers = async () => {
        try {
          setLoading(true);
          const tag = activeTab === 'minecraft' ? 'Minecraft' : undefined;
          const data = await fetchServers(tag, searchTerm || undefined);
          if (isMounted) {
            if (data && data.length > 0) {
              setServers(data);
            } else {
              setServers(searchTerm ? [] : FALLBACK_SERVERS);
            }
          }
        } catch {
          if (isMounted) {
            let filtered = FALLBACK_SERVERS;
            if (activeTab === 'minecraft') {
              filtered = filtered.filter(s => s.tags.includes('Minecraft'));
            }
            if (searchTerm) {
              const term = searchTerm.toLowerCase();
              filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(term) ||
                (s.description && s.description.toLowerCase().includes(term)) ||
                s.tags.toLowerCase().includes(term)
              );
            }
            setServers(filtered);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      const timer = setTimeout(loadServers, 300);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      const loadUsers = async () => {
        try {
          setLoading(true);
          const data = await searchProfiles(searchTerm || undefined);
          if (isMounted) {
            setUsers(data || []);
          }
        } catch {
          if (isMounted) {
            setUsers([]);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      const timer = setTimeout(loadUsers, 300);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [mainCategory, activeTab, searchTerm, refreshTrigger]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            見つける・探す
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            気になるコミュニティやプレイヤーを発見して、新しいつながりを作ろう。
          </p>
        </div>
        {mainCategory === 'servers' && (
          <div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>サーバーを掲載する</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Mode Toggle: Servers vs Users */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 w-fit mb-6">
        <button
          onClick={() => {
            setMainCategory('servers');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
            mainCategory === 'servers'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Discord サーバー</span>
        </button>
        <button
          onClick={() => {
            setMainCategory('users');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
            mainCategory === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ユーザー</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={mainCategory === 'servers' ? 'サーバー名、タグ、キーワードで検索...' : 'ユーザー名、表示名、自己紹介で検索...'}
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
        />
      </div>

      {/* Server Category Tabs (Servers only) */}
      {mainCategory === 'servers' && (
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
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      )}

      {/* Main Content */}
      {!loading && mainCategory === 'servers' && (
        servers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            該当するサーバーが見つかりませんでした。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servers.map(server => {
              const tagsList = server.tags.split(',').map(t => t.trim()).filter(Boolean);
              const isOfficial = server.slug === 'rds9-community';

              return (
                <div
                  key={server.id}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-white text-base shadow-md">
                          {server.icon_url ? (
                            <img src={server.icon_url} alt={server.name} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            server.name.substring(0, 2)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link to={`/server/${server.slug}`} className="font-bold text-white hover:text-purple-300 transition text-sm">
                              {server.name}
                            </Link>
                            {isOfficial && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                                Official
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{server.member_count.toLocaleString()} メンバー</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{server.boosts_count !== undefined ? server.boosts_count : 0}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">
                      {server.description || '説明はありません'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tagsList.map(tag => (
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
                      href={server.invite_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1"
                    >
                      <span>参加</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {!loading && mainCategory === 'users' && (
        users.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            該当するユーザーが見つかりませんでした。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => (
              <Link
                key={u.username}
                to={`/@${u.username}`}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/30 hover:bg-white/[0.05] transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#21262d] border border-white/10 flex-shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-white text-base bg-gradient-to-tr from-purple-600 to-indigo-600">
                          {u.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm group-hover:text-purple-300 transition truncate">
                          {u.display_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                      <div className="mt-1">
                        <Badges
                          hasDiscordAuthed={u.has_discord_authed}
                          hasFounder={u.has_founder}
                          hasTeam={u.has_team}
                          hasSupporter={u.has_supporter}
                        />
                      </div>
                    </div>
                  </div>

                  {u.bio && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                      {u.bio}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{u.followers_count || 0}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      <span>{u.views_count || 0}</span>
                    </span>
                  </div>
                  <span className="text-purple-400 group-hover:translate-x-0.5 transition flex items-center gap-0.5 text-xs font-sans font-semibold">
                    詳細 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Create Server Modal */}
      <CreateServerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

    </div>
  );
};
