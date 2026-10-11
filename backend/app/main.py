from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import engine, Base
import os
from fastapi.staticfiles import StaticFiles
import app.models
from app.api import auth, profile, server, minecraft, lanyard, report, media, admin, donations

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

async def ensure_schema_updated(conn):
    # Check accounts table columns and add missing ones
    result = await conn.exec_driver_sql("PRAGMA table_info(accounts);")
    columns = [row[1] for row in result.fetchall()]
    if columns:
        if "music_url" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN music_url VARCHAR(512);")
        if "video_url" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN video_url VARCHAR(512);")
        if "hide_followers" not in columns:
            await conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN hide_followers BOOLEAN DEFAULT 0;")

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
from app.core.auth import get_client_ip

def rate_limit_key_func(request) -> str:
    ip = get_client_ip(request)
    return ip if ip else "127.0.0.1"

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
    ],
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)*linkord\.net$|^https://([a-zA-Z0-9-]+\.)*pages\.dev$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
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

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "linkord-api",
        "env": settings.APP_ENV
    }
