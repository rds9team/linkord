import os
import sys
import logging
import datetime
from pathlib import Path
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv
import aiosqlite

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
LINKORD_WEB_URL = os.getenv("LINKORD_WEB_URL", "https://linkord.site").rstrip("/")

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
# Note: Privileged Intents (Server Members Intent) が Developer Portal で未有効でも動作するよう
# default intents を使用。interaction.guild.member_count は default intents でも取得可能。
intents = discord.Intents.default()

bot = commands.Bot(command_prefix="!linkord_", intents=intents)

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
        description="Linkord (https://linkord.site) と連携してサーバーを盛り上げる公式Botです。",
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
