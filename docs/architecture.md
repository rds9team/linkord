# Linkord 技術アーキテクチャ

## 1. 基本構成

```text
ブラウザ
  ↓
Cloudflare
  ↓
VPS上のWeb/API
  ├─ 認証
  ├─ プロフィール
  ├─ サーバー
  ├─ ランキング
  ├─ フォロー
  ├─ ブースト
  ├─ 通報
  └─ 管理画面
        ↓
      Database

外部サービス：
  ├─ Discord OAuth2
  ├─ Lanyard
  ├─ PlayHive API
  ├─ GitHub CDN
  └─ PayPay送金リンク
```

## 2. 技術方針

- Python、JavaScript、HTMLを優先する
- フロントエンドとAPIの責務を分離する
- DBアクセスを1箇所に集約する
- 外部APIごとにクライアントモジュールを分ける
- 外部APIの失敗でページ全体を壊さない
- 環境変数に秘密情報を保存する
- DB変更にはマイグレーションを使う
- 重要処理にエラーハンドリングを入れる
- 共通処理を重複実装しない

## 3. ストレージ

### 初期構成

ユーザーアップロードはVPSに保存する。

```text
/uploads
  /images
  /audio
  /video
```

### 将来構成

容量・転送量・バックアップ負荷が増えた場合、Cloudflare R2へ移行する。

アプリケーション側では以下の抽象化を使う。

```text
MediaStorage
├─ upload()
├─ download()
├─ getUrl()
├─ delete()
└─ getMetadata()
```

実装：

```text
VpsStorage
R2Storage
```

DBには実ファイルの絶対パスを保存しない。

保存する情報：

- storage_provider
- object_key
- sha256
- mime_type
- size
- created_at

## 4. 静的アセット

サービス共通の静的アセットはGitHub CDNから配信する。

対象：

- テーマ定義
- バッジ画像
- ロゴ
- デフォルト背景
- アイコン
- UI用フォント
- プレビュー画像

ユーザーアップロードをGitHub CDNに保存してはいけない。

本番ではブランチ名ではなく、リリースタグまたはコミットハッシュを使用する。

```text
https://cdn.jsdelivr.net/gh/rds9dev/linkord-assets@v1.0.0/themes/midnight.json
```

同じ共通ファイルをGitHub、Pages、R2へ重複保存しない。

## 5. 主要データ

### User

- id
- discord_id
- username
- global_name
- avatar_hash
- created_at
- last_login_at
- deleted_at

### Profile

- user_id
- slug
- display_name
- bio
- theme_id
- background_media_id
- music_media_id
- minecraft_uuid
- is_public
- followers_public
- analytics_id
- created_at
- updated_at

### Link

- id
- user_id
- title
- url
- icon
- sort_order

### Server

- id
- owner_id
- slug
- name
- description
- icon_url
- invite_url
- tags
- language
- member_count
- member_count_source
- is_public
- created_at
- updated_at

### Follow

- follower_id
- following_id
- created_at

一組のユーザー間に重複フォローを許可しない。

### Boost

- user_id
- server_id
- time_window
- created_at

`user_id + server_id + time_window`を一意にする。

### View

個人の閲覧履歴は保存しない。

集計値のみ保存する。

- target_type
- target_id
- date
- count
- unique_count

### Media

- id
- user_id
- storage_provider
- object_key
- sha256
- mime_type
- size
- duration
- created_at

### Report

- id
- reporter_id
- target_type
- target_id
- reason
- description
- guard_score
- status
- admin_note
- created_at
- resolved_at

## 6. 外部API

### Discord OAuth2

用途：

- ログイン
- Discordユーザー情報取得

### Lanyard

用途：

- Discordステータス
- Spotify
- ゲーム
- アクティビティ
- 自動タグ

### PlayHive

用途：

- Minecraft戦績

キャッシュキー例：

```text
playhive:{minecraft_uuid}:{gamemode}
```

基本TTL：

```text
600秒
```

### PayPay

送金リンクが送られてきたときへの安全性は注意
秘密情報や管理用URLをクライアントコードに直接書かない。

## 7. キャッシュ

キャッシュ対象：

- Lanyardステータス
- PlayHive戦績
- サーバーランキング
- サーバー検索結果
- テーマ定義
- 外部アバター
- サーバーアイコン

外部APIが失敗した場合は、期限切れキャッシュをフォールバック表示できるようにする。

## 8. ランキング集計

ランキングはアクセス数、フォロー数、ブースト数を組み合わせる。

初期実装：

- リクエスト時の簡易集計
- 定期バッチによるランキング更新
- DBまたはキャッシュへの保存

## 9. API設計

主要エンドポイント：

```text
GET    /api/me
PATCH  /api/me/profile
GET    /api/profile/:slug
POST   /api/profile/:slug/follow
DELETE /api/profile/:slug/follow

GET    /api/servers
POST   /api/servers
PATCH  /api/servers/:id
DELETE /api/servers/:id
POST   /api/servers/:id/boost

GET    /api/minecraft/:uuid/:gamemode
GET    /api/lanyard/:discord_id

POST   /api/media
DELETE /api/media/:id

POST   /api/reports

GET    /api/admin/reports
PATCH  /api/admin/reports/:id
```

## 10. エラー方針

外部APIエラー時：

- プロフィール本体は表示する
- 対象カードだけ「取得できません」と表示する
- 前回キャッシュがあれば表示する
- 管理者ログに記録する
- ユーザーに内部エラー詳細を見せない

## 11. 将来のR2移行

移行手順：

1. 新規アップロードを一時的に制限する
2. VPSファイルをR2へコピーする
3. ハッシュとDB情報を照合する
4. `storage_provider`を更新する
5. 新しいURLを確認する
6. 古いVPSファイルを一定期間保持する
7. 問題がなければVPSファイルを削除する
