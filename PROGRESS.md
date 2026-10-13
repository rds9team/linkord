# Linkord 開発進捗 & 備忘録まとめ

最終更新: 2026-10-13


Linkord（Discord プロフィール & サーバーポータル / linkord.net）の開発状況、これまでに実装した内容、および今後の作業用備忘録のまとめです。

---

## 📌 現在の稼働状況

| コンポーネント | 稼働場所 / URL | 状態 | 備考 |
|---|---|---|---|
| **Git リポジトリ** | `https://github.com/rds9team/linkord` (main) | **最新追従 (完全同期)** | バックエンド・フロントエンド結合テスト全件パス |
| **バックエンド API** | VPS (`vps-gateway.sorahost.net`) | **オンライン (PM2 id: 5)** | ポート 8085 / SQLite 本番DB / 4桁タグ認証・レートリミット対応 |
| **公式 Discord Bot** | VPS (`vps-gateway.sorahost.net`) | **オンライン (PM2 id: 14: linkord-bot)** | `rds9up#0726` / スラッシュコマンド（`/up`, `/info`, `/help`）同期 |
| **Cloudflare Tunnel** | VPS (`vps-gateway.sorahost.net`) | **オンライン (PM2 id: 9: linkord-tunnel)** | `api.linkord.net` -> VPS localhost:8085 疎通OK |
| **フロントエンド** | Cloudflare Pages (`linkord.net`) | **オンライン** | SPAリライト・Functions OGP動的生成 稼働中 |
| **Discord Webhook** | 通知チャンネル | **正常稼働** | デプロイ完了・PayPay支援通知等（.env管理） |
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

### 3. プロフィール機能 & サイバー・ダークグラスモーフィズム UI
- **デザイン**:
  - サイバー・ダークグラスモーフィズムデザイン
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

### 12. Discord サーバー掲載の完全実連携 & モックデータ完全撤廃 (本格運用対応)
- フロントエンドに存在していたハードコードされたモックサーバー（`FALLBACK_SERVERS`, `FALLBACK_SERVER` 等）を完全撤廃。
- バックエンドに `GET /api/servers/inspect-invite?invite={url_or_code}` エンドポイントを実装。Discord 公式 Invite API（パブリック呼び出し）からギルド名、アイコン画像、メンバー数、アクティブ数を即座に自動取得。
- サーバー掲載モーダル（`CreateServerModal.tsx`）を刷新：招待URLを入力して「取得」ボタンを押すと、Discord公式情報からサーバー名・URL slug候補・アイコン・メンバー数を即座に自動補完＆プレビュー表示。
- バックエンドのサーバー作成処理（`POST /api/servers`）でも招待URLから実メンバー数や公式アイコンURLを自動補完・保存する堅牢な設計にアップデート。

### 13. 設定画面のリアルタイムテーマプレビュー
- `frontend/src/pages/Settings.tsx` にインタラクティブなテーマプレビューカードを実装。
- 12種類のテーマプリセットを選択した瞬間に、アバター・バッジ・アクセントカラー・背景グラデーションがリアルタイムにプレビューされ、保存前に確認可能。

### 15. メディア拡張: 音楽BGM & 背景動画ループ機能 (今回追加)
- バックエンド:
  - 画像に加えて音声（MP3, OGG, WAV / 最大20MB）および背景動画（MP4, WebM / 最大50MB）のMagic Bytes実体検証・アップロード保存に対応。
  - `accounts` テーブルに `music_url` および `video_url` カラムを追加し、DB自動カラムマイグレーションを実装。
- フロントエンド:
  - 設定画面（`Settings.tsx`）から音楽BGMと背景動画の選択・アップロード・削除プレビューが可能。
  - プロフィール画面（`Profile.tsx`）で背景動画ループ再生＆BGM再生プレイヤー（再生中/一時停止トグル）を実装。

### 16. Discord サーバー掲載のワンクリック同期機能 (今回追加)
- バックエンド: `POST /api/servers/{slug}/sync` エンドポイントを実装。
- 掲載者本人がワンクリックでDiscord公式API（Invite情報）から最新のメンバー数および最新アイコン画像を再取得・反映可能。
- フロントエンド: サーバー詳細画面（`ServerDetail.tsx`）に「最新同期」ボタンを追加。

### 17. ランディングページ (LP) のサイバーグラス UI ブラッシュアップ (今回追加)
- トップページ（`Home.tsx`）にサイバー・ダークグラスモーフィズムプレビューカードを追加。
- リアルタイムSpotifyウィジェット、オンラインインジケータ、ピル型バッジ、グラデーションバナーのファーストビューアニメーション演出を強化。

### 19. サーバー発見機能の拡張: 急上昇（ブースト順）ランキング (今回追加)
- バックエンド: `GET /api/servers?sort=boost` ソートクエリを実装。ブースト獲得数順に動的ソートしてレスポンス。
- フロントエンド: 見つける（`Discover.tsx`）画面に「急上昇 (ブースト順)」タブを追加。

### 20. プライバシー & 管理者機能の拡張: フォロー非表示設定 & 管理者バッジ直接操作 (今回追加)
- **フォロー公開・非表示設定**:
  - `accounts` テーブルに `hide_followers` カラムを追加し、自動マイグレーションを実装。
  - 設定画面（`Settings.tsx`）で「フォロワー数を非表示にする」トグルを提供。
  - プロフィール画面（`Profile.tsx`）でユーザーの意向に応じてフォロワー数・モーダルリンクを自動非表示化。
- **管理者バッジ直接操作**:
  - `PATCH /api/admin/profiles/{username}/badges` エンドポイントを実装。
  - 管理画面（`Admin.tsx`）にバッジ管理フォームを追加し、Supporter, Team, Founder, Authed をワンクリックで直接付与・剥奪可能。

### 21. ブラウザ全体の Dark / White（Light）モード切り替え (今回追加)
- `ThemeContext` を新設し、アプリ全体のテーマ状態を一元管理（localStorage 保持 & prefers-color-scheme 自動判定）。
- ナビゲーションバー（Navbar）に Sun / Moon ワンクリック切り替えトグルを設置。
- 全体背景、Navbar、Footer、各カードのスタイルが連動して美しく切り替わるよう統合。

### 22. ページ遷移時の滑らかなフェードアウト／フェードイン演出 (今回追加)
- `PageTransition` コンポーネントを実装。
- ルート変更時のカクつき・ガタつきを排除し、滑らかで上品なフェードアウト（120ms）＆フェードイン（180ms）アニメーションを適用。

### 23. Minecraft PlayHive 連携の全ゲームモード対応 & 表記更新 (今回追加)
- 設定画面の表記を「Minecraft PlayHive連携 / Minecraft ユーザー名 (Bedrock)」に更新。
- 公式 OpenAPI（PlayHive API v0）準拠で、主要全ゲームモード（BedWars, The Bridge, SkyWars, Survival Games, Murder Mystery, DeathRun, Block Drop, Ground Wars, Capture The Flag, Treasure Wars）を完全サポート。
- プロフィール画面にワンクリックで切り替え可能なゲームモードタブを設置し、Kills, Victories, Played, 特殊スタッツ（Beds Destroyed, Goals, Murders 等）を動的に切り替え表示。

### 24. SNS リンク（Social Links）の入力・保存・自動生成 & 外部リンク化 (今回追加)
- バックエンド `PATCH /api/profile/me` で `links` 配列の永続化とリフレッシュに対応。
- 設定画面（`Settings.tsx`）に SNS リンク管理セクションを追加（Discord, GitHub, X, Qiita, YouTube, Twitch, Website 等のプリセット追加・編集・削除）。
- Discord 連携ユーザーには `https://discord.com/users/{discord_id}` をワンクリックで自動登録できる導線を設置。
- プロフィール画面でダミー `#` による誤遷移を撤廃し、登録済みURLへの安全な外部リンク（新規タブ）として正常稼働。

### 25. サイト全体のインデックス登録（SEO）& バックアップ復元検証 (今回追加)
- 検索エンジン向けインデックス登録（SEO）対応: `public/robots.txt`、`public/sitemap.xml`、`index.html` meta タグ（robots index/follow, canonical, keywords）の整備。
- プロフィールアクセス数の重複カウント防止（自分自身閲覧の除外、同一IPからの10分以内連打・重複アクセスの除外）。
- データベース復元検証スクリプト `scripts/restore_db.sh`（整合性チェック・自動バックアップ退避）の作成と動作検証成功。

### 26. PayPay 支援申請の却下後完全削除機能 (今回追加)
- バックエンド: `DELETE /api/admin/donations/{donation_id}` エンドポイントを追加。管理者権限による安全な物理削除と監査ログ記録を実装。
- フロントエンド: 管理画面（`/admin`）の支援一覧カードにゴミ箱アイコン（`Trash2`）を追加。却下された申請や不要な支援履歴をワンクリックで確認後削除可能。

### 27. お知らせ通知のリアルタイム配信 & 既読お知らせ削除機能 (今回追加)
- **リアルタイム配信**: 通知ボックス（`NotificationBox.tsx`）のポーリング間隔を 15秒 に短縮。新しいお知らせが届いた瞬間に、画面右上にサイバー風トーストポップアップ通知を自動表示＆ベルアイコンをアニメーション点滅。
- **既読お知らせ削除**: ユーザー自身の通知ボックスから、読んだお知らせを個別または一括で削除（`localStorage` による非表示管理）できる機能を追加。

### 28. 管理者向けユーザーバッジ一括付与・剥奪機能（複数ユーザー指定対応） (今回追加)
- バックエンド: `POST /api/admin/profiles/batch-badges` エンドポイントを実装。カンマや改行で区切られた複数ユーザーに対して、Supporter, Team, Founder, Authed バッジを一括で付与・剥奪。
- フロントエンド: 管理画面（`/admin`）のバッジ付与フォームを複数行入力可能なテキストエリアに拡張。一括処理結果（成功人数、未検出ユーザー一覧）を明確にフィードバック。

### 29. サーバー掲載時の Discord OAuth2 所属サーバー一覧リッチ表示 & 検索・自動補完 (今回追加)
- バックエンド: `GET /api/servers/my-guilds` を強化。ユーザーが所属する全ギルドを取得し、管理権限（オーナー/管理者）順にソート。すでに Linkord に掲載中のサーバーかも判定。
- フロントエンド: サーバー掲載モーダル（`CreateServerModal.tsx`）にリッチなサーバー一覧グリッド/リストを実装。サーバー名リアルタイム検索、👑オーナー/🛡️管理者バッジ、ワンクリックでのサーバー名・slug・アイコンの自動補完。未連携時のDiscord再認証ボタンも配置。

### 30. 公式 Discord Bot（rds9up）の開発・常駐稼働 & スラッシュコマンド（今回追加）
- **公式Bot常駐化**:
  - `bot/main.py` を実装し、VPS 上で PM2（`linkord-bot`）としてオンライン起動。
  - スラッシュコマンド `/up`（サーバー掲載順位のBump & 人数・アイコン最新同期 & 1時間クールダウン）、`/info`、`/help` を登録・同期。
  - 招待URL: `https://discord.com/api/oauth2/authorize?client_id=1558818096524034058&permissions=274877991936&scope=bot%20applications.commands`

### 31. 公式Bot連携型 3ステップサーバー掲載フロー & モーダルPortal化（今回追加）
- **モーダル表示崩れの解消**:
  - `CreateServerModal.tsx` を React `createPortal`（`document.body` 直下）に移行。ページ遷移アニメーション（`PageTransition`）やナビバーとの重なりによる画面見切れ・バグを根本解消。
- **3ステップウィザード**:
  - ステップ1: サーバー選択（ユーザーが管理者権限を持つ所属ギルドから選択）
  - ステップ2: 公式Bot導入確認（`GET /api/servers/bot-check/{guild_id}` でBot導入を検知、未導入時はワンクリック招待）
  - ステップ3: 招待リンクと基本情報はBotから自動取得されるため、ユーザーは slug・説明・タグのみを入力するだけのシンプルなフローに刷新。
  - slug 入力欄横にホバー／タップで浮き上がる詳細説明ツールチップ（Info アイコン）を設置。

### 32. Webhook セキュリティ強化 & ダミー寄付データクリーンアップ（今回追加）
- バックエンド設定ファイル（`config.py`）から Discord Webhook URL の直書きを完全に排除し、VPS およびローカルの `.env` のみで安全に隔離管理。
- 過去のテスト用ダミー寄付データ（Test User / @pikmin0333）をデータベースから完全クリーンアップ。

### 33. ユーザー名変更レートリミット（1週間クールダウン）& 先住権保護（今回追加）
- **先住優先 & 重複防止**:
  - 設定画面で他のユーザーが既に使用しているユーザー名への変更は `400 Bad Request` で拒絶。先住ユーザーのIDを保護し、新規・後発側が妥協して別名にする仕様を確立。
- **1週間（7日間）クールダウン**:
  - `Account` テーブルに `username_changed_at` カラムを追加（DB自動マイグレーション対応）。
  - 変更から7日間は再変更不可とし、次回変更可能日時（JST）を明示して拒絶。
  - 設定画面（`Settings.tsx`）にクールダウン中の警告バナー（時計アイコン & 次回変更可能日時）を表示。

### 34. サイバー攻撃対策 & ハッシュ化保存最強化（DoubleCounter事件対策） (今回追加)
- **生IPアドレスの完全非保持化（DoubleCounter型漏洩への根本的防御）**:
  - `UserSession` および `ProfileBoost` テーブルに生のIPアドレスを平文で保存することを完全撤廃。
  - サーバーの `SECRET_KEY` をシークレットソルトとする不可逆な HMAC-SHA256（`h_<hash>`）にハッシュ化して保存。
  - プロフィールブーストの1時間クールダウン判定やアクセスデバウンス、SlowAPI レートリミットもハッシュ値で一貫判定。万が一DBが奪われても利用者の生IPアドレスは絶対に特定・復元されない最強のプライバシー保護を実現。
- **セッショントークンのSHA-256ハッシュ化保存（セッションハイジャック防止）**:
  - クライアントの Cookie には生トークン（`secrets.token_urlsafe(32)`）を発行し、DB側（`UserSession.session_token`）には SHA-256 ハッシュ値のみを格納。
  - 認証検証時は Cookie トークンを SHA-256 化して照合。DBダンプが流出しても平文トークンは逆算不能なため、なりすましによるアカウント乗っ取りを100%防止。
- **外部OAuthトークン（Discord access_token）& 決済パスコードのAES暗号化**:
  - `AccountIdentity.access_token` および `Donation.passcode` を `SECRET_KEY` から導出した暗号鍵による AES-128-CBC / HMAC-SHA256（Fernet）で暗号化してDB永続化。
  - Discord API 通信時や管理者承認時のみ復号して使用。平文トークンがDBに残らない構造を確立。
- **SSRF（Server-Side Request Forgery）防御**:
  - `is_safe_url` バリデータにより、ローカルIP（`127.0.0.1`, `localhost`）、プライベートIP（`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`）、クラウドメタデータエンドポイント（`169.254.169.254`）へのアクセスを完全遮断。
- **リクエストボディ上限チェックミドルウェア（DoS / リソース枯渇対策）**:
  - 通常APIへの巨大ペイロード（2MB超）およびメディアアップロード（20MB超）を検知し即時 `413 Payload Too Large` で遮断。
- **セキュリティヘッダーの完全武装**:
  - `X-Content-Type-Options: nosniff`、`X-Frame-Options: SAMEORIGIN`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy`、`X-XSS-Protection: 0`、`Cross-Origin-Opener-Policy: same-origin`、本番用 `Strict-Transport-Security (HSTS)` を全レスポンスに付与。
- **セキュリティ検証テストスイート**:
  - `backend/tests/test_security_hardening.py` を追加し、全15件の自動テストがすべてグリーン（PASS）。

### 35. プロフィール BGM プレイヤーの改善 & 全画面オーバーレイ廃止 & UI被り解消
- **「画面をタップしてプロフィールを開く」全画面オーバーレイの完全撤廃**:
  - ページアクセス時の全画面暗転・タップ強制モーダルを廃止。プロフィール画面がダイレクトかつスムーズに表示されるように改善。
- **自動再生の廃止（意図しない音声再生の防止）**:
  - ページを開いた瞬間に勝手にBGMが再生される挙動を停止し、初期状態を「停止（paused）」に統一。ユーザーが再生ボタンを押した時のみ再生される安心設計。
- **BGMが流れない原因の根本解決（メディアURL解決 & HTML5 Audio 最適化）**:
  - バックエンド保存の相対パス（`/uploads/xxx.mp3`）が Cloudflare Pages 側で正しく解決されていなかった問題を修正。`resolveMediaUrl` を経由することで `https://api.linkord.net/uploads/xxx.mp3` に自動解決され、確実に再生されるよう改善。
  - `crossOrigin="anonymous"`、`preload="metadata"`、再生エラー時のリトライハンドリングを追加。
- **UI被り・コンテンツ重なりの解消**:
  - 画面最下部に固定表示されていたプレイヤーバーが、プロフィールカード下部の「累計閲覧数」「ブースト」「通報」「Powered by rds9team」に覆い被さっていた問題を解消。
  - プロフィール最下部に十分なスペーサー（`h-16 sm:h-20`）と下部余白（`pb-24 sm:pb-28`）を確保し、スクロール時にフッターがプレイヤーの上に綺麗に逃げるレイアウトを確立。
  - 上部ヘッダー（戻るボタン、URL、BGMピル）の flex レイアウトを最適化し、モバイルでの要素重なりや見切れを防止。

### 36. 100MB動画・60MB音声・10MB画像アップロード対応 & 413/502 根本解消
- **Starlette / Uvicorn ペイロード制限の解除**:
  - FastAPI / Starlette の `MultiPartParser` と `Request.form` のデフォルト上限（1000部品/20MB等）を120MBへ動的パッチ適用。
  - `MAX_BODY_SIZE_UPLOAD = 120 * 1024 * 1024`（120MB）に設定し、30MB〜80MBの大型背景動画アップロード時の 413 / 502 エラーを完全解決。
- **動的ストリーミング書き込み**:
  - `storage.py` で 64KB チャンクの非同期ストリーミング保存を導入。サーバーメモリ消費を最小化。
  - メディア種別ごとの上限チェック（動画: 100MB、音声: 60MB、画像: 10MB、対応拡張子: webp, webm, mp4, mp3 等）を整備。
- **クライアント事前バリデーション**:
  - `Settings.tsx` でファイル選択時に即時サイズ判定し、わかりやすいエラーメッセージを表示。

### 37. ファビコン・カタカナ「リンコード」SEO & sitemap.xml 拡充
- **正規マルチサイズ favicon.ico 生成**:
  - 16x16, 32x32, 48x48 の正規 ICO 形式を生成し `frontend/public/favicon.ico` に配置。検索エンジンやブラウザタブで正しくアイコンが表示されるように改善。
- **カタカナ「リンコード」検索流入対応**:
  - `index.html` および Cloudflare Workers/Functions（`_middleware.ts`）のタイトルを `Linkord（リンコード）- Discordプロフィール作成・共有＆サーバーポータル` に統一。
  - JSON-LD に `alternateName: "リンコード"` を追加。
- **サイトマップ（sitemap.xml）拡充**:
  - 純粋な sitemap 0.9 スキーマに準拠させ、Google Search Console の解析エラーを解消。
  - 通話募集一覧 (`/discover?type=recruitments`)、サーバー一覧 (`/discover?type=servers`)、ユーザー一覧 (`/discover?type=users`)、および公開ユーザープロフィールURLを網羅的に出力。

### 38. PlayHive API の耐障害性向上（タイムアウト・レートリミット対策）
- **タイムアウト延長 & 自動リトライ**:
  - PlayHive Cloudflare 経由の応答遅延対策としてタイムアウトを 2.5秒 → 6.0秒 に拡張。
  - レートリミット（429 Too Many Requests）や一時的ネットワーク切断時に 0.8秒待機して自動リトライ（最大2回試行）。
- **キャッシュTTL延長 & Stale Cache フォールバック**:
  - キャッシュTTLを 10分 → 30分（1800秒）に延長し、APIリクエスト頻度を削減。
  - PlayHive 側が障害や一時ダウンを起こしても、過去のキャッシュデータがあれば即座に返却（Stale-While-Revalidate）することでユーザー側のエラーを防止。

### 41. 寄付一覧・見つける（Discover）のテストデータ一括クリーンアップ
- **テスト用ダミーデータの完全パージ**:
  - DB内に残留していた「Test User」名義のダミー寄付データ（13件）およびテスト用アカウント（`donation_user`, `admin_*`, `secuser_*` 等）を一括削除。
  - テスト実行時に上書きされていたユーザーID 1（`yuto`）の `display_name` を本来の「yuto」に復旧。
  - 本番および開発環境の「寄付」「見つける（Discover）」画面から不要なテスト表示を完全消去。

### 42. 設定画面の「設定を保存」ボタン整理とフローティングバー洗練
- **重複ボタンの削減と導線整理**:
  - ヘッダー右上およびフォーム最下部に重複して存在していた「設定を保存」ボタンを削除。
  - 画面最下部に固定追従するフローティングバー（`fixed bottom-6`）に保存アクションを一本化。どのセクションを編集していても直感的にワンタップで保存できるように改善。
  - テキストや装飾の過剰感を排し、ダークチャコールのマットブラー（`backdrop-blur-xl`）で洗練された外観に統一。

### 43. Discord 連携ステータス表示の脱LLM感・ミニマル化
- **説明過多な長文テキストの排除**:
  - 「Discord 連携済み（最新権限有効）」「連携アカウント: ID ... (Authedバッジ・サーバー取得有効)」といった不自然なLLM調の長文解説を撤廃。
  - シンプルに「Discord」表記と控えめなステータスバッジ（`連携済み` / `再連携が必要`）、ID表示、および小さな「再連携」ボタンのみのミニマルな構成に刷新。

### 44. プレイスタイル設定のゲームマスター（検索・選択・新規登録）
- **バックエンド**:
  - `games` テーブルを新設し、初期人気タイトル（Apex, VALORANT, Minecraft, 原神 等33タイトル）をシード登録。
  - `GET /api/games`（タイトルインクリメンタル検索・オートコンプリート）および `POST /api/games`（新規追加）APIを実装。
- **フロントエンド**:
  - 単なるテキスト入力から、検索可能なドロップダウンメニュー＋ピルバッジ形式のゲームセレクターへと進化。
  - 候補からクリックで即時選択・解除が可能。
  - 既存リストにないゲーム名を入力した場合は、ワンクリックで「『〇〇』を新しく追加して選択」ボタンが表示され、自動でDBに登録されつつ選択される動的拡張フローを実装。

### 45. Discord Bot `/up` コマンドのタイムゾーン・相対時間バグ修正 & メンション廃止
- **相対時間バグ（7時間前に実行できます）の根本原因解消**:
  - サーバーのJST環境下で naive datetime のまま `.timestamp()` を呼んでいたため、UTCと9時間の時差ズレが生じ、本来未来の時刻が過去（約7時間前）としてDiscordに解釈されていた不具合を特定。
  - `datetime.timezone.utc` を明示的に用いたタイムゾーン対応処理へ刷新し、Discordの `<t:timestamp:R>` が正確に「2時間後」や「〇分後」と表示されるように修正。
- **リマインダー通知のメンション撤廃**:
  - 2時間後のUP可能リマインダー通知時の `<@ユーザーID>` メンションを削除し、チャンネルに静かにEmbed通知のみを行うように変更。

---

## 🚀 次のステップ（今後の最重要タスク）

1. **スマホ対応（モバイルレスポンシブ）の徹底強化**:
   - スマートフォン（iOS / Android）実機でのタップしやすさ向上（タップ領域 44px 以上の確保）。
   - 画面幅 360px〜430px における余白・文字サイズの最適化と、横スクロール発生の完全防止。
   - 画面下部フローティングバー（Sticky Save Bar）やBGMプレイヤーバーと、iOS ホームバー（`safe-area-inset-bottom`）やコンテンツとの被り・見切れのゼロ化。

2. **パフォーマンス最適化（ラグ解消・高速化）**:
   - **体感のモッサリ感・引っかかりの解消**:
     - ページ遷移時の重い再計算や不要な再レンダリングの排除（`React.memo`, `useMemo`, `useCallback` の適切な適用）。
     - 重い背景動画・高解像度画像の遅延読み込み（Lazy Loading / `loading="lazy"` / `IntersectionObserver`）とプレースホルダー表示。
   - **レンダリング軽量化**:
     - `backdrop-blur` などのGPU負荷が高いプロパティの最適化（低スペック端末やモバイルでのスクロールカクつき防止）。
     - CSSアニメーションを `transform` と `opacity` に限定し、リフロー・リペイントを抑制。




