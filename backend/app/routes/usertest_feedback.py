"""User-Test-Feedback: internes Sammelsystem ohne externe Services."""

from __future__ import annotations

import csv
import io
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import verify_admin
from app.models.user import User
from app.models.usertest_feedback import UserTestFeedback
from app.schemas.usertest_feedback import UserTestFeedbackCreate, UserTestFeedbackResponse
from app.services.auth_service import decode_token
from app.services.rate_limit import check_and_record

logger = logging.getLogger(__name__)
router = APIRouter()
optional_bearer = HTTPBearer(auto_error=False)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


async def _get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    user_id = decode_token(credentials.credentials)
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


@router.post("/usertest-feedback", response_model=UserTestFeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    req: UserTestFeedbackCreate,
    request: Request,
    user: User | None = Depends(_get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> UserTestFeedbackResponse:
    ip = _client_ip(request)
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

    count_q = select(UserTestFeedback)
    if kontext:
        count_q = count_q.where(UserTestFeedback.kontext == kontext)
    total_result = await db.execute(count_q)
    total = len(total_result.scalars().all())

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
    writer.writerow([
        "id", "kontext", "bewertung_gesamt", "verstaendlichkeit",
        "fehler_gemeldet", "fehler_beschreibung", "positives",
        "verbesserungen", "sonstiges", "game_stat_id", "created_at",
    ])
    for r in rows:
        writer.writerow([
            str(r.id), r.kontext, r.bewertung_gesamt, r.verstaendlichkeit,
            r.fehler_gemeldet, r.fehler_beschreibung or "",
            r.positives or "", r.verbesserungen or "",
            r.sonstiges or "",
            str(r.game_stat_id) if r.game_stat_id else "",
            r.created_at.isoformat(),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=usertest_feedback.csv"},
    )
