from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.models.models import Game
from app.schemas.schemas import GameOut, GameCreate

router = APIRouter(prefix="/games", tags=["games"])

POPULAR_DEFAULT_GAMES = [
    "Apex Legends",
    "VALORANT",
    "Minecraft",
    "原神 (Genshin Impact)",
    "崩壊: スターレイル",
    "Overwatch 2",
    "League of Legends",
    "Fortnite",
    "Rainbow Six Siege",
    "Escape from Tarkov",
    "モンスターハンター: ワールド / ワイルズ",
    "Street Fighter 6",
    "スプラトゥーン3",
    "大乱闘スマッシュブラザーズ SPECIAL",
    "ポケットモンスター",
    "Rust",
    "Dead by Daylight",
    "ARK: Survival Evolved / Ascended",
    "VRChat",
    "Shadowverse: Worlds Beyond",
    "Identity V (第五人格)",
    "PUBG: BATTLEGROUNDS",
    "Teamfight Tactics",
    "Counter-Strike 2",
    "ブルーアーカイブ",
    "Fate/Grand Order",
    "鳴潮 (Wuthering Waves)",
    "ゼルダの伝説",
    "Call of Duty: Warzone",
    "Roblox",
    "osu!",
    "FINAL FANTASY XIV",
    "雑談・作業"
]

async def seed_popular_games(db: AsyncSession):
    for game_name in POPULAR_DEFAULT_GAMES:
        name_clean = game_name.strip()
        stmt = select(Game).where(Game.name == name_clean)
        res = await db.execute(stmt)
        if not res.scalars().first():
            db.add(Game(name=name_clean))
    await db.commit()

@router.get("", response_model=list[GameOut])
async def search_games(
    q: Optional[str] = Query(None, description="ゲーム名検索"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Game)
    if q and q.strip():
        search_term = f"%{q.strip()}%"
        stmt = stmt.where(Game.name.ilike(search_term))
    stmt = stmt.order_by(Game.name.asc()).limit(limit)
    res = await db.execute(stmt)
    games = res.scalars().all()

    # DBが空の場合はデフォルトゲームをシード
    if not games and not q:
        await seed_popular_games(db)
        res2 = await db.execute(stmt)
        games = res2.scalars().all()

    return games

@router.post("", response_model=GameOut, status_code=status.HTTP_201_CREATED)
async def create_game(
    data: GameCreate,
    db: AsyncSession = Depends(get_db)
):
    name_clean = data.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="ゲーム名を入力してください")

    stmt = select(Game).where(Game.name == name_clean)
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        return existing

    new_game = Game(name=name_clean)
    db.add(new_game)
    await db.commit()
    await db.refresh(new_game)
    return new_game
