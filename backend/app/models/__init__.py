"""Registry aller ORM-Modelle.

Wichtig: Alle Modell-Module müssen hier importiert werden, damit
`Base.metadata` vollständig ist. Alembic (`app/db/migrations/env.py`) leitet
`target_metadata` daraus ab — fehlt ein Modul, würde `alembic revision
--autogenerate` dessen Tabellen als „zu löschen" vorschlagen.
`tests/test_models_registry.py` prüft die Vollständigkeit.
"""

from app.models.admin_rate_limit import AdminRateLimitBucket
from app.models.agenda_ziele import (
    AgendaZiel,
    AgendaZielI18n,
    KoalitionsZiel,
    KoalitionsZielI18n,
)
from app.models.analytics import AnalyticsEvent
from app.models.bundesrat import (
    BundesratFraktion,
    BundesratFraktionI18n,
    BundesratTradeoff,
    BundesratTradeoffI18n,
)
from app.models.chars import Char, CharI18n, Partei, ParteiI18n
from app.models.eu import (
    EuEvent,
    EuEventChoice,
    EuEventChoiceI18n,
    EuEventI18n,
    EuKlimaStartwert,
)
from app.models.events import Event, EventChoice, EventChoiceI18n, EventI18n
from app.models.game_stat import GameStat
from app.models.gesetze import Gesetz, GesetzI18n
from app.models.magic_link import MagicLink
from app.models.medien_akteur import MedienAkteur, MedienAkteurI18n
from app.models.ministerial import MinisterialInitiative, MinisterialInitiativeI18n
from app.models.mod import Mod
from app.models.password_reset_token import PasswordResetToken
from app.models.politikfelder import Milieu, MilieuI18n, Politikfeld, PolitikfeldI18n
from app.models.refresh_token import RefreshToken
from app.models.save import GameSave
from app.models.user import User
from app.models.usertest_feedback import UserTestFeedback
from app.models.verbaende import (
    Verband,
    VerbandI18n,
    VerbandsTradeoff,
    VerbandsTradeoffI18n,
)

__all__ = [
    "AdminRateLimitBucket",
    "AgendaZiel",
    "AgendaZielI18n",
    "AnalyticsEvent",
    "BundesratFraktion",
    "BundesratFraktionI18n",
    "BundesratTradeoff",
    "BundesratTradeoffI18n",
    "Char",
    "CharI18n",
    "EuEvent",
    "EuEventChoice",
    "EuEventChoiceI18n",
    "EuEventI18n",
    "EuKlimaStartwert",
    "Event",
    "EventChoice",
    "EventChoiceI18n",
    "EventI18n",
    "GameSave",
    "GameStat",
    "Gesetz",
    "GesetzI18n",
    "KoalitionsZiel",
    "KoalitionsZielI18n",
    "MagicLink",
    "MedienAkteur",
    "MedienAkteurI18n",
    "Milieu",
    "MilieuI18n",
    "MinisterialInitiative",
    "MinisterialInitiativeI18n",
    "Mod",
    "Partei",
    "ParteiI18n",
    "PasswordResetToken",
    "Politikfeld",
    "PolitikfeldI18n",
    "RefreshToken",
    "User",
    "UserTestFeedback",
    "Verband",
    "VerbandI18n",
    "VerbandsTradeoff",
    "VerbandsTradeoffI18n",
]
