import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative z-10 text-slate-200">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>トップページに戻る</span>
      </Link>

      <div className="p-8 sm:p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-8">
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-2.5 text-purple-400 mb-2">
            <ShieldCheck className="w-6 h-6" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              利用規約
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            制定日: 2026年10月5日 / 最終更新: 2026年10月7日
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-purple-500 pl-3">
            第1条（総則・適用）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            本利用規約（以下「本規約」）は、RDS9 Team（以下「当運営」）が提供する「Linkord」（以下「本サービス」）の利用条件を定めるものです。
            ユーザーの皆様は、本サービスを利用することにより、本規約の全条項に同意したものとみなされます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-purple-500 pl-3">
            第2条（アカウント及び認証）
          </h2>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li>本サービスは、DiscordまたはGoogleアカウントによるOAuth認証を通じてアカウントを作成・連携できます。</li>
            <li>ユーザーは、自己のアカウントおよび認証情報を適切に管理する責任を負います。</li>
            <li>1人のユーザーが不正な目的で多数のアカウントを作成・保有することを禁止します。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-purple-500 pl-3">
            第3条（禁止行為）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            本サービスの利用にあたり、以下の行為を禁止します。
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li>法令または公序良俗に反するコンテンツの掲載、リンク設定、行為</li>
            <li>他者への誹謗中傷、嫌がらせ、差別的表現、脅迫、または名誉毀損</li>
            <li>第三者の知的財産権、肖像権、プライバシー権、その他の権利を侵害する行為</li>
            <li>第三者や実在する公式組織になりすますプロフィールやサーバーの登録</li>
            <li>不適切な性的・暴力的コンテンツ（NSFW）の無制限公開</li>
            <li>マルウェア、フィッシング、スパム行為を目的とするURLやサーバーの掲載</li>
            <li>自動化ツール、Bot、スクリプト等による不正なアクセス数やブースト数の水増し操作</li>
            <li>当運営のサーバーやネットワークの円滑な運営を妨害する行為</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-purple-500 pl-3">
            第4条（サーバー掲載およびコンテンツ管理）
          </h2>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li>ユーザーが本サービスに掲載するサーバー情報は、登録者自身が管理権限を有するサーバーである必要があります。</li>
            <li>本サービス上のコンテンツが本規約に違反していると判断された場合、当運営は事前の予告なく非公開化・削除・アカウント停止などの措置を行うことができます。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-purple-500 pl-3">
            第5条（免責事項）
          </h2>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li>当運営は、本サービスの中断、停止、終了、データの消失、その他本サービスの利用に関してユーザーに生じた損害について、故意または重大な過失がある場合を除き、一切の責任を負いません。</li>
            <li>本サービスを通じてアクセスする第三者の外部サイト（Discordサーバー、外部API等）において生じたトラブルについて、当運営は責任を負いません。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-purple-500 pl-3">
            第6条（規約の変更）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            当運営は、必要と判断した場合には、ユーザーに事前通知することなく本規約を変更することができます。
            変更後の規約は、本サイト上に掲載された時点より効力を生じるものとします。
          </p>
        </section>
      </div>
    </div>
  );
};
