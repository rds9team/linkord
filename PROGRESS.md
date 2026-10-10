# Linkord 開発進捗 & 備忘録まとめ

最終更新: 2026-10-10

Linkord（Discord プロフィール & サーバーポータル / linkord.net）の開発状況、これまでに実装した内容、および今後の作業用備忘録のまとめです。

---

## 📌 現在の稼働状況

| コンポーネント | 稼働場所 / URL | 状態 | 備考 |
|---|---|---|---|
| **Git リポジトリ** | `https://github.com/rds9team/linkord` (main) | **最新追従 (完全同期)** | バックエンド・フロントエンド結合テスト全件パス |
| **バックエンド API** | VPS (`vps-gateway.sorahost.net`) | **オンライン (PM2 id: 5)** | ポート 8085 / SQLite 本番DB / 4桁タグ認証対応 |
| **Cloudflare Tunnel** | VPS (`vps-gateway.sorahost.net`) | **オンライン (PM2 id: 9: linkord-tunnel)** | `api.linkord.net` -> VPS localhost:8085 疎通OK |
| **フロントエンド** | Cloudflare Pages (`linkord.net`) | **オンライン** | SPAリライト・Functions OGP動的生成 稼働中 |
| **Discord Webhook** | 通知チャンネル | **正常稼働** | デプロイ完了・節目ごとに自動投稿中 |
| **ドメイン / SSL** | `linkord.net` / `api.linkord.net` | **本番運用中 (HTTP/2 200)** | HTTPS/Cloudflare Edge 正常応答 |

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

### 4. フォロー / フォロワー機能 (新規追加)
- **バックエンド**:
  - `POST /api/profile/{username}/follow` によるフォロー / アンフォローのトグル処理
  - 重複フォロー防止、自己フォロー防止（400 エラー）
  - フォロワー数 (`followers_count`)、フォロー中数 (`following_count`)、ログインユーザーのフォロー状態 (`is_following`) を自動集計して返却
- **フロントエンド**:
  - プロフィールヘッダーにフォロワー数バッジとワンクリック「フォロー / フォロー中」ボタンを配置
  - プロフフッター統計欄にフォロワー数カウンターを追加
  - 状態変更時のリアルタイムUI更新

### 5. サーバー登録・編集・削除機能 (新規追加)
- **バックエンド**:
  - `POST /api/servers`: サーバー新規登録（名前、slug、招待URL、アイコンURL、説明、タグ、言語）
  - `PATCH /api/servers/{slug}`: オーナー限定のサーバー情報更新
  - `DELETE /api/servers/{slug}`: オーナー限定のサーバー削除
- **フロントエンド**:
  - `Discover` ページに「サーバーを掲載する」ボタンを設置
  - サーバー登録モーダル `CreateServerModal`:
    - サーバー名、slug (URL重複チェック)、招待URL、説明、タグの入力
    - アイコン画像のローカルアップロード（`uploadMedia`）& プレビュー対応
    - 登録完了時に即座に対象サーバーページ (`/server/:slug`) へ自動遷移

### 6. メディアアップロード & 静的ファイル配信
- アバター画像 & 背景画像 & サーバーアイコンのアップロード API (`POST /api/media/upload`)
- ファイル先頭マジックナンバー（シグネチャ）による実体検証（JPEG, PNG, WebP, GIF）
- ファイル名 UUID ハッシュ化、最大 10MB 制限
- VPS ローカルストレージ安全配信 (`/uploads/...`)
- 設定画面 & サーバー登録画面でのプレビュー＆即時アップロード UI

### 7. 外部 API 連携（Lanyard & PlayHive）
- **Lanyard (Discord リアルタイム Presence & WebSocket 完全同期)**:
  - `useLanyard` カスタムフックによる公式 WebSocket (`wss://api.lanyard.rest/socket`) リッスン＆定期ハートビート・自動再接続
  - バックエンド HTTP プロキシ (`/api/lanyard/{discord_id}`) による初回即時ロード＆フォールバック
  - **Spotify リッチウィジェット**: 曲名、アーティスト、アルバムアート、1秒ごとのリアルタイム再生プログレスバー（進行時間 / 総時間）、Spotify直接リンク
  - **アクティビティ / ゲーム / VS Code ウィジェット**: アプリ・ゲームアイコン（Discord Asset URL解決）、詳細・状態、経過時間の動的カウント
  - **カスタムステータス吹き出し (`CustomStatusBubble`)**: Discordの「ひとことステータス」（絵文字＋テキスト）をアバター横に吹き出し表示
  - **オンライン状態インジケータ**: Online / Idle / DND / Offline のリアルタイム切り替え
  - **設定画面案内**: Lanyard公式Discordサーバーへのワンクリック参加導線カードを追加
- **Minecraft PlayHive**:
  - バックエンド PlayHive API クライアント (`/api/minecraft/{uuid}/{gamemode}`)
  - 10 分インメモリキャッシュ & フォールバック機能
  - Kills, Victories, K/D, Level の動的表示

### 8. ブースト機能 & 通報機能
- プロフィールブースト (`POST /api/profile/{username}/boost`)
- サーバーブースト (`POST /api/servers/{slug}/boost` または `{id}`)
- 1人（または同一IP）1時間に1回のみの厳格な制限（DB 集計 `boosts_count`）
- 通報モーダル (`ReportModal`) による違反プロフ・サーバーの通報送信

### 9. 利用規約・プライバシーポリシー & 共通フッター (新規追加)
- **利用規約 (`/terms`)**: 禁止事項（スパム、なりすまし、不正アクセス）、サーバー掲載条件、免責事項を明記
- **プライバシーポリシー (`/privacy`)**: 収集する情報、OAuth2連携、外部API連携（Lanyard/PlayHive）、Cookie利用、データ削除窓口を明記
- **共通フッター (`Footer`)**: 各種リンク（見つける、利用規約、プライバシーポリシー、公式Discord）と著作権表示を統合

### 10. Cloudflare Pages Functions による Discord Bot 向け動的 OGP 生成 (新規追加)
- `frontend/functions/_middleware.ts` を実装
- Discordbot, Twitterbot, Slackbot 等のクローラーUser-Agentをエッジで検知
- プロフィール (`/@username`) やサーバー (`/server/:slug`) のURLが Discord に貼られた際、自動でタイトル・Bio・アイコン・テーマカラーを含む `<meta property="og:...">` HTMLを即時レスポンス

### 11. フォロー一覧モーダル & 相互連携 (今回追加)
- `FollowListModal`: プロフィール画面の「フォロワー数」「フォロー中数」をクリックした際にユーザー一覧をモーダル表示
- バックエンド API: `GET /api/profile/{username}/followers`, `GET /api/profile/{username}/following`
- アバター、表示名、@username、各種バッジ、Bio の一覧表示と、各ユーザーへのスムーズな画面遷移

### 12. ユーザー検索 & 見つける (Discover) 画面のタブ統合 (今回追加)
- `GET /api/profile/search`: ユーザー名、表示名、自己紹介によるキーワード検索 API
- Discover 画面に「Discord サーバー」と「ユーザー」の切り替えタブを設置
- ユーザー検索カード（フォロワー数・累計閲覧数・バッジ・Bio）

### 13. 管理者ダッシュボード & モデレーション機能 (今回追加)
- 管理者権限認証ミドルウェア (`require_admin_user`, `ADMIN_USERNAMES` 環境変数対応)
- 管理画面 UI (`/admin`):
  - 統計情報カード（ユーザー数、サーバー数、総通報数、未対応通報数）
  - 通報一覧テーブル（フィルタ、ステータス変更、メモ記録）
  - 規約違反ユーザー／サーバーのワンクリック強制非公開化機能

### 14. 退会処理 & 退会済みプロフィール表示 (今回追加)
- `POST /api/auth/delete-account` および `DELETE /api/profile/me`: 論理削除 (`deleted_at`) & セッション全破棄 & Cookie 削除
- 設定画面に Danger Zone（アカウント削除）を配置
- 退会済みユーザーの URL アクセス時は HTTP 410 Gone を返し、専用の「退会済み」画面を表示

### 15. バグ精査 & 修正
- サーバーブースト時の潜在的な制約不整合（未ログイン時にオーナーIDが代入されてしまう問題）を是正
- サーバー一覧 API に `language` フィルタを追加

---

## 📝 ユーザー用備忘録（あとでやることメモ）

時間ができたときに進める外部サービス設定・インフラ作業の一覧です。

### 1. Discord Developer Portal の設定
- [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
- 新規アプリケーション作成
- **OAuth2** -> **General** で以下を設定:
  - Redirects に `https://linkord.net/api/auth/discord/callback` (または `http://localhost:8000/api/auth/discord/callback`) を追加
- Client ID と Client Secret を取得

### 2. Google Cloud Console の設定（任意）
- [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアント ID を作成
- 承認済みのリダイレクト URI に `https://linkord.net/api/auth/google/callback` を追加

### 3. VPS の環境変数 (.env) 更新 & 再起動
- VPS（`vps-gateway.sorahost.net`）の `~/services/linkord/backend/.env` を編集:
  ```bash
  DISCORD_CLIENT_ID=取得したClient_ID
  DISCORD_CLIENT_SECRET=取得したClient_Secret
  # Googleも設定する場合
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ADMIN_USERNAMES=admin,yuto
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
  - **Framework preset**: `Vite`
  - **Root directory**: `frontend`
  - **Build command**: `npm run build`
  - **Build output directory**: `dist`
  - **Environment variables (Pages Functions用)**:
    - `API_URL`: `https://api.linkord.net` (デフォルトでもこのURLをフォールバック参照)
- **ホスティング動作仕様**:
  - `public/_redirects` (`/* /index.html 200`) により、`/@username` や `/settings`、`/server/:slug` の直接URLアクセス・リロード時でも 404 にならず SPA ルーティングが正常動作。
  - `functions/api/[[catchall]].ts` により、フロントエンドからの全 `/api/*` リクエストが `API_URL`（VPS API）へ透過リバースプロキシされ、同一オリジン（SameSite Cookie `linkord_session`）として CORS トラブルなく安定通信。
  - `functions/uploads/[[catchall]].ts` により、ユーザーがアップロードした画像（`/uploads/*`）も透過プロキシおよび Cloudflare CDN 経由で高速配信。
  - `functions/_middleware.ts` により、Discordbot や Twitterbot などのクローラーに対して動的 OGP HTML を安全に返却（XSS サニタイズ済み）。

### 10. PayPay 支援機能 & Supporter バッジ付与ワークフロー (新規追加)
- **概要**:
  - ユーザーが PayPay アプリで発行した送金リンク（`https://pay.paypay.ne.jp/...`）をフォームから送信。
  - バックエンドで `https://pay.paypay.ne.jp/` 正規表現による厳格なバリデーションを実施後、`donations` テーブルに保存。
  - Discord Webhook 通知により、管理者チャンネルへ支援者情報・送金リンク・パスコードを即時通知。
  - 管理者ダッシュボード（`/admin`）に「💖 PayPay支援管理」タブを実装：
    - 送金リンクの確認・受取用外部リンクボタン
    - ワンクリックでの「承認 & Supporterバッジ付与」ボタン（ユーザーの `has_supporter = True` に更新）
    - 却下ボタンおよび対応ステータス管理
  - ナビゲーションバーの「応援する」ボタンから `SupportModal` を呼び出し可能。

### 11. Discord 連携時のユーザー名直接採用 & DB クリーンアップ
- Discord の pomelo（新ユーザー名システム）に準拠し、Discord 連携時は Discord のユニークなユーザー名（小文字英数字・ピリオド・アンダースコア）をそのまま Linkord の `username` として採用。
- Discord 連携ユーザーはタグ（`#0001` 等）を付加せず、`@username` 単体で表示。
- 将来のパスワード登録等のみタグ番号を付与する柔軟な設計にアップデート（`Account.tag` の NULL 許容化、`full_username` プロパティの自動切り替え）。
- 既存のテスト用アカウント・関連テーブルデータを初期化（0件）し、実運用可能な状態に整備。

---

## 🚀 次のステップ（今後の拡張タスク）

1. **サーバー所有権の認証 Bot 連携（オプション）**:
   - Discord Bot 経由でサーバーの管理者権限確認およびメンバー数のリアルタイム同期
2. **ランディングページ（LP）のデザインブラッシュアップ**:
   - guns.lol スタイルの洗練されたファーストビューアニメーション強化

