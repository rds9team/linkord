import React, { useState, useEffect } from 'react';
import { Search, Flame, Sparkles, Compass, ExternalLink, Loader2, Plus, Users, User, ArrowRight, Eye, TrendingUp, Radio, PhoneCall, Clock, Headphones } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchServers, searchProfiles, fetchVoiceRecruitments } from '../api/client';
import { ServerData, ProfileSearchResult, VoiceRecruitmentItem } from '../types';
import { CreateServerModal } from '../components/CreateServerModal';
import { CreateRecruitmentModal } from '../components/CreateRecruitmentModal';
import { Badges } from '../components/Badges';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../context/AuthContext';

export const Discover: React.FC = () => {
  useTitle('発見');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlType = searchParams.get('type') as 'servers' | 'users' | 'recruitments' | null;
  const urlTab = searchParams.get('tab') as 'popular' | 'trending' | 'new' | 'minecraft' | null;
  const urlQuery = searchParams.get('q') || '';

  const [mainCategory, setMainCategoryState] = useState<'servers' | 'users' | 'recruitments'>(() => {
    return urlType || (sessionStorage.getItem('linkord_discover_type') as any) || 'servers';
  });
  const [searchTerm, setSearchTermState] = useState(urlQuery);
  const [activeTab, setActiveTabState] = useState<'popular' | 'trending' | 'new' | 'minecraft'>(() => {
    return urlTab || 'popular';
  });

  const setMainCategory = (cat: 'servers' | 'users' | 'recruitments') => {
    setMainCategoryState(cat);
    sessionStorage.setItem('linkord_discover_type', cat);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', cat);
    setSearchParams(nextParams, { replace: true });
  };

  const setActiveTab = (tab: 'popular' | 'trending' | 'new' | 'minecraft') => {
    setActiveTabState(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  const setSearchTerm = (term: string) => {
    setSearchTermState(term);
    const nextParams = new URLSearchParams(searchParams);
    if (term.trim()) {
      nextParams.set('q', term.trim());
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const [servers, setServers] = useState<ServerData[]>([]);
  const [users, setUsers] = useState<ProfileSearchResult[]>([]);
  const [recruitments, setRecruitments] = useState<VoiceRecruitmentItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRecruitmentModalOpen, setIsRecruitmentModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsSearching(true);

    if (mainCategory === 'servers') {
      const loadServers = async () => {
        try {
          const tag = activeTab === 'minecraft' ? 'Minecraft' : undefined;
          const sortParam = activeTab === 'trending' ? 'boost' : activeTab === 'new' ? 'new' : 'popular';
          const data = await fetchServers(tag, searchTerm || undefined, sortParam);
          if (isMounted) {
            setServers(data || []);
          }
        } catch {
          if (isMounted) {
            setServers([]);
          }
        } finally {
          if (isMounted) {
            setIsSearching(false);
            setInitialLoading(false);
          }
        }
      };

      const timer = setTimeout(loadServers, 250);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else if (mainCategory === 'recruitments') {
      const loadRecruitments = async () => {
        try {
          const data = await fetchVoiceRecruitments(searchTerm || undefined);
          if (isMounted) {
            setRecruitments(data || []);
          }
        } catch {
          if (isMounted) {
            setRecruitments([]);
          }
        } finally {
          if (isMounted) {
            setIsSearching(false);
            setInitialLoading(false);
          }
        }
      };

      const timer = setTimeout(loadRecruitments, 250);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      const loadUsers = async () => {
        try {
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
            setIsSearching(false);
            setInitialLoading(false);
          }
        }
      };

      const timer = setTimeout(loadUsers, 250);
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            {mainCategory === 'recruitments' ? '通話・ボイスチャット募集' : '見つける・探す'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {mainCategory === 'recruitments'
              ? '今すぐ参加できる通話やゲーム相手を募集！気になるVCに直接飛び込もう。'
              : '気になるコミュニティやプレイヤーを発見して、新しいつながりを作ろう。'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mainCategory === 'recruitments' && (
            <button
              onClick={() => setIsRecruitmentModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-rose-500/20 whitespace-nowrap cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>通話を募集する</span>
            </button>
          )}
          {mainCategory === 'servers' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>サーバーを掲載する</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Toggle: Servers vs Users vs Recruitments */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-white/[0.04] border border-slate-300/80 dark:border-white/10 w-fit mb-6 overflow-x-auto max-w-full">
        <button
          onClick={() => {
            setMainCategory('recruitments');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            mainCategory === 'recruitments'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>通話募集</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-black">LIVE</span>
        </button>
        <button
          onClick={() => {
            setMainCategory('servers');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            mainCategory === 'servers'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            mainCategory === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ユーザー</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={
            mainCategory === 'recruitments'
              ? 'ゲーム名、募集タイトルで検索 (例: Valorant, 雑談, マイクラ)...'
              : mainCategory === 'servers'
              ? 'サーバー名、タグ、キーワードで検索...'
              : 'ユーザー名、表示名、自己紹介で検索...'
          }
          className="w-full pl-12 pr-11 py-3 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 transition shadow-sm"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Server Category Tabs (Servers only) */}
      {mainCategory === 'servers' && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'popular' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>人気ランキング</span>
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'trending' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>急上昇 (ブースト順)</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'new' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>新着サーバー</span>
          </button>
          <button
            onClick={() => setActiveTab('minecraft')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'minecraft' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Minecraft</span>
          </button>
        </div>
      )}

      {/* Initial Loading indicator */}
      {initialLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      )}

      {/* Main Content */}
      {!initialLoading && mainCategory === 'servers' && (
        servers.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3 text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {searchTerm ? '一致するサーバーが見つかりませんでした' : '掲載中のサーバーはまだありません'}
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              あなたのコミュニティやMinecraftサーバーをLinkordに掲載して、新しいメンバーを募集しましょう！
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>サーバーを掲載する</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servers.map(server => {
              const tagsList = server.tags.split(',').map(t => t.trim()).filter(Boolean);
              const isOfficial = server.slug === 'rds9-community';

              return (
                <div
                  key={server.id}
                  className="p-5 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-purple-400/40 dark:hover:border-white/15 transition flex flex-col justify-between shadow-sm"
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
                            <Link to={`/server/${server.slug}`} className="font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-300 transition text-sm">
                              {server.name}
                            </Link>
                            {isOfficial && (
                              <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                                Official
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{server.member_count.toLocaleString()} メンバー</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-mono text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{server.boosts_count !== undefined ? server.boosts_count : 0}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-2">
                      {server.description || '説明はありません'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tagsList.map(tag => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                    <Link
                      to={`/server/${server.slug}`}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition text-center"
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

      {/* Recruitments Grid */}
      {!initialLoading && mainCategory === 'recruitments' && (
        recruitments.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3 text-rose-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              現在進行中の通話募集はありません
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              あなたのDiscordサーバーでVC通話やゲーム仲間を募集してみましょう！参加者は直接Discordに流入します。
            </p>
            <button
              onClick={() => setIsRecruitmentModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-bold text-xs transition shadow-lg shadow-rose-500/20 cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>通話募集を開始する</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recruitments.map((r) => {
              const inviteTarget = r.voice_channel_url || r.server_invite_url;

              return (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-rose-500/40 dark:hover:border-rose-500/30 transition flex flex-col justify-between shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/20 transition" />

                  <div>
                    {/* Top Bar: Live Badge, Game Tag, Target count */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span>LIVE VC</span>
                        </span>
                        {r.game_tag && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-white/10">
                            🎮 {r.game_tag}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold font-mono">
                        @{r.target_count} 名募集
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-rose-400 transition">
                      {r.title}
                    </h3>

                    {/* Server Info */}
                    <Link
                      to={`/server/${r.server_slug}`}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] hover:bg-slate-200/80 dark:hover:bg-white/[0.06] transition mb-4 border border-slate-200/60 dark:border-white/5"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-purple-600/20 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                        {r.server_icon_url ? (
                          <img src={r.server_icon_url} alt={r.server_name} className="w-full h-full object-cover" />
                        ) : (
                          r.server_name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {r.server_name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          主催: {r.user_display_name}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>

                  {/* Join VC Button -> Direct Discord Server Inflow */}
                  <div className="pt-2">
                    <a
                      href={inviteTarget}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-98 cursor-pointer"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>今すぐ通話に参加する (Discordを開く)</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Users Grid */}
      {!initialLoading && mainCategory === 'users' && (
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
                className="p-4 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-purple-400/40 dark:hover:border-purple-500/30 hover:bg-white dark:hover:bg-white/[0.05] transition flex flex-col justify-between shadow-sm group"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#21262d] border border-slate-200 dark:border-white/10 flex-shrink-0">
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
                        <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-300 transition truncate">
                          {u.display_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center font-mono">
                        <span>@{u.username}</span>
                        {u.tag && <span className="text-purple-600 dark:text-purple-400 font-semibold opacity-90">#{u.tag}</span>}
                      </p>
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
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3">
                      {u.bio}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 font-mono">
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

      {/* Create Recruitment Modal */}
      <CreateRecruitmentModal
        isOpen={isRecruitmentModalOpen}
        onClose={() => setIsRecruitmentModalOpen(false)}
        myServers={servers}
        onCreated={() => {
          setRefreshTrigger(prev => prev + 1);
        }}
      />

    </div>
  );
};
