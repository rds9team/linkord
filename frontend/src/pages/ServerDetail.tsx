import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Flame, Flag, ExternalLink, ArrowLeft, Shield } from 'lucide-react';
import { ReportModal } from '../components/ReportModal';

export const ServerDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [boosts, setBoosts] = useState(58);
  const [boosted, setBoosted] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleBoost = () => {
    if (!boosted) {
      setBoosts(prev => prev + 1);
      setBoosted(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
      <Link to="/discover" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>サーバー一覧に戻る</span>
      </Link>

      <div className="rounded-[24px] p-6 sm:p-8 bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shadow-indigo-600/30">
            RDS
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <h1 className="text-2xl font-extrabold text-white">RDS9 Community</h1>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-semibold">
                Official
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-3">linkord.net/server/{slug}</p>

            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>1,240 メンバー</span>
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
              href="#"
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

        {/* Server Description */}
        <div className="border-t border-white/5 pt-5 mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">サーバー概要</h2>
          <p className="text-sm text-slate-200 leading-relaxed">
            学生エンジニアやMinecraft PvPプレイヤーが集まる公式コミュニティです。Discord Bot開発の技術相談、Minecraft対戦のスクリム募集、日々の雑談など活発に行われています。誰でも歓迎です！
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['Minecraft', '開発', 'PvP', '学生エンジニア', '公式'].map(tag => (
            <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/5 text-slate-300">
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-slate-500">
          <span>最終更新: 2026/10/05</span>
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
        targetId={slug || ''}
      />
    </div>
  );
};
