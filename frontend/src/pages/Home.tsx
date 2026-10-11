import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Server, Gamepad2, Heart } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

export const Home: React.FC = () => {
  useTitle();
  return (
    <div className="flex flex-col items-center justify-center pt-8 sm:pt-16 pb-20 px-4 max-w-4xl mx-auto text-center relative z-10">
      
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>無料のDiscordプロフィール＆サーバーポータル</span>
      </div>

      {/* Main Catchphrase */}
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-tight mb-6">
        Discordの活動を、<br />
        <span className="bg-gradient-to-r from-purple-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
          ひとつのプロフィールに。
        </span>
      </h1>

      <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
        Discordのリアルタイムステータス、Minecraftの戦績、所属サーバー、SNSリンクをスタイリッシュにまとめよう。完全無料で誰でも利用できます。
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-16">
        <Link
          to="/login"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition"
        >
          <span>今すぐプロフィールを作成</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/discover"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition"
        >
          サーバーを探す
        </Link>
      </div>

      {/* Live guns.lol Style Interactive Preview Card */}
      <div className="w-full max-w-lg mb-16 p-1 rounded-3xl bg-gradient-to-b from-purple-500/20 via-sky-500/10 to-transparent shadow-2xl shadow-purple-900/30">
        <div className="rounded-[26px] p-6 bg-slate-900/80 border border-white/10 backdrop-blur-2xl text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl pointer-events-none"></div>

          {/* Banner */}
          <div className="h-20 -mx-6 -mt-6 mb-4 bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-sky-900/60 relative overflow-hidden flex items-center justify-end px-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300/80 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
              guns.lol inspired style
            </span>
          </div>

          <div className="flex items-center gap-3.5 -mt-8 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 border-2 border-white/20 shadow-lg flex items-center justify-center text-white font-extrabold text-2xl">
                L
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Online"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white">Linkord Creator</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">Founder</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-semibold">Authed</span>
              </div>
              <p className="font-mono text-xs text-slate-400">@linkord_official</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            ようこそLinkordへ！リアルタイムなDiscordステータスや音楽、PlayHiveの戦績、動画背景を自由にカスタマイズ。
          </p>

          {/* Spotify & Presence Mock Widget */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Listening to Spotify</div>
                <div className="text-xs text-white font-semibold truncate">Cybernetic Dreams &middot; Neo Tokyo</div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 whitespace-nowrap bg-white/5 px-2 py-1 rounded-md">
              01:42 / 03:20
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left mb-12">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:border-purple-500/30 transition group">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">リアルタイムプレゼンス & BGM</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lanyard連携でSpotifyの再生状況やDiscordステータスを即時反映。カスタムBGMや背景動画ループも設定可能。
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:border-emerald-500/30 transition group">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Minecraft PlayHive戦績</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            BedWarsやSkyWarsなどの戦績・キルレ・勝利数を公式APIから安全に取得してプロフィールに美しくカード表示。
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:border-sky-500/30 transition group">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Server className="w-5 h-5 text-sky-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">サーバー掲示板・ブースト</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Discord招待リンクを入力するだけで簡単掲載。ワンクリックのメンバー数同期や1時間ごとのブーストで発見を促進。
          </p>
        </div>
      </div>

      {/* Support Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/20 to-sky-900/20 border border-purple-500/20 max-w-xl mx-auto w-full">
        <Heart className="w-6 h-6 text-rose-400 mx-auto mb-2" />
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Linkordのドメイン代・サーバー代などの維持にご協力ください。支援は任意で、支援しなくてもすべての基本機能を利用できます。
        </p>
        <span className="text-[11px] font-semibold text-purple-300">PayPay送金リンクによる開発支援を受け付けています</span>
      </div>

    </div>
  );
};
