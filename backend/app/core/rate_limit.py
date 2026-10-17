from slowapi import Limiter
from starlette.requests import Request

from app.core.auth import get_client_ip
from app.core.config import settings
from app.core.security import hash_ip


def rate_limit_key_func(request: Request) -> str:
    ip = get_client_ip(request)
    return hash_ip(ip) if ip else "unknown_client"


limiter = Limiter(key_func=rate_limit_key_func, enabled=not settings.TESTING)
