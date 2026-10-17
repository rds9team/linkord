import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Server, Gamepad2, Heart, Users, Megaphone, Mail } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import { SupportModal } from '../components/SupportModal';

export const Home: React.FC = () => {
  useTitle();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportTab, setSupportTab] = useState<'form' | 'supporters'>('form');

  return (
    <div className="flex flex-col items-center justify-center pt-8 sm:pt-16 pb-20 px-4 max-w-4xl mx-auto text-center relative z-10">
      
      {/* Main Catchphrase */}
      <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight sm:leading-tight mb-6">
        Discordの活動を、<br />
        <span className="text-[#5865F2] dark:text-[#7983f5]">
          ひとつのプロフィールに。
        </span>
      </h1>

      <div className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed space-y-1">
        <p>Discordステータス、Spotify再生、Minecraft戦績、所属コミュニティ、SNSリンクをおしゃれにまとめて簡単プロフィール共有。</p>
        <p>完全無料で誰でも作成できます。</p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-14">
        <Link
          to="/login"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition"
        >
          <span>プロフィールを作成して共有</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/discover"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 border border-slate-300 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:border-white/10 dark:text-white font-bold text-sm transition"
        >
          サーバーを探す
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left mb-12">
        <div className="p-5 rounded-xl bg-white dark:bg-[#13141c] border border-slate-200/90 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/20 transition shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">リアルタイムプレゼンス & BGM</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Lanyard連携でSpotifyの再生状況やDiscordステータスを即時反映。カスタムBGMや背景動画ループも設定可能。
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#13141c] border border-slate-200/90 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/20 transition shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <Gamepad2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Minecraft PlayHive戦績</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            BedWarsやSkyWarsなどの戦績・キルレ・勝利数を公式APIから安全に取得してプロフィールに美しくカード表示。
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#13141c] border border-slate-200/90 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/20 transition shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
            <Server className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">サーバー掲示板・コミュニティ</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Discord招待リンクを入力するだけで簡単掲載。メンバー数の自動同期で新しいコミュニティの発見を促進。
          </p>
        </div>
      </div>

      {/* Support & Advertisement Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
        {/* Support Box */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11131c] border border-slate-200/90 dark:border-white/[0.08] shadow-sm text-center flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3 text-rose-500">
              <Heart className="w-5 h-5 fill-rose-500/20" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1.5">開発・運営の支援</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              支援については <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold select-all">support@linkord.net</span> にご連絡ください。
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSupportTab('form');
                setIsSupportOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>支援案内</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSupportTab('supporters');
                setIsSupportOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>サポーター一覧</span>
            </button>
          </div>
        </div>

        {/* Ad Box */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11131c] border border-slate-200/90 dark:border-white/[0.08] shadow-sm text-center flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-500">
              <Megaphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1.5">広告掲載のご案内</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              広告を掲載したい場合は <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold select-all">ad@linkord.net</span> にご連絡ください。
            </p>
          </div>
          <div>
            <a
              href="mailto:ad@linkord.net?subject=Linkord広告掲載について"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>ad@linkord.net に連絡</span>
            </a>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        defaultTab={supportTab}
      />
    </div>
  );
};
