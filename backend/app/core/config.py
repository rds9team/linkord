from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_ENV: str = "development"
    TESTING: bool = False
    SECRET_KEY: str = "linkord_dev_secret_key_32_characters_minimum"
    FRONTEND_URL: str = "http://localhost:5173"
    API_URL: str = "http://localhost:8000"
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./linkord.db"
    
    DISCORD_CLIENT_ID: Optional[str] = None
    DISCORD_CLIENT_SECRET: Optional[str] = None
    DISCORD_REDIRECT_URI: str = "http://localhost:8000/api/auth/discord/callback"
    DISCORD_BOT_TOKEN: Optional[str] = None
    
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    
    PAYPAY_SUPPORT_URL: str = "https://linkord.net"
    DISCORD_DONATION_WEBHOOK_URL: Optional[str] = None
    
    STORAGE_PROVIDER: str = "local"
    UPLOAD_DIR: str = "./uploads"

    # 管理者はアカウントID（数値）で指定する。ユーザー名は登録・変更で誰でも名乗れるため権限判定に使わない
    ADMIN_ACCOUNT_IDS: str = ""

    # 信頼できるリバースプロキシのIP（カンマ区切り）。ここからの接続の場合のみ転送ヘッダーのクライアントIPを採用する
    TRUSTED_PROXY_IPS: str = "127.0.0.1,::1"

    # Pages Functions のAPIプロキシと共有するシークレット。設定時のみ X-Linkord-Client-IP を信頼する
    PROXY_SHARED_SECRET: Optional[str] = None

    def get_admin_account_ids(self) -> set[int]:
        ids = set()
        for raw in self.ADMIN_ACCOUNT_IDS.split(","):
            raw = raw.strip()
            if raw.isdigit():
                ids.add(int(raw))
        return ids

    def get_trusted_proxy_ips(self) -> set[str]:
        return {ip.strip() for ip in self.TRUSTED_PROXY_IPS.split(",") if ip.strip()}

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        extra="ignore"
    )

DEFAULT_DEV_SECRET_KEY = "linkord_dev_secret_key_32_characters_minimum"

settings = Settings()

if settings.APP_ENV == "production" and (
    settings.SECRET_KEY == DEFAULT_DEV_SECRET_KEY or len(settings.SECRET_KEY) < 32
):
    raise RuntimeError("本番環境では32文字以上のランダムな SECRET_KEY を設定してください")
