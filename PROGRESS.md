# Linkord 開発進捗 & 備忘録まとめ

最終更新: 2026-10-05

Linkord（Discord プロフィール & サーバーポータル / linkord.net）の開発状況、これまでに実装した内容、および今後の作業用備忘録のまとめです。

---

## 📌 現在の稼働状況

| コンポーネント | 稼働場所 / URL | 状態 | 備考 |
|---|---|---|---|
| **Git リポジトリ** | `https://github.com/rds9team/linkord` (main) | 最新プッシュ完了 | コミット履歴 clean |
| **バックエンド API** | VPS (`vps-gateway.sorahost.net`) | **オンライン (PM2 id: 5)** | ポート 8085 / SQLite (テストモード) |
| **フロントエンド** | ローカル `frontend/dist/` ビルド済 | ビルド成功 | Cloudflare Pages 接続待ち |
| **Discord Webhook** | 通知チャンネル | 正常稼働 | 節目ごとに自動投稿中 |
| **ドメイン** | `linkord.net` | NS Cloudflare 伝播完了 | Tunnel ホスト名設定待ち |

---

## ✅ これまでにやったこと（実装完了項目）

### 1. プロジェクト基盤 & アーキテクチャ
- Monorepo 構成の構築 (`frontend/` + `backend/` + `docs/`)
- 仕様書 (`docs/` 配下 5 ファイル) の完全遵守・整理
- Pydantic Settings による環境変数管理（シークレット情報のコード混入を完全防止）
- FastAPI + SQLAlchemy 2.0 (Async) + aiosqlite / asyncpg データベース基盤

### 2. 認証 & セッション管理
- **Discord OAuth2 & Google OAuth2**:
  - state 生成 & 暗号学的 HMAC 署名検証 (CSRF 防止)
  - 認可コード交換、ユーザー情報取得、Account & AccountIdentity 自動生成
  - Discord ログイン時に `has_discord_authed=True`（Authed バッジ）を自動付与
  - シークレット未設定時もクラッシュせず安全にハンドリング（開発用フォールバック）
- **DB セッション管理**:
  - `UserSession` テーブルによるセッショントークン発行・DB 管理
  - `get_current_user` / `get_optional_current_user` 依存関係ミドルウェア
  - 安全な Cookie 設定 (`linkord_session`, HttpOnly, SameSite=Lax)
  - 開発テスト用 `POST /api/auth/dev-login`（ワンクリックでテストユーザー作成＆ログイン可能）

### 3. プロフィール機能 & guns.lol 風 UI
- **デザイン**:
  - guns.lol スタイルのサイバー・ダークグラスモーフィズムデザイン
  - ユーザー指定の**ピル型タグ形状バッジ**（Authed, Supporter, Team, Founder）
  - プロフィール作成者指定のベーステーマ（Dark / White）＆ 12 種類のプリセットテーマ（Midnight, AMOLED, Cyberpunk, Sunset 等）
  - 背景画像（Cover Banner）の表示対応
- **機能**:
  - プロフィール閲覧 (`/@username` または `/:username`)、存在しない場合の 404 画面
  - プロフィール編集（表示名、自己紹介 Bio、テーマ、Minecraft ID、バッジ非表示設定）
  - 累計アクセス数（`views_count`）の自動カウントアップ

### 4. メディアアップロード & 静的ファイル配信
- アバター画像 & 背景画像のアップロード API (`POST /api/media/upload`)
- ファイル先頭マジックナンバー（シグネチャ）による実体検証（JPEG, PNG, WebP, GIF）
- ファイル名 UUID ハッシュ化、最大 10MB 制限
- VPS ローカルストレージ安全配信 (`/uploads/...`)
- 設定画面でのプレビュー＆即時アップロード UI

### 5. 外部 API 連携（Lanyard & PlayHive）
- **Lanyard (Discord Presence)**:
  - バックエンドプロキシ (`/api/lanyard/{discord_id}`) + タイムアウトフォールバック
  - Spotify 再生情報の動的表示（曲名、アーティスト、アルバムアート）
  - Discord ステータス（Online, Idle, DND, Offline）のアバターインジケーター連動
  - 未連携時・オフライン時の不要なダミー非表示化
- **Minecraft PlayHive**:
  - バックエンド PlayHive API クライアント (`/api/minecraft/{uuid}/{gamemode}`)
  - 10 分インメモリキャッシュ & フォールバック機能
  - Kills, Victories, K/D, Level の動的表示

### 6. サーバー機能 & ブースト機能
- サーバー一覧・検索（名前・説明・タグの部分一致）・カテゴリ絞り込み
- サーバー詳細ページ (`/server/:slug`)
- **ブースト機能**:
  - プロフィールブースト (`POST /api/profile/{username}/boost`)
  - サーバーブースト (`POST /api/servers/{slug}/boost` または `{id}`)
  - 1人（または同一IP）1時間に1回のみの厳格な制限
  - ダミー計算式を撤廃し、DB 実集計の `boosts_count` を返却・表示

### 7. バグ精査 & 修正
- ブースト数のハードコード・ダミー計算式を完全排除し、実 DB カウントと連動
- サーバーブースト API でフロントエンドから slug を送った際に 422 になる不整合を修正（ID / slug 両対応）
- プロフィール画面で `background_url` が反映されない問題を修正（上部カバーバナー実装）
- バックエンド結合テスト (`test_auth.py`, `test_media.py`) 全件パス確認済み

---

## 📝 ユーザー用備忘録（あとでやることメモ）

後で時間ができたときに進める外部サービス設定・インフラ作業の一覧です。

### 1. Discord Developer Portal の設定
- [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
- 新規アプリケーション作成
- **OAuth2** -> **General** で以下を設定:
  - Redirects に `https://linkord.net/api/auth/discord/callback` (または `http://localhost:8000/api/auth/discord/callback`) を追加
- Client ID と Client Secret を取得

### 2. Google Cloud Console の設定（任意）
- [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアント ID を作成
- 承認済みのリダイレクト URI に `https://linkord.net/api/auth/google/callback` を追加

### 3. VPS の環境変数 (.env) 更新
- VPS（`vps-gateway.sorahost.net`）の `~/services/linkord/backend/.env` を編集:
  ```bash
  DISCORD_CLIENT_ID=取得したClient_ID
  DISCORD_CLIENT_SECRET=取得したClient_Secret
  # Googleも設定する場合
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```
- 反映コマンド:
  ```bash
  pm2 restart linkord-api --update-env
  ```

### 4. Cloudflare Tunnel の Public Hostname 追加
- [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) にアクセス
- **Networks** -> **Tunnels** -> 既存トンネルを選択
- **Public Hostname** を追加:
  - Subdomain: `api`
  - Domain: `linkord.net`
  - Service: `HTTP` -> `localhost:8085`
- これにより、`https://api.linkord.net` 経由で VPS の FastAPI にアクセス可能になります。

### 5. Cloudflare Pages のデプロイ設定
- Cloudflare Pages に GitHub リポジトリ `rds9team/linkord` を接続
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variables: `VITE_API_URL=https://api.linkord.net`

---

## 🚀 次のステップ（残タスク）

1. **サーバー新規登録モーダル / 画面の実装** (フロントエンドから `POST /api/servers`)
2. **フォロー / フォロワー機能** (`POST /api/profile/{username}/follow`)
3. **利用規約 (`/terms`) & プライバシーポリシー (`/privacy`) ページ**
4. **Cloudflare Pages Functions による Discord Bot 向け OGP 動的生成** (ボット検知時に meta タグ HTML を返却)
