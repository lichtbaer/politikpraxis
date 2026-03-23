from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.schemas.save import SaveDetailResponse, SaveListItem, SaveUpsertRequest
from app.services.auth_service import get_current_user
from app.services.save_service import (
    delete_save,
    get_save_by_slot,
    get_user_saves,
    upsert_save,
)

router = APIRouter()


@router.get("", response_model=list[SaveListItem])
async def list_saves(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    saves = await get_user_saves(db, user.id)
    return [
        SaveListItem(
            id=str(s.id),
            slot=s.slot,
            name=s.name,
            partei=s.partei,
            monat=s.monat,
            wahlprognose=float(s.wahlprognose) if s.wahlprognose is not None else None,
            complexity=s.complexity,
            updated_at=s.updated_at,
        )
        for s in saves
    ]


@router.get("/{slot}", response_model=SaveDetailResponse)
async def get_save(
    slot: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if slot not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Ungültiger Slot (1–3)")
    save = await get_save_by_slot(db, user.id, slot)
    if not save:
        raise HTTPException(status_code=404, detail="Spielstand nicht gefunden")
    return SaveDetailResponse(
        id=str(save.id),
        slot=save.slot,
        name=save.name,
        partei=save.partei,
        monat=save.monat,
        wahlprognose=float(save.wahlprognose)
        if save.wahlprognose is not None
        else None,
        complexity=save.complexity,
        updated_at=save.updated_at,
        game_state=save.game_state,
        client_meta=save.client_meta or {},
    )


@router.post("/{slot}", response_model=SaveListItem)
async def save_game_slot(
    slot: int,
    req: SaveUpsertRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if slot not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Ungültiger Slot (1–3)")
    try:
        save = await upsert_save(
            db,
            user.id,
            slot,
            req.game_state,
            req.name,
            req.complexity,
            req.player_name,
            req.ausrichtung,
            req.kanzler_geschlecht,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Ungültiger Slot") from None
    return SaveListItem(
        id=str(save.id),
        slot=save.slot,
        name=save.name,
        partei=save.partei,
        monat=save.monat,
        wahlprognose=float(save.wahlprognose)
        if save.wahlprognose is not None
        else None,
        complexity=save.complexity,
        updated_at=save.updated_at,
    )


@router.delete("/{slot}")
async def remove_save(
    slot: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if slot not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Ungültiger Slot (1–3)")
    save = await get_save_by_slot(db, user.id, slot)
    if not save:
        raise HTTPException(status_code=404, detail="Spielstand nicht gefunden")
    await delete_save(db, save)
    return {"ok": True}
