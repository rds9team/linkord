# Linkord

Discordの活動を、ひとつのプロフィールに。

Linkord（https://linkord.net）は、Discordユーザーのプロフィール、リアルタイムステータス、Minecraft戦績、SNSリンク、所属サーバーをひとつにまとめる無料のプロフィール＆サーバーポータルです。

## 構成

- **フロントエンド (`frontend/`)**: Cloudflare Pages (React / TypeScript / Tailwind CSS)
- **バックエンド (`backend/`)**: VPS API サーバー (FastAPI / PostgreSQL / Docker Compose)
- **ドキュメント (`docs/`)**: 各種仕様書・アーキテクチャ・セキュリティ定義

## 主な機能

- **プロフィール**: guns.lol スタイルのサイバー・ダークグラスモーフィズム、カスタムテーマ（Dark/White、12種プリセット）
- **Discord / Google 認証**: 安全な OAuth2 + セッション Cookie 管理、Authed バッジ自動付与
- **コミュニティ & 簡単サーバー掲載**: Discord 招待URL / OAuth 連携によるワンクリック自動情報補完（サーバー名・アイコン・メンバー数自動取得）、サーバー検索、ユーザー検索、フォロー・フォロワーモーダル
- **外部連携**: Lanyard (Spotify / Discord アクティビティ同期)、Minecraft PlayHive 公式戦績
- **モデレーション**: 通報システム、管理者ダッシュボード (`/admin`)、規約違反コンテンツの非公開化
- **その他**: ブースト機能、Cloudflare Pages Functions 動的 OGP 生成、アカウント退会処理

## ドキュメント優先順位

1. `docs/master.md`
2. `docs/security.md`
3. `docs/architecture.md`
4. `docs/spec.md`
5. `docs/todo.md`

## 開発環境の起動

### バックエンド
```bash
cd backend
docker compose up -d db
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### フロントエンド
```bash
cd frontend
npm install
npm run dev
```

Powered by rds9team
