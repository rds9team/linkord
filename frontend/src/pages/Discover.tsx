import React, { useState, useEffect } from 'react';
import { Search, Flame, Sparkles, Compass, ExternalLink, Loader2, Plus, Users, User, ArrowRight, Eye, TrendingUp, Radio, PhoneCall, Clock, Headphones, Share2, Filter, Check, Award, Gamepad2, ArrowUpDown } from 'lucide-react';
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

  // Server Filtering States
  const [serverMemberFilter, setServerMemberFilter] = useState<number | undefined>(undefined);
  const [serverLangFilter, setServerLangFilter] = useState<string>('all');
  const [serverMcTagFilter, setServerMcTagFilter] = useState<string>('すべて');

  // User Filtering States
  const [userBadgeFilter, setUserBadgeFilter] = useState<string>('');
  const [userGameFilter, setUserGameFilter] = useState<string>('');
  const [userSortFilter, setUserSortFilter] = useState<string>('recent');

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
          const minMembers = serverMemberFilter && serverMemberFilter > 0 ? serverMemberFilter : undefined;
          const lang = serverLangFilter !== 'all' ? serverLangFilter : undefined;
          const mcTag = activeTab === 'minecraft' && serverMcTagFilter !== 'すべて' ? serverMcTagFilter : undefined;

          const data = await fetchServers({
            tag,
            search: searchTerm || undefined,
            sort: sortParam,
            minMembers,
            language: lang,
            minecraftTags: mcTag,
          });
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
          const data = await searchProfiles({
            q: searchTerm || undefined,
            badge: userBadgeFilter || undefined,
            game: userGameFilter || undefined,
            sort: userSortFilter,
          });
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
  }, [
    mainCategory,
    activeTab,
    searchTerm,
    refreshTrigger,
    serverMemberFilter,
    serverLangFilter,
    serverMcTagFilter,
    userBadgeFilter,
    userGameFilter,
    userSortFilter,
  ]);

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
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>通話を募集する</span>
            </button>
          )}
          {mainCategory === 'servers' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#5865F2] hover:bg-[#4752c4] text-white transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>サーバーを掲載する</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Toggle: Servers vs Users vs Recruitments */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-200/70 dark:bg-white/[0.04] border border-slate-300/80 dark:border-white/10 w-fit mb-6 overflow-x-auto max-w-full">
        <button
          onClick={() => {
            setMainCategory('recruitments');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            mainCategory === 'recruitments'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-300" />
          <span>通話募集</span>
          <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-black">LIVE</span>
        </button>
        <button
          onClick={() => {
            setMainCategory('servers');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            mainCategory === 'servers'
              ? 'bg-[#5865F2] text-white'
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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            mainCategory === 'users'
              ? 'bg-[#5865F2] text-white'
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

      {/* Server Category Tabs & Filters (Servers only) */}
      {mainCategory === 'servers' && (
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setActiveTab('popular')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'popular' ? 'bg-[#5865F2] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>人気ランキング</span>
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'trending' ? 'bg-[#5865F2] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span>急上昇 (ブースト順)</span>
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'new' ? 'bg-[#5865F2] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>新着サーバー</span>
              </button>
              <button
                onClick={() => setActiveTab('minecraft')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'minecraft' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Minecraft</span>
              </button>
            </div>

            {/* Member count & Language filters */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-slate-300">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={serverMemberFilter || 0}
                  onChange={(e) => setServerMemberFilter(Number(e.target.value) || undefined)}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value={0} className="bg-slate-900 text-white">人数: 指定なし</option>
                  <option value={50} className="bg-slate-900 text-white">50人以上</option>
                  <option value={100} className="bg-slate-900 text-white">100人以上</option>
                  <option value={500} className="bg-slate-900 text-white">500人以上</option>
                  <option value={1000} className="bg-slate-900 text-white">1,000人以上</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-slate-300">
                <select
                  value={serverLangFilter}
                  onChange={(e) => setServerLangFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">言語: すべて</option>
                  <option value="ja" className="bg-slate-900 text-white">日本語</option>
                  <option value="en" className="bg-slate-900 text-white">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Minecraft Sub-tags quick filter */}
          {activeTab === 'minecraft' && (
            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-wrap items-center gap-1.5 animate-fadeIn">
              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3" />
                <span>Minecraftタグ:</span>
              </span>
              {[
                'すべて',
                'Java版',
                '統合版(BE)',
                'クロスプレイ',
                'サバイバル',
                '建築',
                'PvP',
                'ミニゲーム',
                'MOD導入',
                '経済/RPG',
              ].map((mcTag) => {
                const isSelected = serverMcTagFilter === mcTag;
                return (
                  <button
                    key={mcTag}
                    type="button"
                    onClick={() => setServerMcTagFilter(mcTag)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-white font-bold shadow-sm'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {mcTag}
                  </button>
                );
              })}
            </div>
          )}
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
                  className="p-5 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-400 dark:hover:border-white/20 transition flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#5865F2] flex items-center justify-center font-extrabold text-white text-base shadow-sm">
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
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 text-[10px] font-bold tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>LIVE VC</span>
                        </span>
                        {r.game_tag && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-white/10">
                            🎮 {r.game_tag}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[10px] font-bold font-mono">
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
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#5865F2]/20 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
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

                  {/* Actions: Join VC Button + X Share Button */}
                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={inviteTarget}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>通話に参加 (Discord)</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                    <button
                      onClick={() => {
                        const tweetText = `【${r.game_tag || '通話'} @${r.target_count}】${r.title}\nサーバー: ${r.server_name}\n\n通話・VC参加はこちら👇`;
                        const shareUrl = `https://linkord.net/discover?type=recruitments`;
                        const hashtags = `Discord募集,${r.game_tag ? r.game_tag.replace(/\s+/g, '') + '募集,' : ''}Linkord`;
                        const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;
                        window.open(xUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
                      title="X (Twitter) でこの通話募集をシェア"
                    >
                      <Share2 className="w-4 h-4 text-sky-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* User Filters (Users only) */}
      {!initialLoading && mainCategory === 'users' && (
        <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Badge Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>バッジ:</span>
              </span>
              {[
                { label: 'すべて', val: '' },
                { label: '認証済み (Authed)', val: 'authed' },
                { label: 'Supporter', val: 'supporter' },
                { label: 'Team', val: 'team' },
                { label: 'Founder', val: 'founder' },
              ].map((b) => {
                const isSelected = userBadgeFilter === b.val;
                return (
                  <button
                    key={b.val}
                    type="button"
                    onClick={() => setUserBadgeFilter(b.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={userSortFilter}
                onChange={(e) => setUserSortFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-white text-xs focus:outline-none cursor-pointer"
              >
                <option value="recent">新着登録順</option>
                <option value="followers">フォロワー数順</option>
              </select>
            </div>
          </div>

          {/* Game Filter */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>プレイゲーム:</span>
            </span>
            {[
              { label: 'すべて', val: '' },
              { label: 'Valorant', val: 'Valorant' },
              { label: 'Apex Legends', val: 'Apex Legends' },
              { label: 'Minecraft', val: 'Minecraft' },
              { label: '原神', val: 'Genshin Impact' },
              { label: 'Overwatch 2', val: 'Overwatch 2' },
            ].map((g) => {
              const isSelected = userGameFilter === g.val;
              return (
                <button
                  key={g.val}
                  type="button"
                  onClick={() => setUserGameFilter(g.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
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
