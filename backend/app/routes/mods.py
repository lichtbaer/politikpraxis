from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.limiter import limiter
from app.models.mod import Mod
from app.models.user import User
from app.schemas.mod import ModCreateRequest, ModDetailResponse, ModResponse
from app.services.auth_service import get_current_user
from app.services.mod_validator import validate_mod_content

# Maximum size for mod content (1 MB as JSON)
MOD_CONTENT_MAX_SIZE = 1_000_000

router = APIRouter()


@router.get("", response_model=list[ModResponse])
@limiter.limit("30/minute")
async def list_mods(request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mod).order_by(Mod.downloads.desc()).limit(50))
    mods = result.scalars().all()
    return [
        ModResponse(
            id=str(m.id),
            author_id=str(m.author_id),
            title=m.title,
            description=m.description,
            version=m.version,
            downloads=m.downloads,
            created_at=m.created_at,
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
        id=str(mod.id),
        author_id=str(mod.author_id),
        title=mod.title,
        description=mod.description,
        version=mod.version,
        downloads=mod.downloads,
        created_at=mod.created_at,
        content=mod.content,
    )


@router.post("", response_model=ModResponse)
@limiter.limit("5/minute")
async def create_mod(
    request: Request,
    req: ModCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content_size = len(req.model_dump_json(include={"content"}))
    if content_size > MOD_CONTENT_MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Mod content too large ({content_size} bytes, max {MOD_CONTENT_MAX_SIZE})",
        )

    validation_errors = validate_mod_content(req.content)
    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid mod content: {'; '.join(validation_errors)}",
        )

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
        id=str(mod.id),
        author_id=str(mod.author_id),
        title=mod.title,
        description=mod.description,
        version=mod.version,
        downloads=mod.downloads,
        created_at=mod.created_at,
    )


@router.get("/{mod_id}/content")
@limiter.limit("30/minute")
async def get_mod_content(request: Request, mod_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mod).where(Mod.id == mod_id))
    mod = result.scalar_one_or_none()
    if not mod:
        raise HTTPException(status_code=404, detail="Mod not found")
    await db.execute(
        update(Mod).where(Mod.id == mod_id).values(downloads=Mod.downloads + 1)
    )
    await db.flush()
    return mod.content
