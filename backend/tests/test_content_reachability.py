"""Invarianten: Content, auf den andere Inhalte verweisen, muss über die API erreichbar sein.

Hintergrund: 22 Zufalls-Events aus random.yaml fehlten in der DB (nachgeseedet in
Migration 070). Dadurch waren alle 14 Gesetze mit `locked_until_event` im echten Spiel
unerreichbar und Follow-up-Ketten liefen ins Leere — ohne dass ein Test anschlug.
"""

import pytest
from httpx import AsyncClient
from tests.conftest import requires_db


async def _get(client: AsyncClient, path: str, locale: str = "de") -> list[dict]:
    r = await client.get(path, params={"locale": locale})
    assert r.status_code == 200, f"{path}: {r.status_code}"
    data = r.json()
    assert isinstance(data, list)
    return data


@pytest.mark.asyncio
@requires_db
async def test_locked_laws_have_an_unlocking_event_choice(client: AsyncClient):
    """Jedes gesperrte Gesetz braucht ein existierendes Event mit freischaltender Option."""
    gesetze = await _get(client, "/api/content/gesetze")
    events = {e["id"]: e for e in await _get(client, "/api/content/events")}

    locked = [g for g in gesetze if g.get("locked_until_event")]
    assert locked, "Erwartet gesperrte Gesetze (Migration 051)"

    problems: list[str] = []
    for g in locked:
        event_id = g["locked_until_event"]
        event = events.get(event_id)
        if event is None:
            problems.append(f"{g['id']}: Event '{event_id}' existiert nicht")
            continue
        unlocking = [
            c
            for c in event.get("choices", [])
            if g["id"] in (c.get("unlocks_laws") or [])
        ]
        if not unlocking:
            problems.append(
                f"{g['id']}: keine Option von '{event_id}' schaltet es frei"
            )
    assert not problems, "\n".join(problems)


@pytest.mark.asyncio
@requires_db
async def test_unlocks_laws_reference_existing_laws(client: AsyncClient):
    gesetz_ids = {g["id"] for g in await _get(client, "/api/content/gesetze")}
    events = await _get(client, "/api/content/events")
    dangling = [
        f"{e['id']} → {law}"
        for e in events
        for c in e.get("choices", [])
        for law in c.get("unlocks_laws") or []
        if law not in gesetz_ids
    ]
    assert not dangling, f"unlocks_laws auf unbekannte Gesetze: {dangling}"


@pytest.mark.asyncio
@requires_db
async def test_followup_targets_exist(client: AsyncClient):
    events = await _get(client, "/api/content/events")
    ids = {e["id"] for e in events}
    dangling = [
        f"{e['id']} → {c['followup_event_id']}"
        for e in events
        for c in e.get("choices", [])
        if c.get("followup_event_id") and c["followup_event_id"] not in ids
    ]
    assert not dangling, f"Follow-ups ohne Ziel-Event: {dangling}"


@pytest.mark.asyncio
@requires_db
async def test_seeded_random_events_have_english_texts(client: AsyncClient):
    """Die nachgeseedeten Events kommen in en nicht per Fallback auf Deutsch."""
    events = {e["id"]: e for e in await _get(client, "/api/content/events", "en")}
    naturkatastrophe = events["naturkatastrophe"]
    assert naturkatastrophe["title"] == "Century flood devastates southern Germany"
    assert naturkatastrophe["choices"][0]["label"] == "Emergency aid package"
