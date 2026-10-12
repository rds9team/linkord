import os
import sys
import logging
import datetime
import time
from pathlib import Path
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks
from dotenv import load_dotenv
import aiosqlite
from aiohttp import web

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("linkord-bot")

# 環境変数の読み込み (.env, backend/.env, ../.env)
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent
for env_path in [current_dir / ".env", root_dir / ".env", root_dir / "backend" / ".env"]:
    if env_path.exists():
        load_dotenv(env_path)

TOKEN = os.getenv("DISCORD_BOT_TOKEN")
LINKORD_WEB_URL = os.getenv("LINKORD_WEB_URL", "https://linkord.net").rstrip("/")
API_PORT = int(os.getenv("API_PORT", 8090))
START_TIME = time.time()

# データベースファイルのパス特定
def find_db_path() -> Path:
    env_db = os.getenv("DATABASE_PATH")
    if env_db and Path(env_db).exists():
        return Path(env_db)
    
    candidates = [
        root_dir / "backend" / "linkord.db",
        root_dir / "linkord.db",
        Path("backend/linkord.db"),
        Path("linkord.db"),
    ]
    for p in candidates:
        if p.exists():
            return p.resolve()
    return (root_dir / "backend" / "linkord.db").resolve()

DB_PATH = find_db_path()
logger.info(f"Target Database: {DB_PATH}")

# Discord Bot クライアント初期化
intents = discord.Intents.default()

class LinkordBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!linkord_", intents=intents)
        self.web_runner: Optional[web.AppRunner] = None

    async def setup_hook(self):
        await self.start_web_server()

    async def close(self):
        if self.web_runner:
            await self.web_runner.cleanup()
        await super().close()

    async def start_web_server(self):
        app = web.Application()

        async def root_handler(request: web.Request):
            return web.json_response({
                "service": "linkord-bot",
                "version": "v1.0",
                "status": "online",
                "endpoints": [
                    {"path": "/health", "method": "GET"},
                    {"path": "/stats", "method": "GET"},
                ],
            })

        async def health_handler(request: web.Request):
            return web.json_response({
                "status": "ok",
                "service": "linkord-bot",
                "uptime_seconds": int(time.time() - START_TIME),
                "timestamp": datetime.datetime.now().isoformat(),
            })

        async def stats_handler(request: web.Request):
            guild_count = len(self.guilds)
            user_count = sum(g.member_count or 0 for g in self.guilds)
            latency = round(self.latency * 1000, 1) if self.latency else 0.0

            return web.json_response({
                "status": "online",
                "bot_name": "Linkord 公式Bot",
                "bot_id": str(self.user.id) if self.user else "",
                "guilds": guild_count,
                "users": user_count,
                "ping": latency,
                "uptime_seconds": int(time.time() - START_TIME),
                "version": "v1.0",
            })

        cors_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }

        async def cors_middleware(app, handler):
            async def middleware_handler(request):
                if request.method == "OPTIONS":
                    return web.Response(status=204, headers=cors_headers)
                response = await handler(request)
                response.headers.update(cors_headers)
                return response
            return middleware_handler

        app.middlewares.append(cors_middleware)
        app.router.add_get("/", root_handler)
        app.router.add_get("/health", health_handler)
        app.router.add_get("/api/health", health_handler)
        app.router.add_get("/stats", stats_handler)
        app.router.add_get("/api/stats", stats_handler)

        self.web_runner = web.AppRunner(app)
        await self.web_runner.setup()
        site = web.TCPSite(self.web_runner, "0.0.0.0", API_PORT)
        try:
            await site.start()
            logger.info(f"[API] Web API server running on port {API_PORT}")
        except Exception as e:
            logger.error(f"[API Error] Failed to bind Web API on port {API_PORT}: {e}")

bot = LinkordBot()

async def init_db():
    """テーブルに必要なカラムが存在するか確認して追加"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute("PRAGMA table_info(servers);")
            columns = [row[1] for row in await cursor.fetchall()]
            if "guild_id" not in columns:
                await db.execute("ALTER TABLE servers ADD COLUMN guild_id VARCHAR(64);")
                await db.commit()
                logger.info("Added missing guild_id column to servers table.")
    except Exception as e:
        logger.warning(f"DB schema check warning: {e}")

async def sync_guild_stats():
    """導入されているサーバーの人数、名前、アイコンをDBに自動同期"""
    if not bot.guilds:
        return
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            for guild in bot.guilds:
                guild_id = str(guild.id)
                guild_name = guild.name
                member_count = guild.member_count or len(guild.members)
                icon_url = str(guild.icon.url) if guild.icon else None

                # 1. guild_idで紐付けられているか検索
                cursor = await db.execute(
                    "SELECT id, member_count FROM servers WHERE guild_id = ? LIMIT 1;",
                    (guild_id,)
                )
                server = await cursor.fetchone()

                # 2. 未紐付けの場合はサーバー名でフォールバック紐付け
                if not server:
                    cursor = await db.execute(
                        "SELECT id, member_count FROM servers WHERE name = ? LIMIT 1;",
                        (guild_name,)
                    )
                    server = await cursor.fetchone()
                    if server:
                        await db.execute(
                            "UPDATE servers SET guild_id = ?, member_count = ?, icon_url = COALESCE(?, icon_url) WHERE id = ?;",
                            (guild_id, member_count, icon_url, server["id"])
                        )
                        await db.commit()
                        logger.info(f"[Sync] Auto-bound & updated server '{guild_name}' (ID: {server['id']}) to {member_count} members.")
                        continue

                # 3. 紐付け済みの場合は人数やアイコンのみを更新（updated_atは更新せずバンプ順位を維持）
                if server:
                    await db.execute(
                        "UPDATE servers SET member_count = ?, name = ?, icon_url = COALESCE(?, icon_url) WHERE id = ?;",
                        (member_count, guild_name, icon_url, server["id"])
                    )
                    await db.commit()
                    logger.info(f"[Sync] Updated stats for '{guild_name}' ({guild_id}): {member_count} members.")
    except Exception as e:
        logger.error(f"[Sync Error] Failed to sync guild stats: {e}")

@tasks.loop(minutes=15)
async def periodic_stats_sync():
    await sync_guild_stats()

@periodic_stats_sync.before_loop
async def before_periodic_sync():
    await bot.wait_until_ready()

@bot.event
async def on_guild_join(guild: discord.Guild):
    logger.info(f"Joined new guild: {guild.name} (ID: {guild.id}) with {guild.member_count} members.")
    await sync_guild_stats()

@bot.event
async def on_ready():
    logger.info(f"Logged in as {bot.user} (ID: {bot.user.id})")
    await init_db()
    
    try:
        synced = await bot.tree.sync()
        logger.info(f"Synced {len(synced)} application commands globally.")
    except Exception as e:
        logger.error(f"Failed to sync slash commands: {e}")

    activity = discord.Activity(
        type=discord.ActivityType.watching,
        name=f"/up | {LINKORD_WEB_URL.replace('https://', '')}"
    )
    await bot.change_presence(status=discord.Status.online, activity=activity)

    # 起動時の初回自動同期 & 定期タスク開始
    await sync_guild_stats()
    if not periodic_stats_sync.is_running():
        periodic_stats_sync.start()

@bot.tree.command(name="up", description="Linkordでのサーバー掲載順位をトップに押し上げます（Bump）")
async def up_command(interaction: discord.Interaction):
    if not interaction.guild:
        await interaction.response.send_message(
            "❌ このコマンドはDiscordサーバー内でのみ実行できます。",
            ephemeral=True
        )
        return

    await interaction.response.defer(thinking=True)

    guild_id = str(interaction.guild.id)
    guild_name = interaction.guild.name
    member_count = interaction.guild.member_count or len(interaction.guild.members)
    icon_url = str(interaction.guild.icon.url) if interaction.guild.icon else None

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # 1. guild_id または サーバー名で Linkord 上のサーバーを検索
        cursor = await db.execute(
            "SELECT id, slug, name, guild_id, updated_at, member_count, icon_url FROM servers WHERE guild_id = ? LIMIT 1;",
            (guild_id,)
        )
        server = await cursor.fetchone()

        if not server:
            # サーバー名でフォールバック検索（未紐付けの場合の自動紐付け）
            cursor = await db.execute(
                "SELECT id, slug, name, guild_id, updated_at, member_count, icon_url FROM servers WHERE name = ? LIMIT 1;",
                (guild_name,)
            )
            server = await cursor.fetchone()
            if server:
                await db.execute("UPDATE servers SET guild_id = ? WHERE id = ?;", (guild_id, server["id"]))
                await db.commit()
                logger.info(f"Auto-bound server '{guild_name}' (ID: {server['id']}) to guild_id: {guild_id}")

        if not server:
            embed = discord.Embed(
                title="⚠️ Linkordに未登録のサーバーです",
                description=(
                    f"**{guild_name}** はまだ Linkord に掲載されていません。\n\n"
                    f"👉 **[Linkord でサーバーを掲載する]({LINKORD_WEB_URL})**\n"
                    f"サイトにログイン後、「サーバーを掲載」から登録すると `/up` でバンプできるようになります！"
                ),
                color=0xFEE75C
            )
            embed.set_footer(text="Linkord • Discordサーバー発見プラットフォーム")
            await interaction.followup.send(embed=embed)
            return

        # 2. クールダウン判定（1サーバーにつき1時間 = 3600秒）
        now = datetime.datetime.utcnow()
        updated_at_val = server["updated_at"]
        last_up = None

        if updated_at_val:
            try:
                if isinstance(updated_at_val, str):
                    # ISO format or SQLite format
                    clean_ts = updated_at_val.replace("T", " ").split(".")[0]
                    last_up = datetime.datetime.strptime(clean_ts, "%Y-%m-%d %H:%M:%S")
                elif isinstance(updated_at_val, (int, float)):
                    last_up = datetime.datetime.utcfromtimestamp(updated_at_val)
            except Exception as e:
                logger.warning(f"Failed to parse updated_at '{updated_at_val}': {e}")

        COOLDOWN_SECONDS = 3600
        if last_up:
            elapsed = (now - last_up).total_seconds()
            if elapsed < COOLDOWN_SECONDS:
                next_available_dt = last_up + datetime.timedelta(seconds=COOLDOWN_SECONDS)
                next_ts = int(next_available_dt.timestamp())
                
                embed = discord.Embed(
                    title="⏳ クールダウン中です",
                    description=(
                        f"このサーバーは最近UPされました。\n"
                        f"次のUPは **<t:{next_ts}:R>** (<t:{next_ts}:t>) に実行できます！"
                    ),
                    color=0xED4245
                )
                embed.add_field(
                    name="🌐 Linkord ページ",
                    value=f"[{server['name']}]({LINKORD_WEB_URL}/server/{server['slug']})",
                    inline=False
                )
                embed.set_footer(text="1サーバーにつき1時間に1回 UP できます")
                await interaction.followup.send(embed=embed)
                return

        # 3. サーバー情報を更新して掲載順位をトップに押し上げ
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        await db.execute(
            """
            UPDATE servers
            SET updated_at = ?,
                member_count = ?,
                name = ?,
                guild_id = ?,
                icon_url = COALESCE(?, icon_url)
            WHERE id = ?;
            """,
            (now_str, member_count, guild_name, guild_id, icon_url, server["id"])
        )
        await db.commit()

        # 4. 成功レスポンスの送信
        next_dt = now + datetime.timedelta(seconds=COOLDOWN_SECONDS)
        next_ts = int(next_dt.timestamp())

        embed = discord.Embed(
            title="🚀 サーバーをUPしました！",
            description=f"**{guild_name}** の掲載順位をLinkordトップに押し上げました！",
            color=0x5865F2,
            timestamp=now
        )
        if icon_url:
            embed.set_thumbnail(url=icon_url)

        embed.add_field(name="👥 現在のメンバー数", value=f"**{member_count:,}** 名", inline=True)
        embed.add_field(name="⏰ 次のUP可能時刻", value=f"<t:{next_ts}:R>", inline=True)
        embed.add_field(
            name="🌐 Linkord 掲載ページ",
            value=f"👉 **[{server['name']} を見る]({LINKORD_WEB_URL}/server/{server['slug']})**",
            inline=False
        )
        embed.set_footer(
            text=f"実行者: {interaction.user.display_name} • Linkord 公式Bot",
            icon_url=str(interaction.user.display_avatar.url)
        )

        await interaction.followup.send(embed=embed)

@bot.tree.command(name="info", description="このサーバーのLinkord掲載ステータスを表示します")
async def info_command(interaction: discord.Interaction):
    if not interaction.guild:
        await interaction.response.send_message("❌ サーバー内で実行してください。", ephemeral=True)
        return

    await interaction.response.defer(thinking=True)
    guild_id = str(interaction.guild.id)

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, slug, name, description, tags, member_count, updated_at FROM servers WHERE guild_id = ? OR name = ? LIMIT 1;",
            (guild_id, interaction.guild.name)
        )
        server = await cursor.fetchone()

        if not server:
            embed = discord.Embed(
                title="⚠️ 未掲載サーバー",
                description=f"**{interaction.guild.name}** はまだ Linkord に掲載されていません。\n[Linkord で掲載する]({LINKORD_WEB_URL})",
                color=0xFEE75C
            )
            await interaction.followup.send(embed=embed)
            return

        embed = discord.Embed(
            title=f"📊 {server['name']} のLinkord掲載情報",
            url=f"{LINKORD_WEB_URL}/server/{server['slug']}",
            description=server["description"] or "説明文は設定されていません。",
            color=0x5865F2
        )
        if interaction.guild.icon:
            embed.set_thumbnail(url=interaction.guild.icon.url)

        embed.add_field(name="識別URL (Slug)", value=f"`/server/{server['slug']}`", inline=True)
        embed.add_field(name="同期メンバー数", value=f"{server['member_count']} 名", inline=True)
        if server["tags"]:
            embed.add_field(name="タグ", value=server["tags"], inline=False)
        embed.add_field(
            name="ページリンク",
            value=f"👉 [Linkordで開く]({LINKORD_WEB_URL}/server/{server['slug']})",
            inline=False
        )
        embed.set_footer(text="Linkord • Discordサーバー発見プラットフォーム")
        await interaction.followup.send(embed=embed)

@bot.tree.command(name="help", description="Linkord Botの使い方を表示します")
async def help_command(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🤖 Linkord 公式Bot ヘルプ",
        description="Linkord (https://linkord.net) と連携してサーバーを盛り上げる公式Botです。",
        color=0x5865F2
    )
    embed.add_field(
        name="🚀 `/up`",
        value="サーバーの掲載順位をトップに押し上げ（バンプ）ます。メンバー数やアイコンも最新状態に自動同期されます。（1時間クールダウン）",
        inline=False
    )
    embed.add_field(
        name="📊 `/info`",
        value="このサーバーのLinkord掲載状況やリンクを表示します。",
        inline=False
    )
    embed.add_field(
        name="🌐 Linkord 公式サイト",
        value=f"👉 [{LINKORD_WEB_URL}]({LINKORD_WEB_URL})",
        inline=False
    )
    embed.set_footer(text="Linkord 公式Bot")
    await interaction.response.send_message(embed=embed)

def main():
    if not TOKEN:
        logger.error("DISCORD_BOT_TOKEN environment variable is not set! Please check your .env file.")
        sys.exit(1)
    
    logger.info("Starting Linkord Discord Bot...")
    bot.run(TOKEN)

if __name__ == "__main__":
    main()
