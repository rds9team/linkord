import httpx
import time
import asyncio
import urllib.parse
from fastapi import APIRouter

router = APIRouter(prefix="/minecraft", tags=["minecraft"])

# In-memory 30-minute cache: {f"{identifier}:{gamemode}": (timestamp, data)}
_CACHE = {}
CACHE_TTL = 1800
MAX_CACHE_SIZE = 1000

# Supported PlayHive Game Modes
GAMEMODE_INFO = {
    "bed": {"id": "bed", "name": "BedWars", "short": "BED", "special_key": "beds_destroyed", "special_label": "Beds Destroyed"},
    "bridge": {"id": "bridge", "name": "The Bridge", "short": "BRIDGE", "special_key": "goals", "special_label": "Goals"},
    "sky": {"id": "sky", "name": "SkyWars", "short": "SKY", "special_key": "mystery_chests_destroyed", "special_label": "Mystery Chests"},
    "sg": {"id": "sg", "name": "Survival Games", "short": "SG", "special_key": "crates", "special_label": "Crates Opened"},
    "murder": {"id": "murder", "name": "Murder Mystery", "short": "MURDER", "special_key": "murders", "special_label": "Murders"},
    "dr": {"id": "dr", "name": "DeathRun", "short": "DR", "special_key": "checkpoints", "special_label": "Checkpoints"},
    "drop": {"id": "drop", "name": "Block Drop", "short": "DROP", "special_key": "vaults", "special_label": "Vaults"},
    "ground": {"id": "ground", "name": "Ground Wars", "short": "GROUND", "special_key": "kills", "special_label": "Kills"},
    "ctf": {"id": "ctf", "name": "Capture The Flag", "short": "CTF", "special_key": "flags_captured", "special_label": "Flags"},
    "grav": {"id": "grav", "name": "Gravity", "short": "GRAV", "special_key": "checkpoints", "special_label": "Checkpoints"},
    "party": {"id": "party", "name": "Block Party", "short": "PARTY", "special_key": "rounds_survived", "special_label": "Rounds Survived"},
    "build": {"id": "build", "name": "Build Battle", "short": "BUILD", "special_key": "top3", "special_label": "Top 3"},
    "wars": {"id": "wars", "name": "Treasure Wars", "short": "WARS", "special_key": "treasure_destroyed", "special_label": "Treasures"},
}

GAMEMODE_MAP = {
    "bedwars": "bed",
    "bed": "bed",
    "wars": "wars",
    "treasurewars": "wars",
    "sky": "sky",
    "skywars": "sky",
    "sg": "sg",
    "survival": "sg",
    "survivalgames": "sg",
    "ctf": "ctf",
    "capturetheflag": "ctf",
    "murder": "murder",
    "murdermystery": "murder",
    "hide": "hide",
    "hideandseek": "hide",
    "dr": "dr",
    "deathrun": "dr",
    "bridge": "bridge",
    "thebridge": "bridge",
    "ground": "ground",
    "groundwars": "ground",
    "drop": "drop",
    "blockdrop": "drop",
    "grav": "grav",
    "gravity": "grav",
    "party": "party",
    "blockparty": "party",
    "build": "build",
    "buildbattle": "build",
}

@router.get("/modes")
async def list_playhive_modes():
    """Return available game modes with labels for frontend selectors."""
    return list(GAMEMODE_INFO.values())

@router.get("/{identifier}/{gamemode}")
async def get_playhive_stats(identifier: str, gamemode: str = "bed"):
    clean_identifier = identifier.strip()
    target_mode = GAMEMODE_MAP.get(gamemode.lower(), gamemode.lower())
    mode_info = GAMEMODE_INFO.get(target_mode, {
        "id": target_mode,
        "name": target_mode.upper(),
        "short": target_mode.upper(),
        "special_key": "kills",
        "special_label": "Kills"
    })

    cache_key = f"{clean_identifier.lower()}:{target_mode}"
    now = time.time()

    if cache_key in _CACHE:
        ts, data = _CACHE[cache_key]
        if now - ts < CACHE_TTL:
            if "losses" not in data or "win_rate" not in data:
                p = data.get("played", 0)
                v = data.get("victories", 0)
                data["losses"] = max(0, p - v)
                data["win_rate"] = round((v / p) * 100, 1) if p > 0 else 0.0
            return {"source": "cache", "data": data, "cached_at": ts, "has_stats": data.get("has_stats", True)}

    # Fetch from official PlayHive public API (OpenAPI v0)
    encoded_identifier = urllib.parse.quote(clean_identifier)
    url = f"https://api.playhive.com/v0/game/all/{target_mode}/{encoded_identifier}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Linkord/1.0",
        "Accept": "application/json"
    }

    raw_data = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    raw_data = resp.json()
                    break
                elif resp.status_code == 404:
                    # Player not found or has no stats in this mode
                    break
                elif resp.status_code == 429:
                    if attempt == 0:
                        await asyncio.sleep(0.8)
                        continue
        except Exception:
            if attempt == 0:
                await asyncio.sleep(0.6)
                continue

    if isinstance(raw_data, dict) and raw_data and "UUID" in raw_data:
        kills = raw_data.get("kills", 0)
        deaths = raw_data.get("deaths", 0)
        kd = round(kills / deaths, 2) if deaths > 0 else float(kills)
        special_val = raw_data.get(mode_info["special_key"], 0)
        played = raw_data.get("played", 0)
        victories = raw_data.get("victories", 0)
        losses = max(0, played - victories)
        win_rate = round((victories / played) * 100, 1) if played > 0 else 0.0

        data = {
            "UUID": raw_data.get("UUID"),
            "username": clean_identifier,
            "gamemode": target_mode,
            "gamemode_name": mode_info["name"],
            "kills": kills,
            "deaths": deaths,
            "victories": victories,
            "played": played,
            "losses": losses,
            "win_rate": win_rate,
            "xp": raw_data.get("xp", 0),
            "kd": kd,
            "prestige": raw_data.get("prestige", 0),
            "final_kills": raw_data.get("final_kills", 0),
            "special_value": special_val,
            "special_label": mode_info["special_label"],
            "has_stats": True,
            "raw": raw_data
        }
        if len(_CACHE) >= MAX_CACHE_SIZE:
            expired = [k for k, (t, _) in _CACHE.items() if now - t >= CACHE_TTL]
            for k in expired:
                _CACHE.pop(k, None)
            if len(_CACHE) >= MAX_CACHE_SIZE:
                sorted_keys = sorted(_CACHE.keys(), key=lambda k: _CACHE[k][0])
                for k in sorted_keys[:100]:
                    _CACHE.pop(k, None)

        _CACHE[cache_key] = (now, data)
        return {"source": "api", "data": data, "cached_at": now, "has_stats": True}

    # Stale cache fallback if API request failed or rate-limited
    if cache_key in _CACHE:
        ts, data = _CACHE[cache_key]
        if "losses" not in data or "win_rate" not in data:
            p = data.get("played", 0)
            v = data.get("victories", 0)
            data["losses"] = max(0, p - v)
            data["win_rate"] = round((v / p) * 100, 1) if p > 0 else 0.0
        return {"source": "stale_cache", "data": data, "cached_at": ts, "has_stats": data.get("has_stats", True)}

    # If player has no stats or API unavailable / Cloudflare blocked
    return {
        "source": "unavailable",
        "has_stats": False,
        "message": "PlayHive API 接続制限またはプレイヤーの戦績がありません",
        "data": {
            "username": clean_identifier,
            "gamemode": target_mode,
            "gamemode_name": mode_info["name"],
            "kills": 0,
            "deaths": 0,
            "victories": 0,
            "played": 0,
            "losses": 0,
            "win_rate": 0.0,
            "xp": 0,
            "kd": 0.0,
            "prestige": 0,
            "final_kills": 0,
            "special_value": 0,
            "special_label": mode_info["special_label"],
            "has_stats": False,
            "raw": {}
        },
        "cached_at": now
    }
