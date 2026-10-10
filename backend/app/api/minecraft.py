import httpx
import time
from fastapi import APIRouter

router = APIRouter(prefix="/minecraft", tags=["minecraft"])

# In-memory 10-minute cache: {f"{identifier}:{gamemode}": (timestamp, data)}
_CACHE = {}
CACHE_TTL = 600

GAMEMODE_MAP = {
    "bedwars": "bed",
    "bed": "bed",
    "wars": "wars",
    "treasurewars": "wars",
    "sky": "sky",
    "skywars": "sky",
    "sg": "sg",
    "survival": "sg",
    "ctf": "ctf",
    "murder": "murder",
    "hide": "hide",
    "dr": "dr",
    "deathrun": "dr",
    "bridge": "bridge",
    "ground": "ground",
    "drop": "drop",
}

@router.get("/{identifier}/{gamemode}")
async def get_playhive_stats(identifier: str, gamemode: str = "bed"):
    clean_identifier = identifier.strip()
    target_mode = GAMEMODE_MAP.get(gamemode.lower(), gamemode.lower())
    cache_key = f"{clean_identifier.lower()}:{target_mode}"
    now = time.time()

    if cache_key in _CACHE:
        ts, data = _CACHE[cache_key]
        if now - ts < CACHE_TTL:
            return {"source": "cache", "data": data, "cached_at": ts}

    # Fetch from official PlayHive public API (OpenAPI v0)
    url = f"https://api.playhive.com/v0/game/all/{target_mode}/{clean_identifier}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers={"User-Agent": "Linkord-API/1.0"})
            if resp.status_code == 200:
                raw_data = resp.json()
                if isinstance(raw_data, dict) and raw_data and "UUID" in raw_data:
                    kills = raw_data.get("kills", 0)
                    deaths = raw_data.get("deaths", 0)
                    kd = round(kills / deaths, 2) if deaths > 0 else float(kills)
                    
                    data = {
                        "UUID": raw_data.get("UUID"),
                        "username": clean_identifier,
                        "gamemode": target_mode,
                        "kills": kills,
                        "deaths": deaths,
                        "victories": raw_data.get("victories", 0),
                        "played": raw_data.get("played", 0),
                        "xp": raw_data.get("xp", 0),
                        "kd": kd,
                        "prestige": raw_data.get("prestige", 0),
                        "final_kills": raw_data.get("final_kills", 0),
                        "raw": raw_data
                    }
                    _CACHE[cache_key] = (now, data)
                    return {"source": "api", "data": data, "cached_at": now}
    except Exception:
        if cache_key in _CACHE:
            ts, data = _CACHE[cache_key]
            return {"source": "stale_cache", "data": data, "cached_at": ts}

    # If player has no stats or API unavailable
    return {
        "source": "empty",
        "data": {
            "username": clean_identifier,
            "gamemode": target_mode,
            "kills": 0,
            "deaths": 0,
            "victories": 0,
            "played": 0,
            "xp": 0,
            "kd": 0.0,
            "prestige": 0,
            "final_kills": 0
        },
        "cached_at": now
    }
