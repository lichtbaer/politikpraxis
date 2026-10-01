"""#279: Beziehungsmatrix der Partei-Pool-Minister (Migration 072).

Hintergrund: Migration 067 hat die Beziehungen auf Legacy-Char-IDs ('fm', 'wm',
'kanzler', …) geseedet, die Migration 040 bereits gelöscht hatte — die Matrix war
in der Live-DB leer, ohne dass ein Test anschlug. Ziele sind Rollen-Schlüssel, die
das Frontend zur Laufzeit auf den amtierenden Minister auflöst.
"""

import pytest
from httpx import AsyncClient
from tests.conftest import requires_db

# Ressort → Rollen-Schlüssel (wie LEGACY_ID_TO_RESSORT im Frontend)
ROLLE_JE_RESSORT = {
    "finanzen": "fm",
    "wirtschaft": "wm",
    "innen": "im",
    "justiz": "jm",
    "umwelt": "um",
    "arbeit": "am",
    "gesundheit": "gm",
    "bildung": "bm",
}
GUELTIGE_ROLLEN = {*ROLLE_JE_RESSORT.values(), "kanzler"}
GUELTIGE_TYPEN = {"verbuendet", "verfeindet"}


def _rolle(char: dict) -> str | None:
    if char.get("ist_kanzler"):
        return "kanzler"
    return ROLLE_JE_RESSORT.get(char.get("ressort") or "")


async def _pool_chars(client: AsyncClient) -> list[dict]:
    r = await client.get("/api/content/chars", params={"locale": "de"})
    assert r.status_code == 200, r.status_code
    chars = r.json()
    assert isinstance(chars, list)
    pool = [c for c in chars if c.get("pool_partei")]
    assert pool, "Erwartet Partei-Pool-Chars (Migration 040)"
    return pool


@pytest.mark.asyncio
@requires_db
async def test_pool_chars_haben_beziehungen_mit_rollen_zielen(client: AsyncClient):
    problems: list[str] = []
    for char in await _pool_chars(client):
        rolle = _rolle(char)
        if rolle is None:
            problems.append(
                f"{char['id']}: keine Rolle (ressort={char.get('ressort')})"
            )
            continue
        rels = char.get("relationships") or []
        if not rels:
            problems.append(f"{char['id']}: keine relationships")
        for rel in rels:
            target = rel.get("target")
            if target not in GUELTIGE_ROLLEN:
                problems.append(
                    f"{char['id']}: Ziel '{target}' ist kein Rollen-Schlüssel"
                )
            if target == rolle:
                problems.append(f"{char['id']}: Beziehung auf die eigene Rolle")
            if rel.get("type") not in GUELTIGE_TYPEN:
                problems.append(f"{char['id']}: ungültiger Typ {rel.get('type')!r}")
            if rel.get("staerke") not in (1, 2):
                problems.append(
                    f"{char['id']}: ungültige Stärke {rel.get('staerke')!r}"
                )
    assert not problems, "\n".join(problems)


@pytest.mark.asyncio
@requires_db
async def test_pool_beziehungen_sind_symmetrisch(client: AsyncClient):
    """Jede Beziehung Rolle A → B hat ihr Spiegelbild B → A (gleicher Typ/Stärke)."""
    pool = await _pool_chars(client)
    je_rolle: dict[str, list[dict]] = {}
    for char in pool:
        rolle = _rolle(char)
        if rolle:
            je_rolle.setdefault(rolle, []).append(char)

    problems: list[str] = []
    for char in pool:
        rolle = _rolle(char)
        for rel in char.get("relationships") or []:
            for gegenueber in je_rolle.get(rel["target"], []):
                spiegel = [
                    r
                    for r in gegenueber.get("relationships") or []
                    if r.get("target") == rolle
                ]
                if not spiegel or (
                    spiegel[0].get("type"),
                    spiegel[0].get("staerke"),
                ) != (rel["type"], rel["staerke"]):
                    problems.append(
                        f"{char['id']} → {rel['target']}: kein passendes "
                        f"Spiegelbild bei {gegenueber['id']}"
                    )
    assert not problems, "\n".join(problems)
