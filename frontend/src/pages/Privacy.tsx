import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Privacy: React.FC = () => {
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
          <div className="flex items-center gap-2.5 text-indigo-400 mb-2">
            <Lock className="w-6 h-6" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              プライバシーポリシー
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            制定日: 2026年10月5日 / 最終更新: 2026年10月7日
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">
            第1条（収集する情報）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Linkord（以下「本サービス」）では、サービスの提供およびセキュリティ保持のため、以下の情報を取得・保存します。
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li><strong>OAuth認証情報:</strong> DiscordまたはGoogleのユーザーID、ユーザー名、アバターURL等の公開プロフィール情報。</li>
            <li><strong>ユーザー入力情報:</strong> 表示名、Bio（自己紹介文）、SNSリンク、Minecraft UUID、アップロード画像等。</li>
            <li><strong>技術的ログ情報:</strong> IPアドレス、アクセス日時、ユーザーエージェント、Cookieセッション識別子（ブースト制限および不正アクセス防止のため）。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">
            第2条（情報の利用目的）
          </h2>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li>プロフィールページおよびサーバー情報の作成・表示・配信のため</li>
            <li>ユーザーアカウントの認証およびセッション維持のため</li>
            <li>重複ブーストやスパムアクセスの防止（1時間に1回の制限制御）のため</li>
            <li>利用規約違反や不正行為の調査・通報対応のため</li>
            <li>本サービスの機能向上・安定稼働に向けた利用傾向の集計・分析のため</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">
            第3条（外部API連携・外部サービス）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            本サービスは、利便性向上のため外部サービスと連携しています。
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li><strong>Lanyard API:</strong> Discordのオンライン状態およびSpotify再生情報を表示するために利用します。</li>
            <li><strong>PlayHive API:</strong> Minecraftのゲーム統計情報を取得・表示するために利用します。</li>
            <li><strong>Google Analytics:</strong> 任意の解析IDを設定されたプロフィールの統計集計に利用されます。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">
            第4条（CookieおよびCookie等の利用）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            本サービスでは、ログインセッションの維持（HttpOnly Cookie）およびセキュリティ対策の目的に限りCookieを利用します。
            追跡広告を目的とした第三者広告Cookieの利用は行っておりません。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">
            第5条（データの管理と削除）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            ユーザーは、設定画面からプロフィールの非公開化や登録情報の変更が可能です。
            アカウントの完全削除やデータの抹消を希望される場合は、公式Discordコミュニティまたはサポート窓口までご連絡ください。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">
            第6条（お問い合わせ窓口）
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            プライバシーポリシーに関するご質問やご相談は、RDS9 Team公式Discordサーバー（RDS9 Community）までお問い合わせください。
          </p>
        </section>
      </div>
    </div>
  );
};
