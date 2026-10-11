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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup for rapid development
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await ensure_schema_updated(conn)
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
