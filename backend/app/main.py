from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
import os
import starlette.formparsers
from starlette.requests import Request

# Patch Starlette MultiPartParser & Request.form default max_part_size to 120MB (supporting 100MB videos, 60MB audio)
_orig_multipart_init = starlette.formparsers.MultiPartParser.__init__
def _patched_multipart_init(self, headers, stream, *, max_files=1000, max_fields=1000, max_part_size=1024 * 1024):
    if max_part_size <= 1024 * 1024:
        max_part_size = 120 * 1024 * 1024
    return _orig_multipart_init(self, headers, stream, max_files=max_files, max_fields=max_fields, max_part_size=max_part_size)
starlette.formparsers.MultiPartParser.__init__ = _patched_multipart_init

_orig_request_form = Request.form
def _patched_request_form(self, *, max_files=1000, max_fields=1000, max_part_size=1024 * 1024):
    if max_part_size <= 1024 * 1024:
        max_part_size = 120 * 1024 * 1024
    return _orig_request_form(self, max_files=max_files, max_fields=max_fields, max_part_size=max_part_size)
Request.form = _patched_request_form

from fastapi.staticfiles import StaticFiles
import app.models
from app.api import auth, profile, server, minecraft, lanyard, report, media, admin, donations, announcements, seo, recruitments, badge, alliances, games

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

async def ensure_schema_updated(conn):
    # Check accounts table columns and add missing ones
    result = await conn.exec_driver_sql("PRAGMA table_info(accounts);")
    columns = [row[1] for row in result.fetchall()]
    if columns:
        if "email" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN email VARCHAR(256);")
        if "music_url" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN music_url VARCHAR(512);")
        if "video_url" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN video_url VARCHAR(512);")
        if "hide_followers" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN hide_followers BOOLEAN DEFAULT 0;")
        if "username_changed_at" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN username_changed_at DATETIME;")
        if "games" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN games VARCHAR(256);")
        if "active_hours" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN active_hours VARCHAR(128);")
        if "play_style" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN play_style VARCHAR(64);")

    # Check account_identities table columns
    result_ident = await conn.exec_driver_sql("PRAGMA table_info(account_identities);")
    columns_ident = [row[1] for row in result_ident.fetchall()]
    if columns_ident:
        if "access_token" not in columns_ident:
            await conn.exec_driver_sql("ALTER TABLE account_identities ADD COLUMN access_token VARCHAR(512);")

    # Check donations table columns
    result_donations = await conn.exec_driver_sql("PRAGMA table_info(donations);")
    columns_donations = [row[1] for row in result_donations.fetchall()]
    if columns_donations:
        if "is_anonymous" not in columns_donations:
            await conn.exec_driver_sql("ALTER TABLE donations ADD COLUMN is_anonymous BOOLEAN DEFAULT 0;")

    # Check servers table columns
    result_servers = await conn.exec_driver_sql("PRAGMA table_info(servers);")
    columns_servers = [row[1] for row in result_servers.fetchall()]
    if columns_servers:
        if "guild_id" not in columns_servers:
            await conn.exec_driver_sql("ALTER TABLE servers ADD COLUMN guild_id VARCHAR(64);")
        if "minecraft_tags" not in columns_servers:
            await conn.exec_driver_sql("ALTER TABLE servers ADD COLUMN minecraft_tags VARCHAR(256) DEFAULT '';")

async def ensure_defaults(conn):
    # Ensure rds9 admin account exists with founder badge
    res = await conn.exec_driver_sql("SELECT id FROM accounts WHERE username = 'rds9';")
    rds9_row = res.fetchone()
    if not rds9_row:
        await conn.exec_driver_sql("""
            INSERT INTO accounts (username, tag, display_name, has_founder, has_team, has_supporter, has_discord_authed, created_at, updated_at, last_login_at)
            VALUES ('rds9', '0001', 'rds9', 1, 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        """)
        res = await conn.exec_driver_sql("SELECT id FROM accounts WHERE username = 'rds9';")
        rds9_row = res.fetchone()
    else:
        await conn.exec_driver_sql("UPDATE accounts SET has_founder = 1, has_team = 1, has_supporter = 1, has_discord_authed = 1 WHERE username = 'rds9';")

    rds9_id = rds9_row[0] if rds9_row else 1

    # Ensure official server exists with https://discord.gg/AMKjxRYKGF
    res_srv = await conn.exec_driver_sql("SELECT id FROM servers WHERE slug = 'rds9-community';")
    if not res_srv.fetchone():
        await conn.exec_driver_sql(f"""
            INSERT INTO servers (owner_id, slug, name, description, invite_url, icon_url, tags, language, member_count, is_public, created_at, updated_at)
            VALUES ({rds9_id}, 'rds9-community', 'rds9 bots', 'RDS9 / Linkord 公式コミュニティサーバーです。開発の最新情報やボットのサポートを受けられます。', 'https://discord.gg/AMKjxRYKGF', 'https://cdn.discordapp.com/icons/1554788753317437450/4ff6888edb79fcf0aea4c7ff6c270b68.png', 'Official,Discord,Bot,Community', 'ja', 21, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        """)
    else:
        await conn.exec_driver_sql("""
            UPDATE servers
            SET invite_url = 'https://discord.gg/AMKjxRYKGF',
                icon_url = 'https://cdn.discordapp.com/icons/1554788753317437450/4ff6888edb79fcf0aea4c7ff6c270b68.png',
                name = 'rds9 bots'
            WHERE slug = 'rds9-community';
        """)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup for rapid development
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await ensure_schema_updated(conn)
        except Exception:
            pass
        try:
            await ensure_defaults(conn)
        except Exception:
            pass
    yield

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from app.core.auth import get_client_ip
from app.core.security import hash_ip

def rate_limit_key_func(request) -> str:
    ip = get_client_ip(request)
    return hash_ip(ip) if ip else "unknown_client"

limiter = Limiter(key_func=rate_limit_key_func, default_limits=["120/minute"])

app = FastAPI(
    title="Linkord API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Static file serving for uploads (safe, non-executable)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="api_uploads")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "https://linkord.net",
        "https://www.linkord.net",
        "https://linkord.site",
    ],
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)*linkord\.(net|site)$|^https://([a-zA-Z0-9-]+\.)*pages\.dev$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BODY_SIZE_GENERAL = 2 * 1024 * 1024  # 2MB
MAX_BODY_SIZE_UPLOAD = 120 * 1024 * 1024  # 120MB (動画100MB、音声60MBに対応)

# Request Size Limit Middleware (DoS / Resource Exhaustion Protection)
@app.middleware("http")
async def limit_request_size(request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            length = int(content_length)
            is_upload = request.url.path.startswith("/api/media/upload")
            limit = MAX_BODY_SIZE_UPLOAD if is_upload else MAX_BODY_SIZE_GENERAL
            if length > limit:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "リクエストサイズが上限を超えています（DoS防止制限）"}
                )
        except ValueError:
            pass
    return await call_next(request)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    if settings.APP_ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(server.router, prefix="/api")
app.include_router(minecraft.router, prefix="/api")
app.include_router(lanyard.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(donations.router, prefix="/api")
app.include_router(announcements.router, prefix="/api")
app.include_router(seo.router, prefix="/api")
app.include_router(recruitments.router, prefix="/api")
app.include_router(badge.router, prefix="/api")
app.include_router(alliances.router, prefix="/api")
app.include_router(games.router, prefix="/api")


@app.api_route("/api/health", methods=["GET", "HEAD"])
@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {
        "status": "healthy",
        "service": "linkord-api",
        "env": settings.APP_ENV
    }


@app.get("/api/stats/summary")
@app.get("/stats")
async def stats_summary():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import func, select
        from app.models.models import Account, Server
        user_count = (await db.execute(select(func.count(Account.id)).where(Account.deleted_at.is_(None)))).scalar() or 0
        server_count = (await db.execute(select(func.count(Server.id)).where(Server.is_public == True))).scalar() or 0
        return {
            "status": "ok",
            "service": "linkord-api",
            "users": user_count,
            "servers": server_count,
        }
