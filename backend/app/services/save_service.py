from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.save import GameSave


async def get_user_saves(db: AsyncSession, user_id: UUID) -> list[GameSave]:
    result = await db.execute(
        select(GameSave).where(GameSave.user_id == user_id).order_by(GameSave.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_save_by_id(db: AsyncSession, save_id: UUID, user_id: UUID) -> GameSave | None:
    result = await db.execute(
        select(GameSave).where(GameSave.id == save_id, GameSave.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_save(
    db: AsyncSession,
    user_id: UUID,
    name: str,
    state: dict,
    month: int,
    approval: float,
    scenario_id: str,
) -> GameSave:
    save = GameSave(
        user_id=user_id,
        name=name,
        state=state,
        month=month,
        approval=approval,
        scenario_id=scenario_id,
    )
    db.add(save)
    await db.flush()
    return save


async def update_save(
    db: AsyncSession,
    save: GameSave,
    name: str | None = None,
    state: dict | None = None,
    month: int | None = None,
    approval: float | None = None,
) -> GameSave:
    if name is not None:
        save.name = name
    if state is not None:
        save.state = state
    if month is not None:
        save.month = month
    if approval is not None:
        save.approval = approval
    await db.flush()
    return save


async def delete_save(db: AsyncSession, save: GameSave) -> None:
    await db.delete(save)
    await db.flush()
