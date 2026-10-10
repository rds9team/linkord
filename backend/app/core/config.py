from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "linkord_dev_secret_key_32_characters_minimum"
    FRONTEND_URL: str = "http://localhost:5173"
    API_URL: str = "http://localhost:8000"
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./linkord.db"
    
    DISCORD_CLIENT_ID: Optional[str] = None
    DISCORD_CLIENT_SECRET: Optional[str] = None
    DISCORD_REDIRECT_URI: str = "http://localhost:8000/api/auth/discord/callback"
    
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    
    PAYPAY_SUPPORT_URL: str = "https://linkord.net"
    DISCORD_DONATION_WEBHOOK_URL: Optional[str] = None
    
    STORAGE_PROVIDER: str = "local"
    UPLOAD_DIR: str = "./uploads"

    ADMIN_USERNAMES: str = "admin"

    def get_admin_usernames(self) -> list[str]:
        return [u.strip() for u in self.ADMIN_USERNAMES.split(",") if u.strip()]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        extra="ignore"
    )

settings = Settings()
