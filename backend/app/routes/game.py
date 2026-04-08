import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies import validate_locale_value
from app.limiter import limiter
from app.models.user import User
from app.schemas.game import (
    AgendaEvalKoalitionMiss,
    AgendaEvalResponse,
    AgendaUpdateRequest,
    AgendaUpdateResponse,
    SpielendeResponse,
)
from app.services.agenda_eval_service import apply_agenda_am_spielende
from app.services.auth_service import get_current_user
from app.services.content_db_service import (
    fetch_agenda_ziele,
    fetch_gesetze,
    fetch_koalitions_ziele,
)
from app.services.game_state_service import get_save_for_user, update_save_game_state
from app.services.historisches_urteil_service import apply_historisches_urteil_zu_bilanz
from app.services.save_metadata import extract_from_game_state
from app.services.spielende_service import build_spielende_response

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


@router.post("/{save_id}/agenda-eval", response_model=AgendaEvalResponse)
@limiter.limit("10/minute")
async def post_game_agenda_eval(
    request: Request,
    save_id: uuid.UUID = Path(..., description="UUID des Spielstands (game_saves.id)"),
    locale: str = Query(default="de"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SMA-506: Agenda- und Koalitionsziele am Spielende auswerten, Bilanz-Felder setzen,
    bei verfehlten Koalitionszielen Beziehungs-Malus anwenden (idempotent pro Spielstand).
    """
    loc = validate_locale_value(locale)
    save = await get_save_for_user(db, user.id, save_id)
    if not save:
        raise HTTPException(status_code=404, detail="Spielstand nicht gefunden")

    gs = dict(save.game_state or {})
    if not gs.get("gameOver"):
        raise HTTPException(
            status_code=400,
            detail="Agenda-Auswertung nur bei beendetem Spiel (gameOver=true)",
        )

    agenda_ziele = await fetch_agenda_ziele(db, loc)
    koalitions_ziele = await fetch_koalitions_ziele(db, loc)
    result = apply_agenda_am_spielende(gs, agenda_ziele, koalitions_ziele, locale=loc)
    new_gs = result.game_state

    gesetze_rows = await fetch_gesetze(db, loc)
    apply_historisches_urteil_zu_bilanz(new_gs, gesetze_rows)

    monat, partei, wahlprognose = extract_from_game_state(new_gs)
    save.monat = monat
    save.partei = partei
    save.wahlprognose = wahlprognose

    await update_save_game_state(db, save, new_gs)

    return AgendaEvalResponse(
        game_state=new_gs,
        spieler_erfuellt=result.spieler_erfuellt,
        spieler_gesamt=result.spieler_gesamt,
        spieler_note=result.spieler_note,
        koalition_verfehlt=[
            AgendaEvalKoalitionMiss(
                id=x["id"],
                titel=x["titel"],
                beziehung_malus=int(x["beziehung_malus"]),
            )
            for x in result.koalition_verfehlt
        ],
        koalition_beziehung_delta=result.koalition_beziehung_delta,
        already_applied=result.already_applied,
    )


@router.get("/{save_id}/spielende", response_model=SpielendeResponse)
@limiter.limit("60/minute")
async def get_game_spielende(
    request: Request,
    save_id: uuid.UUID = Path(..., description="UUID des Spielstands (game_saves.id)"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SMA-508: Abschluss-Daten (Wiederwahl, optional Bilanz/Agenda/Urteil/Gesamtnote/Archetyp).
    """
    save = await get_save_for_user(db, user.id, save_id)
    if not save:
        raise HTTPException(status_code=404, detail="Spielstand nicht gefunden")

    gs = dict(save.game_state or {})
    if not gs.get("gameOver"):
        raise HTTPException(
            status_code=400,
            detail="Spielende-Daten nur bei beendetem Spiel (gameOver=true)",
        )

    loc = "de"
    agenda_ziele = await fetch_agenda_ziele(db, loc)
    koalitions_ziele = await fetch_koalitions_ziele(db, loc)
    gesetze_rows = await fetch_gesetze(db, loc)

    payload = build_spielende_response(gs, gesetze_rows, agenda_ziele, koalitions_ziele)
    return SpielendeResponse.model_validate(payload)
