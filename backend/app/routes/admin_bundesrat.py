"""Admin-API — CRUD für Bundesrat-Fraktionen und Tradeoffs. Basic-Auth geschützt."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import validate_locale_value
from app.models.content import (
    BundesratFraktion,
    BundesratFraktionI18n,
    BundesratTradeoff,
    BundesratTradeoffI18n,
)
from app.schemas.admin import (
    BundesratFraktionCreate,
    BundesratFraktionI18nUpdate,
    BundesratTradeoffCreate,
    BundesratTradeoffI18nUpdate,
)
from app.services.content_db_service import content_cache_clear

router = APIRouter()


def _to_float(v: Decimal | float | None) -> float:
    return float(v) if v is not None else 0.0


@router.get("/bundesrat")
async def admin_list_bundesrat(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BundesratFraktion))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "laender": r.laender or [],
            "basis_bereitschaft": r.basis_bereitschaft,
            "beziehung_start": r.beziehung_start,
            "sonderregel": r.sonderregel,
            "partei_id": r.partei_id,
            "sprecher_initials": r.sprecher_initials,
            "sprecher_color": r.sprecher_color,
        }
        for r in rows
    ]


@router.post("/bundesrat")
async def admin_create_bundesrat(
    data: BundesratFraktionCreate, db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        select(BundesratFraktion).where(BundesratFraktion.id == data.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            409, detail=f"Bundesrat-Fraktion '{data.id}' existiert bereits"
        )
    f = BundesratFraktion(
        id=data.id,
        laender=data.laender,
        basis_bereitschaft=data.basis_bereitschaft,
        beziehung_start=data.beziehung_start,
        sonderregel=data.sonderregel,
        partei_id=data.partei_id,
        sprecher_initials=data.sprecher_initials,
        sprecher_color=data.sprecher_color,
    )
    db.add(f)
    await db.flush()
    content_cache_clear()
    return {"id": f.id}


@router.put("/bundesrat/{fraktion_id}/i18n/{locale}")
async def admin_upsert_bundesrat_i18n(
    fraktion_id: str,
    locale: str,
    data: BundesratFraktionI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    validate_locale_value(locale)
    result = await db.execute(
        select(BundesratFraktionI18n).where(
            BundesratFraktionI18n.fraktion_id == fraktion_id,
            BundesratFraktionI18n.locale == locale,
        )
    )
    i18n = result.scalar_one_or_none()
    if not i18n:
        if (
            data.name is None
            or data.sprecher_name is None
            or data.sprecher_partei is None
            or data.sprecher_land is None
            or data.sprecher_bio is None
        ):
            raise HTTPException(
                400,
                detail="name, sprecher_name, sprecher_partei, sprecher_land, sprecher_bio erforderlich für neue i18n-Zeile",
            )
        i18n = BundesratFraktionI18n(
            fraktion_id=fraktion_id,
            locale=locale,
            name=data.name,
            sprecher_name=data.sprecher_name,
            sprecher_partei=data.sprecher_partei,
            sprecher_land=data.sprecher_land,
            sprecher_bio=data.sprecher_bio,
        )
        db.add(i18n)
    else:
        if data.name is not None:
            i18n.name = data.name
        if data.sprecher_name is not None:
            i18n.sprecher_name = data.sprecher_name
        if data.sprecher_partei is not None:
            i18n.sprecher_partei = data.sprecher_partei
        if data.sprecher_land is not None:
            i18n.sprecher_land = data.sprecher_land
        if data.sprecher_bio is not None:
            i18n.sprecher_bio = data.sprecher_bio
    await db.flush()
    content_cache_clear()
    return {"fraktion_id": fraktion_id, "locale": locale}


@router.get("/bundesrat/{fraktion_id}/tradeoffs")
async def admin_list_bundesrat_tradeoffs(
    fraktion_id: str, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(BundesratTradeoff).where(BundesratTradeoff.fraktion_id == fraktion_id)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "tradeoff_key": r.tradeoff_key,
            "effekt_al": _to_float(r.effekt_al),
            "effekt_hh": _to_float(r.effekt_hh),
            "effekt_gi": _to_float(r.effekt_gi),
            "effekt_zf": _to_float(r.effekt_zf),
            "char_mood": r.char_mood or {},
        }
        for r in rows
    ]


@router.post("/bundesrat/{fraktion_id}/tradeoffs")
async def admin_create_bundesrat_tradeoff(
    fraktion_id: str,
    data: BundesratTradeoffCreate,
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(BundesratFraktion).where(BundesratFraktion.id == fraktion_id)
    )
    if not r.scalar_one_or_none():
        raise HTTPException(404, detail="Bundesrat-Fraktion nicht gefunden")
    t = BundesratTradeoff(
        fraktion_id=fraktion_id,
        tradeoff_key=data.tradeoff_key,
        effekt_al=Decimal(str(data.effekt_al)),
        effekt_hh=Decimal(str(data.effekt_hh)),
        effekt_gi=Decimal(str(data.effekt_gi)),
        effekt_zf=Decimal(str(data.effekt_zf)),
        char_mood=data.char_mood,
    )
    db.add(t)
    await db.flush()
    content_cache_clear()
    return {"id": t.id, "tradeoff_key": t.tradeoff_key}


@router.put("/bundesrat/{fraktion_id}/tradeoffs/{tradeoff_id}/i18n/{locale}")
async def admin_upsert_bundesrat_tradeoff_i18n(
    fraktion_id: str,
    tradeoff_id: int,
    locale: str,
    data: BundesratTradeoffI18nUpdate,
    db: AsyncSession = Depends(get_db),
):
    validate_locale_value(locale)
    result = await db.execute(
        select(BundesratTradeoff).where(
            BundesratTradeoff.id == tradeoff_id,
            BundesratTradeoff.fraktion_id == fraktion_id,
        )
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, detail="Bundesrat-Tradeoff nicht gefunden")
    r = await db.execute(
        select(BundesratTradeoffI18n).where(
            BundesratTradeoffI18n.tradeoff_id == tradeoff_id,
            BundesratTradeoffI18n.locale == locale,
        )
    )
    i18n = r.scalar_one_or_none()
    if not i18n:
        if data.label is None or data.desc is None:
            raise HTTPException(
                400,
                detail="label, desc erforderlich für neue i18n-Zeile",
            )
        i18n = BundesratTradeoffI18n(
            tradeoff_id=tradeoff_id,
            locale=locale,
            label=data.label,
            desc=data.desc,
        )
        db.add(i18n)
    else:
        if data.label is not None:
            i18n.label = data.label
        if data.desc is not None:
            i18n.desc = data.desc
    await db.flush()
    content_cache_clear()
    return {"tradeoff_id": tradeoff_id, "locale": locale}
