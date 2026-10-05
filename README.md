# Linkord

Discordの活動を、ひとつのプロフィールに。

Linkord（https://linkord.net）は、Discordユーザーのプロフィール、リアルタイムステータス、Minecraft戦績、SNSリンク、所属サーバーをひとつにまとめる無料のプロフィール＆サーバーポータルです。

## 構成

- **フロントエンド (`frontend/`)**: Cloudflare Pages (React / TypeScript / Tailwind CSS)
- **バックエンド (`backend/`)**: VPS API サーバー (FastAPI / PostgreSQL / Docker Compose)
- **ドキュメント (`docs/`)**: 各種仕様書・アーキテクチャ・セキュリティ定義

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
