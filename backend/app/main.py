from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import engine, Base
import os
from fastapi.staticfiles import StaticFiles
import app.models
from app.api import auth, profile, server, minecraft, lanyard, report, media

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup for rapid development
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Linkord API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Static file serving for uploads (safe, non-executable)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "https://linkord.net"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(server.router, prefix="/api")
app.include_router(minecraft.router, prefix="/api")
app.include_router(lanyard.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(media.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "linkord-api",
        "env": settings.APP_ENV
    }
