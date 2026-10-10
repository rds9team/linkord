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

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">リアルタイムプレゼンス</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lanyard連携でSpotifyの再生楽曲やDiscordのオンライン状態を自動反映。
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Minecraft PlayHive戦績</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            BedWarsやSkyWarsなどの戦績・キルレ・勝利数をプロフィールに美しくカード表示。
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
            <Server className="w-5 h-5 text-sky-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">サーバー掲示板・ブースト</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            自分のDiscordサーバーを登録して宣伝。1時間ごとのブーストでランキング上位へ。
          </p>
        </div>
      </div>

      {/* Support Box */}
      <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-purple-900/20 to-sky-900/20 border border-purple-500/20 max-w-xl mx-auto">
        <Heart className="w-6 h-6 text-rose-400 mx-auto mb-2" />
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Linkordのドメイン代・サーバー代などの維持にご協力ください。支援は任意で、支援しなくてもすべての基本機能を利用できます。
        </p>
        <span className="text-[11px] font-semibold text-purple-300">PayPay送金リンクによる開発支援を受け付けています</span>
      </div>

    </div>
  );
};
