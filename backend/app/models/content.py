"""Re-Export aller Content-Models für Backward Compatibility.

Die eigentlichen Model-Definitionen befinden sich in den Domain-Modulen:
  chars.py, gesetze.py, events.py, bundesrat.py,
  politikfelder.py, verbaende.py, eu.py, ministerial.py
"""

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
from app.models.gesetze import Gesetz, GesetzI18n
from app.models.ministerial import MinisterialInitiative, MinisterialInitiativeI18n
from app.models.medien_akteur import MedienAkteur
from app.models.politikfelder import Milieu, MilieuI18n, Politikfeld, PolitikfeldI18n
from app.models.verbaende import (
    Verband,
    VerbandI18n,
    VerbandsTradeoff,
    VerbandsTradeoffI18n,
)

__all__ = [
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
    "Gesetz",
    "GesetzI18n",
    "MedienAkteur",
    "Milieu",
    "MilieuI18n",
    "MinisterialInitiative",
    "MinisterialInitiativeI18n",
    "Partei",
    "ParteiI18n",
    "Politikfeld",
    "PolitikfeldI18n",
    "Verband",
    "VerbandI18n",
    "VerbandsTradeoff",
    "VerbandsTradeoffI18n",
]
