import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.save import GameSave


async def get_save_for_user(
    db: AsyncSession, user_id: uuid.UUID, save_id: uuid.UUID
) -> GameSave | None:
    result = await db.execute(
        select(GameSave).where(
            GameSave.id == save_id,
            GameSave.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def update_save_game_state(
    db: AsyncSession, save: GameSave, game_state: dict
) -> GameSave:
    save.game_state = game_state
    await db.flush()
    return save
