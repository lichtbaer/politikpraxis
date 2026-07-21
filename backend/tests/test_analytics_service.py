"""Unit-Tests für app.services.analytics_service — UUID-Handling ohne DB (#250)."""

import uuid

import pytest
from app.schemas.analytics import AnalyticsEventRequest
from app.services.analytics_service import record_events
from pydantic import ValidationError


def test_analytics_event_request_invalid_save_id_raises_validation_error():
    """save_id ist kein UUID-Format → 422 statt späterem 500 in record_events."""
    with pytest.raises(ValidationError):
        AnalyticsEventRequest(event_type="game_end", game_month=1, save_id="not-a-uuid")


def test_analytics_event_request_valid_save_id_parses_to_uuid():
    save_id = uuid.uuid4()
    req = AnalyticsEventRequest(
        event_type="game_end", game_month=1, save_id=str(save_id)
    )
    assert req.save_id == save_id


def test_analytics_event_request_no_save_id_is_none():
    req = AnalyticsEventRequest(event_type="game_end", game_month=1)
    assert req.save_id is None


class _FlushOnlySession:
    """Fake AsyncSession, die nur `add()`/`flush()` unterstützt."""

    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        pass


@pytest.mark.asyncio
async def test_record_events_stores_uuid_save_id_without_reconversion():
    """save_id kommt bereits als UUID-Objekt (aus dem validierten Schema) an."""
    db = _FlushOnlySession()
    save_id = uuid.uuid4()
    count = await record_events(
        db,
        uuid.uuid4(),
        [
            {
                "save_id": save_id,
                "event_type": "game_end",
                "payload": {},
                "game_month": 1,
            }
        ],
    )
    assert count == 1
    assert db.added[0].save_id == save_id


@pytest.mark.asyncio
async def test_record_events_missing_save_id_is_none():
    db = _FlushOnlySession()
    count = await record_events(
        db,
        uuid.uuid4(),
        [{"event_type": "game_start", "payload": {}, "game_month": 0}],
    )
    assert count == 1
    assert db.added[0].save_id is None
