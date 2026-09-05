"""#272: Story-Arc-Schema (arc_id/arc_stage) + Follow-up-Pipeline-Fix + Arc "Der Beraterskandal".

Fügt `arc_id`/`arc_stage` auf `events` sowie `followup_delay`/`unlocks_laws` auf
`event_choices` hinzu. Die beiden letzteren Felder existierten bisher nur im
YAML-Content und im Frontend-Typ (`EventChoice.followup_delay`/`unlocks_laws`),
nie in der DB — dadurch griffen sie über den echten `/content/events`-Pfad nie
(siehe `content_db_service.fetch_events`, das `followup_event_id` bislang gar
nicht zurückgab). Diese Migration schließt die Lücke für neue Inhalte; die
bestehenden fünf Follow-up-Ketten aus `random.yaml` bleiben bewusst unangetastet
— ihre Zielevents existieren laut Migration 064 ohnehin noch nicht in der DB
(vorbestehender Content-Drift, verwandt zu #244), das rückwirkend zu beheben
ist eine eigene, größere Aufgabe außerhalb dieses Issues.

Seedet den ersten kuratierten Story-Arc "Der Beraterskandal" (3 Stufen, echte
Verzweigung nach Stufe 1 je nach Reaktion) direkt in die DB, damit er über den
echten Content-Pfad spielbar ist — nicht nur im YAML-Offline-Fallback.

Revision ID: 065_event_arcs_sma272
Revises: 064_events_pool_staffelung_sma273
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "065_event_arcs_sma272"
down_revision: Union[str, Sequence[str], None] = "064_events_pool_staffelung_sma273"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (id, arc_stage, event_type, min_complexity)
_EVENTS = [
    ("beraterskandal_enthuellung", 1, "danger", 1),
    ("beraterskandal_pruefbericht", 2, "danger", 1),
    ("beraterskandal_leak", 2, "danger", 1),
    ("beraterskandal_ausschuss", 3, "danger", 1),
]
_ARC_ID = "beraterskandal"

# (event_id, locale, type_label, title, quote, context, ticker)
_EVENTS_I18N = [
    (
        "beraterskandal_enthuellung",
        "de",
        "Berater-Affäre",
        "Enthüllung: Millionenverträge ohne Ausschreibung",
        "Investigativjournalisten decken auf: Ihr Haus hat Beraterverträge im "
        "zweistelligen Millionenbereich ohne Ausschreibung vergeben.",
        "Die Opposition wittert Morgenluft, Braun fordert Aufklärung. Wie Sie "
        "jetzt reagieren, entscheidet, ob die Affäre abklingt oder eskaliert.",
        "Berater-Affäre: Millionenverträge ohne Ausschreibung entdeckt",
    ),
    (
        "beraterskandal_enthuellung",
        "en",
        "Consultancy affair",
        "Revealed: multi-million consulting contracts without tender",
        "Investigative journalists reveal that your department awarded "
        "consulting contracts worth tens of millions without any public tender.",
        "The opposition smells blood; Braun demands answers. How you respond "
        "now decides whether the affair fades or escalates.",
        "Consultancy affair: multi-million contracts without tender uncovered",
    ),
    (
        "beraterskandal_pruefbericht",
        "de",
        "Berater-Affäre",
        "Prüfbericht bestätigt Versäumnisse — würdigt aber Kooperation",
        "Der unabhängige Prüfbericht liegt vor: Versäumnisse werden bestätigt, "
        "die Kooperation der Regierung aber ausdrücklich gelobt.",
        "Die Medien würdigen die Offenheit. Die Opposition sucht dennoch nach "
        "einem neuen Angriffspunkt für einen Untersuchungsausschuss.",
        "Prüfbericht zur Berater-Affäre: Versäumnisse bestätigt",
    ),
    (
        "beraterskandal_pruefbericht",
        "en",
        "Consultancy affair",
        "Review confirms failings — but praises cooperation",
        "The independent review is in: failings are confirmed, but the "
        "government's cooperation is explicitly praised.",
        "The press credits the openness. The opposition still hunts for a new "
        "angle for a committee of inquiry.",
        "Consultancy affair review: failings confirmed",
    ),
    (
        "beraterskandal_leak",
        "de",
        "Berater-Affäre",
        "Interne E-Mails geleakt — Vertuschungsvorwurf im Raum",
        "Ein Whistleblower leakt interne E-Mails: Kritik am Vergabeverfahren "
        "wurde demnach bewusst unterdrückt.",
        "Der Vertuschungsvorwurf wiegt schwerer als die ursprüngliche Affäre. "
        "Braun fordert einen Untersuchungsausschuss.",
        "Berater-Affäre: Leak nährt Vertuschungsvorwurf",
    ),
    (
        "beraterskandal_leak",
        "en",
        "Consultancy affair",
        "Internal emails leaked — cover-up accusation looms",
        "A whistleblower leaks internal emails: criticism of the award process "
        "was allegedly suppressed deliberately.",
        "The cover-up accusation weighs heavier than the original affair. Braun "
        "demands a committee of inquiry.",
        "Consultancy affair: leak fuels cover-up accusation",
    ),
    (
        "beraterskandal_ausschuss",
        "de",
        "Berater-Affäre",
        "Untersuchungsausschuss nimmt Arbeit auf",
        "Der Bundestag hat einen Untersuchungsausschuss zur Berater-Affäre eingesetzt.",
        "Nach Wochen der Berichterstattung entscheidet sich jetzt, ob die "
        "Affäre politisch abgehakt werden kann.",
        "Untersuchungsausschuss zur Berater-Affäre nimmt Arbeit auf",
    ),
    (
        "beraterskandal_ausschuss",
        "en",
        "Consultancy affair",
        "Committee of inquiry begins its work",
        "The Bundestag has set up a committee of inquiry into the consultancy affair.",
        "After weeks of coverage, it's now decided whether the affair can be "
        "put to rest politically.",
        "Consultancy affair committee of inquiry begins work",
    ),
]

# (event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi,
#  effekt_zf, char_mood, followup_event_id, followup_delay)
_CHOICES = [
    (
        "beraterskandal_enthuellung",
        "aufklaeren",
        "safe",
        10,
        0,
        0,
        0,
        -3,
        {"jm": 1},
        "beraterskandal_pruefbericht",
        1,
    ),
    (
        "beraterskandal_enthuellung",
        "verteidigen",
        "danger",
        5,
        0,
        0,
        0,
        -1,
        {"im": 1},
        "beraterskandal_leak",
        1,
    ),
    (
        "beraterskandal_pruefbericht",
        "konsequenzen",
        "primary",
        8,
        0,
        0,
        0,
        1,
        {"fm": -1},
        "beraterskandal_ausschuss",
        1,
    ),
    (
        "beraterskandal_pruefbericht",
        "reform",
        "safe",
        5,
        0,
        0.1,
        0,
        0,
        {"wm": 1},
        "beraterskandal_ausschuss",
        1,
    ),
    (
        "beraterskandal_leak",
        "spaet_aufklaeren",
        "safe",
        12,
        0,
        0,
        0,
        -5,
        {"jm": 1, "im": -1},
        "beraterskandal_ausschuss",
        1,
    ),
    (
        "beraterskandal_leak",
        "aussitzen",
        "danger",
        0,
        0,
        0,
        0,
        -7,
        {"im": -1, "jm": -2},
        "beraterskandal_ausschuss",
        1,
    ),
    (
        "beraterskandal_ausschuss",
        "kooperieren",
        "primary",
        15,
        0,
        0,
        0,
        2,
        {"jm": 1},
        None,
        None,
    ),
    (
        "beraterskandal_ausschuss",
        "anwaelte",
        "danger",
        5,
        0,
        0,
        0,
        -2,
        {"im": 1, "jm": -1},
        None,
        None,
    ),
]

# (event_id, choice_key, locale, label, desc, log_msg)
_CHOICES_I18N = [
    (
        "beraterskandal_enthuellung",
        "aufklaeren",
        "de",
        "Rückhaltlose Aufklärung",
        "Alle Verträge offenlegen, unabhängige Prüfung einsetzen",
        "Alle Verträge offengelegt. Kurzfristiger Image-Schaden, aber Transparenz überzeugt.",
    ),
    (
        "beraterskandal_enthuellung",
        "aufklaeren",
        "en",
        "Full disclosure",
        "Release all contracts, commission an independent review",
        "All contracts disclosed. Short-term damage, but transparency builds trust.",
    ),
    (
        "beraterskandal_enthuellung",
        "verteidigen",
        "de",
        "Verträge verteidigen",
        "Vergabe als branchenüblich darstellen, keine Details veröffentlichen",
        "Verträge verteidigt, keine Details veröffentlicht. Reporter graben weiter.",
    ),
    (
        "beraterskandal_enthuellung",
        "verteidigen",
        "en",
        "Defend the contracts",
        "Frame the awards as industry-standard, release no details",
        "Contracts defended, no details released. Reporters keep digging.",
    ),
    (
        "beraterskandal_pruefbericht",
        "konsequenzen",
        "de",
        "Konsequenzen ziehen",
        "Verantwortliche Abteilungsleitung austauschen",
        "Personelle Konsequenzen gezogen. Glaubwürdigkeit gestärkt.",
    ),
    (
        "beraterskandal_pruefbericht",
        "konsequenzen",
        "en",
        "Draw consequences",
        "Replace the responsible department head",
        "Personnel consequences drawn. Credibility strengthened.",
    ),
    (
        "beraterskandal_pruefbericht",
        "reform",
        "de",
        "Vergabereform ankündigen",
        "Neue Ausschreibungsregeln für Beraterverträge",
        "Vergabereform angekündigt. Wirtschaftsverbände zurückhaltend positiv.",
    ),
    (
        "beraterskandal_pruefbericht",
        "reform",
        "en",
        "Announce procurement reform",
        "New tendering rules for consulting contracts",
        "Procurement reform announced. Business associations cautiously positive.",
    ),
    (
        "beraterskandal_leak",
        "spaet_aufklaeren",
        "de",
        "Jetzt doch aufklären",
        "Nachträglich alle Unterlagen offenlegen",
        "Nachträgliche Offenlegung. Vertrauen beschädigt, aber Schadensbegrenzung gelungen.",
    ),
    (
        "beraterskandal_leak",
        "spaet_aufklaeren",
        "en",
        "Come clean now",
        "Belatedly release all documents",
        "Belated disclosure. Trust damaged, but damage control succeeded.",
    ),
    (
        "beraterskandal_leak",
        "aussitzen",
        "de",
        "Aussitzen",
        "Keine weiteren Stellungnahmen, auf Rückgang der Aufmerksamkeit hoffen",
        "Vorwürfe ausgesessen. Vertrauensverlust hält an.",
    ),
    (
        "beraterskandal_leak",
        "aussitzen",
        "en",
        "Sit it out",
        "No further statements, hope attention fades",
        "Accusations sat out. Loss of trust persists.",
    ),
    (
        "beraterskandal_ausschuss",
        "kooperieren",
        "de",
        "Uneingeschränkt kooperieren",
        "Alle Akten zur Verfügung stellen, persönlich aussagen",
        "Uneingeschränkte Kooperation. Ausschuss würdigt Transparenz, Affäre verliert an Sprengkraft.",
    ),
    (
        "beraterskandal_ausschuss",
        "kooperieren",
        "en",
        "Cooperate fully",
        "Provide all files, testify in person",
        "Full cooperation. The committee credits the transparency; the affair loses its bite.",
    ),
    (
        "beraterskandal_ausschuss",
        "anwaelte",
        "de",
        "Auf Anwälte verlassen",
        "Rechtlich absichern, Aussagen minimieren",
        "Anwälte übernehmen. Ausschuss wirkt blockiert, öffentlicher Unmut wächst.",
    ),
    (
        "beraterskandal_ausschuss",
        "anwaelte",
        "en",
        "Rely on lawyers",
        "Secure legally, minimize testimony",
        "Lawyers take over. The committee appears stonewalled, public frustration grows.",
    ),
]


def upgrade() -> None:
    op.add_column("events", sa.Column("arc_id", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("arc_stage", sa.Integer(), nullable=True))
    op.add_column(
        "event_choices", sa.Column("followup_delay", sa.Integer(), nullable=True)
    )
    op.add_column(
        "event_choices",
        sa.Column("unlocks_laws", postgresql.ARRAY(sa.Text()), nullable=True),
    )

    conn = op.get_bind()

    for eid, arc_stage, event_type, min_complexity in _EVENTS:
        conn.execute(
            sa.text(
                """
                INSERT INTO events (id, event_type, min_complexity, arc_id, arc_stage)
                VALUES (:id, :event_type, :min_complexity, :arc_id, :arc_stage)
                """
            ),
            {
                "id": eid,
                "event_type": event_type,
                "min_complexity": min_complexity,
                "arc_id": _ARC_ID,
                "arc_stage": arc_stage,
            },
        )

    for eid, locale, type_label, title, quote, context, ticker in _EVENTS_I18N:
        conn.execute(
            sa.text(
                """
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, :locale, :type_label, :title, :quote, :context, :ticker)
                """
            ),
            {
                "eid": eid,
                "locale": locale,
                "type_label": type_label,
                "title": title,
                "quote": quote,
                "context": context,
                "ticker": ticker,
            },
        )

    choice_ids: dict[tuple[str, str], Any] = {}
    for (
        eid,
        choice_key,
        choice_type,
        cost_pk,
        al,
        hh,
        gi,
        zf,
        char_mood,
        followup_event_id,
        followup_delay,
    ) in _CHOICES:
        result = conn.execute(
            sa.text(
                """
                INSERT INTO event_choices (
                    event_id, choice_key, choice_type, cost_pk,
                    effekt_al, effekt_hh, effekt_gi, effekt_zf,
                    char_mood, followup_event_id, followup_delay
                )
                VALUES (
                    :eid, :key, :type, :cost_pk,
                    :al, :hh, :gi, :zf,
                    CAST(:char_mood AS jsonb), :followup_event_id, :followup_delay
                )
                RETURNING id
                """
            ),
            {
                "eid": eid,
                "key": choice_key,
                "type": choice_type,
                "cost_pk": cost_pk,
                "al": al,
                "hh": hh,
                "gi": gi,
                "zf": zf,
                "char_mood": json.dumps(char_mood),
                "followup_event_id": followup_event_id,
                "followup_delay": followup_delay,
            },
        )
        choice_ids[(eid, choice_key)] = result.scalar_one()

    for eid, choice_key, locale, label, desc, log_msg in _CHOICES_I18N:
        conn.execute(
            sa.text(
                """
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:choice_id, :locale, :label, :desc, :log_msg)
                """
            ),
            {
                "choice_id": choice_ids[(eid, choice_key)],
                "locale": locale,
                "label": label,
                "desc": desc,
                "log_msg": log_msg,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    event_ids = [eid for eid, *_ in _EVENTS]
    conn.execute(
        sa.text(
            "DELETE FROM event_choices_i18n WHERE choice_id IN "
            "(SELECT id FROM event_choices WHERE event_id = ANY(:eids))"
        ),
        {"eids": event_ids},
    )
    conn.execute(
        sa.text("DELETE FROM event_choices WHERE event_id = ANY(:eids)"),
        {"eids": event_ids},
    )
    conn.execute(
        sa.text("DELETE FROM events_i18n WHERE event_id = ANY(:eids)"),
        {"eids": event_ids},
    )
    conn.execute(
        sa.text("DELETE FROM events WHERE id = ANY(:eids)"),
        {"eids": event_ids},
    )

    op.drop_column("event_choices", "unlocks_laws")
    op.drop_column("event_choices", "followup_delay")
    op.drop_column("events", "arc_stage")
    op.drop_column("events", "arc_id")
