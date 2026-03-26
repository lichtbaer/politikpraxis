"""Admin-API — CRUD für Gesetze. Basic-Auth geschützt."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import validate_locale_value
from app.models.content import Gesetz, GesetzI18n
from app.routes.admin_utils import to_float
from app.schemas.admin import GesetzCreate, GesetzI18nUpdate, GesetzUpdate
from app.services.content_db_service import content_cache_clear

router = APIRouter()


@router.get("/gesetze")
async def admin_list_gesetze(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Gesetz))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "tags": r.tags or [],
            "bt_stimmen_ja": r.bt_stimmen_ja,
            "effekt_al": to_float(r.effekt_al),
            "effekt_hh": to_float(r.effekt_hh),
            "effekt_gi": to_float(r.effekt_gi),
            "effekt_zf": to_float(r.effekt_zf),
            "effekt_lag": r.effekt_lag,
            "foederalismus_freundlich": r.foederalismus_freundlich,
        }
        for r in rows
    ]


@router.post("/gesetze")
async def admin_create_gesetz(data: GesetzCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Gesetz).where(Gesetz.id == data.id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, detail=f"Gesetz '{data.id}' existiert bereits")
    gesetz = Gesetz(
        id=data.id,
        tags=data.tags,
        bt_stimmen_ja=data.bt_stimmen_ja,
        effekt_al=Decimal(str(data.effekt_al)),
        effekt_hh=Decimal(str(data.effekt_hh)),
        effekt_gi=Decimal(str(data.effekt_gi)),
        effekt_zf=Decimal(str(data.effekt_zf)),
        effekt_lag=data.effekt_lag,
        foederalismus_freundlich=data.foederalismus_freundlich,
    )
    db.add(gesetz)
    await db.flush()
    content_cache_clear()
    return {"id": gesetz.id}


@router.get("/gesetze/{gesetz_id}")
async def admin_get_gesetz(gesetz_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Gesetz).where(Gesetz.id == gesetz_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, detail="Gesetz nicht gefunden")
    return {
        "id": g.id,
        "tags": g.tags or [],
        "bt_stimmen_ja": g.bt_stimmen_ja,
        "effekt_al": to_float(g.effekt_al),
        "effekt_hh": to_float(g.effekt_hh),
        "effekt_gi": to_float(g.effekt_gi),
        "effekt_zf": to_float(g.effekt_zf),
        "effekt_lag": g.effekt_lag,
        "foederalismus_freundlich": g.foederalismus_freundlich,
    }


@router.put("/gesetze/{gesetz_id}")
async def admin_update_gesetz(
    gesetz_id: str, data: GesetzUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Gesetz).where(Gesetz.id == gesetz_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, detail="Gesetz nicht gefunden")
    if data.tags is not None:
        g.tags = data.tags
    if data.bt_stimmen_ja is not None:
        g.bt_stimmen_ja = data.bt_stimmen_ja
    if data.effekt_al is not None:
        g.effekt_al = Decimal(str(data.effekt_al))
    if data.effekt_hh is not None:
        g.effekt_hh = Decimal(str(data.effekt_hh))
    if data.effekt_gi is not None:
        g.effekt_gi = Decimal(str(data.effekt_gi))
    if data.effekt_zf is not None:
        g.effekt_zf = Decimal(str(data.effekt_zf))
    if data.effekt_lag is not None:
        g.effekt_lag = data.effekt_lag
    if data.foederalismus_freundlich is not None:
        g.foederalismus_freundlich = data.foederalismus_freundlich
    content_cache_clear()
    return {"id": g.id}


@router.put("/gesetze/{gesetz_id}/i18n/{locale}")
async def admin_upsert_gesetz_i18n(
    gesetz_id: str,
    locale: str,
    data: GesetzI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    validate_locale_value(locale)
    result = await db.execute(
        select(GesetzI18n).where(
            GesetzI18n.gesetz_id == gesetz_id, GesetzI18n.locale == locale
        )
    )
    i18n = result.scalar_one_or_none()
    if not i18n:
        if data.titel is None or data.kurz is None or data.desc is None:
            raise HTTPException(
                400, detail="titel, kurz, desc erforderlich für neue i18n-Zeile"
            )
        i18n = GesetzI18n(
            gesetz_id=gesetz_id,
            locale=locale,
            titel=data.titel,
            kurz=data.kurz,
            desc=data.desc,
        )
        db.add(i18n)
    else:
        if data.titel is not None:
            i18n.titel = data.titel
        if data.kurz is not None:
            i18n.kurz = data.kurz
        if data.desc is not None:
            i18n.desc = data.desc
    await db.flush()
    content_cache_clear()
    return {"gesetz_id": gesetz_id, "locale": locale}
