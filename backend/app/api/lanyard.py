import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/lanyard", tags=["lanyard"])

@router.get("/{discord_id}")
async def get_lanyard_presence(discord_id: str):
    clean_id = discord_id.strip()
    if not clean_id.isdigit() or not (17 <= len(clean_id) <= 21):
        return {
            "success": False,
            "data": {
                "discord_status": "offline",
                "spotify": None,
                "activities": []
            }
        }

    url = f"https://api.lanyard.rest/v1/users/{clean_id}"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                return {"success": True, "data": data}
    except Exception:
        pass
        
    # Safe fallback (spec.md 304, 307)
    return {
        "success": False,
        "data": {
            "discord_status": "offline",
            "spotify": None,
            "activities": []
        }
    }
