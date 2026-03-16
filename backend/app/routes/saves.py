from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.schemas.save import SaveCreateRequest, SaveUpdateRequest, SaveResponse, SaveDetailResponse
from app.services.auth_service import get_current_user
from app.services.save_service import get_user_saves, get_save_by_id, create_save, update_save, delete_save

router = APIRouter()


@router.get("", response_model=list[SaveResponse])
async def list_saves(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    saves = await get_user_saves(db, user.id)
    return [
        SaveResponse(
            id=str(s.id), name=s.name, month=s.month,
            approval=s.approval, scenario_id=s.scenario_id, updated_at=s.updated_at,
        )
        for s in saves
    ]


@router.get("/{save_id}", response_model=SaveDetailResponse)
async def get_save(
    save_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    save = await get_save_by_id(db, save_id, user.id)
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    return SaveDetailResponse(
        id=str(save.id), name=save.name, month=save.month,
        approval=save.approval, scenario_id=save.scenario_id,
        updated_at=save.updated_at, state=save.state,
    )


@router.post("", response_model=SaveResponse)
async def save_game(
    req: SaveCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    save = await create_save(
        db, user.id, req.name, req.state, req.month, req.approval, req.scenario_id,
    )
    return SaveResponse(
        id=str(save.id), name=save.name, month=save.month,
        approval=save.approval, scenario_id=save.scenario_id, updated_at=save.updated_at,
    )


@router.put("/{save_id}", response_model=SaveResponse)
async def update_game_save(
    save_id: UUID,
    req: SaveUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    save = await get_save_by_id(db, save_id, user.id)
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    save = await update_save(db, save, req.name, req.state, req.month, req.approval)
    return SaveResponse(
        id=str(save.id), name=save.name, month=save.month,
        approval=save.approval, scenario_id=save.scenario_id, updated_at=save.updated_at,
    )


@router.delete("/{save_id}")
async def remove_save(
    save_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    save = await get_save_by_id(db, save_id, user.id)
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    await delete_save(db, save)
    return {"ok": True}
