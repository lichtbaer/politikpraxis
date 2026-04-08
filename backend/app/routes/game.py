import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.limiter import limiter
from app.models.user import User
from app.schemas.game import AgendaUpdateRequest, AgendaUpdateResponse
from app.services.auth_service import get_current_user
from app.services.game_state_service import get_save_for_user, update_save_game_state
from app.services.save_metadata import extract_from_game_state

router = APIRouter()


@router.post("/{save_id}/agenda", response_model=AgendaUpdateResponse)
@limiter.limit("30/minute")
async def post_game_agenda(
    request: Request,
    body: AgendaUpdateRequest,
    save_id: uuid.UUID = Path(..., description="UUID des Spielstands (game_saves.id)"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SMA-503: Spieler-Agenda (und optional Koalitions-Agenda) im gespeicherten GameState setzen.
    """
    save = await get_save_for_user(db, user.id, save_id)
    if not save:
        raise HTTPException(status_code=404, detail="Spielstand nicht gefunden")

    gs = dict(save.game_state or {})
    gs["spielerAgenda"] = list(body.spieler_agenda)
    if body.koalitions_agenda is not None:
        gs["koalitionsAgenda"] = list(body.koalitions_agenda)

    monat, partei, wahlprognose = extract_from_game_state(gs)
    save.monat = monat
    save.partei = partei
    save.wahlprognose = wahlprognose

    await update_save_game_state(db, save, gs)

    return AgendaUpdateResponse(game_state=gs)
