import httpx
import time
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/minecraft", tags=["minecraft"])

# In-memory 10-minute cache: {f"{uuid}:{gamemode}": (timestamp, data)}
_CACHE = {}
CACHE_TTL = 600

@router.get("/{uuid}/{gamemode}")
async def get_playhive_stats(uuid: str, gamemode: str):
    cache_key = f"{uuid}:{gamemode}"
    now = time.time()
    
    if cache_key in _CACHE:
        ts, data = _CACHE[cache_key]
        if now - ts < CACHE_TTL:
            return {"source": "cache", "data": data, "cached_at": ts}
            
    # Try fetching from PlayHive API
    url = f"https://api.playhive.com/v0.1/game/all/{gamemode}/{uuid}"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                _CACHE[cache_key] = (now, data)
                return {"source": "api", "data": data, "cached_at": now}
    except Exception:
        # Fallback to expired cache if available (spec.md 363)
        if cache_key in _CACHE:
            ts, data = _CACHE[cache_key]
            return {"source": "stale_cache", "data": data, "cached_at": ts}

    # Mock response if offline or mock uuid for preview/testing
    mock_data = {
        "UUID": uuid,
        "kills": 3892,
        "victories": 540,
        "played": 1280,
        "xp": 142000,
        "level": 42,
        "kd": 4.18
    }
    return {"source": "mock_fallback", "data": mock_data, "cached_at": now}
