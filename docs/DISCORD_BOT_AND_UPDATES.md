# Linkord アップデート & Discord Bot 設定まとめ

## 1. 現在の実装進捗ステータス

| 項目 | 状態 | 内容 |
| :--- | :---: | :--- |
| **アイコン・アバターのリセット処理（バックエンド）** | ✅ 完了 | 空文字送信時に DB 側で `NULL`（未設定）にリセットして保存する処理を実装済み |
| **アイコン削除ボタン UI（フロントエンド）** | ⏳ 途中 | 設定画面・サーバー作成モーダルに「削除」ボタンの配置（UIコード反映待ち） |
| **PlayHive API の調査・原因特定** | ✅ 完了 | Cloudflare Bot Challenge による外部接続遮断を特定 |
| **PlayHive タイムアウト短縮 & フォールバックUI** | ⏳ 途中 | タイムアウト 2.5秒短縮と、ブロック時の親切なフォールバック表示の繋ぎ込み |
| **Discord Bot の権限設定・招待URL生成** | ✅ 完了 | 必要最小限の権限（管理者権限なし）で安全に動作する URL と設定手順を用意 |
| **Discord Bot 本体（`/up` コマンド等）の実装** | ⏳ 途中 | `bot/main.py` でのスラッシュコマンド & Linkord DB バンプ処理コードの配置待ち |
| **GitHub push & VPS 反映・PM2 常駐起動** | ⏳ 途中 | 実装完了後のビルド、リモート push、VPS デプロイおよび PM2 による Bot 起動 |

---

## 2. Discord Bot の権限と招待リンク

公式 Bot（App ID: `1558818096524034058`）の導入に必要な設定と招待 URL です。

### 招待URL
以下の URL からサーバーへ Bot を追加できます（スラッシュコマンドと必要最小限の権限があらかじめセットされています）。

👉 **[Linkord Bot をサーバーに追加する](https://discord.com/api/oauth2/authorize?client_id=1558818096524034058&permissions=274877991936&scope=bot%20applications.commands)**

### 必要な権限一覧
管理者権限（Administrator）は不要で、安全に動作します。
- **bot** および **applications.commands**（スラッシュコマンド利用）
- **View Channels**（チャンネルを見る）
- **Send Messages**（メッセージを送信）
- **Embed Links**（リッチなカード形式で返信を表示）
- **Create Instant Invite**（招待リンクの自動取得・更新用）
- **Read Message History**（メッセージ履歴の確認）

> **Discord Developer Portal での必須設定**:
> 1. [Discord Developer Portal](https://discord.com/developers/applications/1558818096524034058/bot) を開く
> 2. 左メニュー「**Bot**」を選択
> 3. 「**Privileged Gateway Intents**」の以下の項目を **ON** にして「Save Changes」
>    - ✅ **Server Members Intent**（サーバーの正確な人数を取得するために必要）

---

## 3. Botの機能（`/up` コマンド）

- **/up**: 
  - 実行したサーバーの Linkord 掲載順位をトップに押し上げます（Bump）。
  - 同時に、Discord サーバーの最新の人数・アイコン・サーバー名を Linkord 側に自動同期します。
  - 連投防止のため、クールダウン（1サーバーにつき1時間）が設定されます。
- **/info**: Linkord 上での現在の掲載情報やリンクを表示します。

---

## 4. PlayHive API が動いていない原因と対策

- **原因**: 
  - 現在 `api.playhive.com` のエンドポイントに **Cloudflare Bot Management** が全面適用されており、外部サーバーやVPSからの直接通信がタイムアウト（HTTP 524 / 接続遮断）になる状態。
- **対策**:
  - API呼び出しタイムアウトを 2.5 秒に短縮し、サイト全体の読み込みが重くならないように改善。
  - Minecraft のスキン頭部アイコン（MC-Heads）は Cloudflare の影響を受けず超高速に取得できるため安定表示。
  - 戦績が Cloudflare によりブロックされた場合は、「戦績なし」と誤解されないよう「PlayHive API がメンテナンス中か戦績がありません」と親切なメッセージに切り替わるように対応。

---

## 5. アイコン削除機能

- **プロフィール設定**:
  - 設定画面で現在設定中のアバター画像の横に「**削除**」ボタンを追加。
- **サーバー作成**:
  - アイコン画像の横に「**削除**」ボタンを追加。
- **バックエンド**:
  - 空文字で更新リクエストを受け取った際に、データベース側で `NULL` にリセットして反映。
