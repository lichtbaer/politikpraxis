"""User-Test-Feedback: internes Sammelsystem ohne externe Services."""

from __future__ import annotations

import asyncio
import csv
import io
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import client_ip, get_optional_user, verify_admin
from app.models.user import User
from app.models.usertest_feedback import UserTestFeedback
from app.schemas.usertest_feedback import (
    UserTestFeedbackCreate,
    UserTestFeedbackResponse,
)
from app.services.email_service import send_feedback_notification_email
from app.services.rate_limit import check_and_record

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/usertest-feedback",
    response_model=UserTestFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_feedback(
    req: UserTestFeedbackCreate,
    request: Request,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> UserTestFeedbackResponse:
    ip = client_ip(request)
    if not check_and_record(ip, max_requests=5, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Zu viele Anfragen. Bitte später erneut versuchen.",
        )

    game_stat_uuid: UUID | None = None
    if req.game_stat_id:
        game_stat_uuid = UUID(req.game_stat_id)

    entry = UserTestFeedback(
        session_id=req.session_id,
        user_id=user.id if user else None,
        game_stat_id=game_stat_uuid,
        kontext=req.kontext,
        bewertung_gesamt=req.bewertung_gesamt,
        verstaendlichkeit=req.verstaendlichkeit,
        fehler_gemeldet=req.fehler_gemeldet,
        fehler_beschreibung=req.fehler_beschreibung or None,
        positives=req.positives or None,
        verbesserungen=req.verbesserungen or None,
        sonstiges=req.sonstiges or None,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    asyncio.create_task(
        send_feedback_notification_email(
            {
                "id": str(entry.id),
                "kontext": entry.kontext,
                "bewertung_gesamt": entry.bewertung_gesamt,
                "verstaendlichkeit": entry.verstaendlichkeit,
                "fehler_gemeldet": entry.fehler_gemeldet,
                "fehler_beschreibung": entry.fehler_beschreibung,
                "positives": entry.positives,
                "verbesserungen": entry.verbesserungen,
                "sonstiges": entry.sonstiges,
                "created_at": entry.created_at.isoformat(),
            }
        )
    )

    return UserTestFeedbackResponse(
        id=str(entry.id),
        created_at=entry.created_at.isoformat(),
    )


# --- Admin-geschützte Endpoints ---


@router.get("/admin/usertest-feedback", dependencies=[Depends(verify_admin)])
async def list_feedback(
    kontext: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    q = select(UserTestFeedback).order_by(UserTestFeedback.created_at.desc())
    if kontext:
        q = q.where(UserTestFeedback.kontext == kontext)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    rows = result.scalars().all()

    count_q = select(func.count()).select_from(UserTestFeedback)
    if kontext:
        count_q = count_q.where(UserTestFeedback.kontext == kontext)
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    return {
        "total": total,
        "items": [
            {
                "id": str(r.id),
                "kontext": r.kontext,
                "bewertung_gesamt": r.bewertung_gesamt,
                "verstaendlichkeit": r.verstaendlichkeit,
                "fehler_gemeldet": r.fehler_gemeldet,
                "fehler_beschreibung": r.fehler_beschreibung,
                "positives": r.positives,
                "verbesserungen": r.verbesserungen,
                "sonstiges": r.sonstiges,
                "game_stat_id": str(r.game_stat_id) if r.game_stat_id else None,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.get("/admin/usertest-feedback/export", dependencies=[Depends(verify_admin)])
async def export_feedback_csv(db: AsyncSession = Depends(get_db)) -> StreamingResponse:
    result = await db.execute(
        select(UserTestFeedback).order_by(UserTestFeedback.created_at.desc())
    )
    rows = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "id",
            "kontext",
            "bewertung_gesamt",
            "verstaendlichkeit",
            "fehler_gemeldet",
            "fehler_beschreibung",
            "positives",
            "verbesserungen",
            "sonstiges",
            "game_stat_id",
            "created_at",
        ]
    )
    for r in rows:
        writer.writerow(
            [
                str(r.id),
                r.kontext,
                r.bewertung_gesamt,
                r.verstaendlichkeit,
                r.fehler_gemeldet,
                r.fehler_beschreibung or "",
                r.positives or "",
                r.verbesserungen or "",
                r.sonstiges or "",
                str(r.game_stat_id) if r.game_stat_id else "",
                r.created_at.isoformat(),
            ]
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=usertest_feedback.csv"},
    )
