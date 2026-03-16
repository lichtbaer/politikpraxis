from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.mod import Mod
from app.schemas.mod import ModCreateRequest, ModResponse, ModDetailResponse
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("", response_model=list[ModResponse])
async def list_mods(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mod).order_by(Mod.downloads.desc()).limit(50))
    mods = result.scalars().all()
    return [
        ModResponse(
            id=str(m.id), author_id=str(m.author_id), title=m.title,
            description=m.description, version=m.version,
            downloads=m.downloads, created_at=m.created_at,
        )
        for m in mods
    ]


@router.get("/{mod_id}", response_model=ModDetailResponse)
async def get_mod(mod_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mod).where(Mod.id == mod_id))
    mod = result.scalar_one_or_none()
    if not mod:
        raise HTTPException(status_code=404, detail="Mod not found")
    return ModDetailResponse(
        id=str(mod.id), author_id=str(mod.author_id), title=mod.title,
        description=mod.description, version=mod.version,
        downloads=mod.downloads, created_at=mod.created_at, content=mod.content,
    )


@router.post("", response_model=ModResponse)
async def create_mod(
    req: ModCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = Mod(
        author_id=user.id,
        title=req.title,
        description=req.description,
        content=req.content,
        version=req.version,
    )
    db.add(mod)
    await db.flush()
    return ModResponse(
        id=str(mod.id), author_id=str(mod.author_id), title=mod.title,
        description=mod.description, version=mod.version,
        downloads=mod.downloads, created_at=mod.created_at,
    )


@router.get("/{mod_id}/content")
async def get_mod_content(mod_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mod).where(Mod.id == mod_id))
    mod = result.scalar_one_or_none()
    if not mod:
        raise HTTPException(status_code=404, detail="Mod not found")
    mod.downloads += 1
    await db.flush()
    return mod.content
