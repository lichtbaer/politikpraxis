from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.save import GameSave
from app.services.save_metadata import extract_from_game_state


async def get_user_saves(db: AsyncSession, user_id: UUID) -> list[GameSave]:
    result = await db.execute(
        select(GameSave).where(GameSave.user_id == user_id).order_by(GameSave.slot.asc())
    )
    return list(result.scalars().all())


async def get_save_by_slot(db: AsyncSession, user_id: UUID, slot: int) -> GameSave | None:
    if slot not in (1, 2, 3):
        return None
    result = await db.execute(
        select(GameSave).where(GameSave.user_id == user_id, GameSave.slot == slot)
    )
    return result.scalar_one_or_none()


async def upsert_save(
    db: AsyncSession,
    user_id: UUID,
    slot: int,
    game_state: dict,
    name: str | None,
    complexity: int | None,
    player_name: str | None,
    ausrichtung: dict[str, float] | None,
    kanzler_geschlecht: str | None,
) -> GameSave:
    if slot not in (1, 2, 3):
        raise ValueError("invalid slot")

    monat, partei, wahlprognose = extract_from_game_state(game_state)
    now = datetime.now(timezone.utc)

    existing = await get_save_by_slot(db, user_id, slot)
    new_meta: dict = {}
    if player_name is not None:
        new_meta["player_name"] = player_name
    if ausrichtung is not None:
        new_meta["ausrichtung"] = ausrichtung
    if kanzler_geschlecht is not None:
        new_meta["kanzler_geschlecht"] = kanzler_geschlecht

    if existing:
        existing.game_state = game_state
        if name is not None:
            existing.name = name
        existing.monat = monat
        existing.partei = partei
        existing.wahlprognose = wahlprognose
        if complexity is not None:
            existing.complexity = complexity
        if new_meta:
            merged = dict(existing.client_meta or {})
            merged.update(new_meta)
            existing.client_meta = merged
        existing.updated_at = now
        await db.flush()
        return existing

    save = GameSave(
        user_id=user_id,
        slot=slot,
        name=name,
        game_state=game_state,
        partei=partei,
        monat=monat,
        wahlprognose=wahlprognose,
        complexity=complexity,
        client_meta=new_meta,
    )
    db.add(save)
    await db.flush()
    return save


async def delete_save(db: AsyncSession, save: GameSave) -> None:
    await db.delete(save)
    await db.flush()
