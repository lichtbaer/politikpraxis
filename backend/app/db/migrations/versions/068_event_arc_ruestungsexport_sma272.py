"""#272: Zweiter Story-Arc "Rüstungsexport-Kontroverse".

Nutzt das in #379 (Migration 065) geschaffene Arc-Schema (`arc_id`/`arc_stage`
auf `events`) ohne weitere Engine-Änderungen. Ein Re-Export-Skandal um
deutsche Rüstungsgüter verzweigt nach der Ausgangsentscheidung in zwei
unterschiedliche Eskalationswege (Industrie-Gegenwind vs. parlamentarische
Untersuchung), die in einer Debatte über ein Rüstungsexportkontrollgesetz
zusammenlaufen.

Revision ID: 068_event_arc_ruestungsexport_sma272
Revises: 067_char_beziehungen_sma279
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "068_event_arc_ruestungsexport_sma272"
down_revision: Union[str, Sequence[str], None] = "067_char_beziehungen_sma279"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ARC_ID = "ruestungsexport"

# (id, arc_stage, event_type, min_complexity)
_EVENTS = [
    ("ruestungsexport_enthuellung", 1, "danger", 1),
    ("ruestungsexport_industrie", 2, "warn", 1),
    ("ruestungsexport_untersuchung", 2, "danger", 1),
    ("ruestungsexport_kontrollgesetz", 3, "primary", 1),
]

# (event_id, locale, type_label, title, quote, context, ticker)
_EVENTS_I18N = [
    (
        "ruestungsexport_enthuellung",
        "de",
        "Rüstungsexportaffäre",
        "Recherche: Deutsche Waffen über Umweg im Konfliktgebiet aufgetaucht",
        "Ein Rechercheverbund weist nach: Rüstungsgüter aus deutscher Produktion "
        "wurden über einen Zwischenhändler in ein Konfliktgebiet weiterverkauft "
        "— entgegen den Endverbleibserklärungen.",
        "Außenminister-Kollegen der EU fragen nach, Menschenrechtsorganisationen "
        "fordern einen sofortigen Exportstopp. Die Werften-Region hängt an den "
        "Aufträgen.",
        "Rüstungsexportaffäre: deutsche Waffen im Konfliktgebiet aufgetaucht",
    ),
    (
        "ruestungsexport_enthuellung",
        "en",
        "Arms export affair",
        "Investigation: German-made weapons surface in conflict zone via detour",
        "A journalist consortium proves that German-made arms were resold "
        "through an intermediary into a conflict zone — in breach of the "
        "end-use declarations.",
        "EU counterparts are asking questions; human rights groups demand an "
        "immediate export freeze. The shipyard region depends on the orders.",
        "Arms export affair: German weapons surface in conflict zone",
    ),
    (
        "ruestungsexport_industrie",
        "de",
        "Rüstungsexportaffäre",
        "Werften-Region protestiert gegen Exportstopp",
        "Nach dem Exportstopp gehen in der Werften-Region Beschäftigte auf die "
        "Straße. Betriebsräte warnen vor tausenden Arbeitsplätzen.",
        "Wirtschaftsministerin Maier drängt auf eine schnelle Lösung, bevor "
        "Zulieferer Kurzarbeit anmelden.",
        "Exportstopp: Werften-Region fürchtet um Arbeitsplätze",
    ),
    (
        "ruestungsexport_industrie",
        "en",
        "Arms export affair",
        "Shipyard region protests the export freeze",
        "Following the export freeze, workers in the shipyard region take to "
        "the streets. Works councils warn of thousands of job losses.",
        "Economy Minister Maier pushes for a quick fix before suppliers file "
        "for short-time work.",
        "Export freeze: shipyard region fears for jobs",
    ),
    (
        "ruestungsexport_untersuchung",
        "de",
        "Rüstungsexportaffäre",
        "Bundestag richtet Untersuchungsausschuss zur Endverbleibskontrolle ein",
        "Weil der Vertrag trotz Warnzeichen nicht gestoppt wurde, richtet der "
        "Bundestag einen Untersuchungsausschuss zur Endverbleibskontrolle ein.",
        "Die Opposition wittert ein Kontrollversagen im Wirtschaftsministerium. "
        "Justizministerin Kern verlangt lückenlose Aufklärung.",
        "Untersuchungsausschuss zur Rüstungsexport-Endverbleibskontrolle",
    ),
    (
        "ruestungsexport_untersuchung",
        "en",
        "Arms export affair",
        "Bundestag sets up committee on end-use verification",
        "Because the contract was not halted despite warning signs, the "
        "Bundestag sets up a committee of inquiry into end-use verification.",
        "The opposition suspects an oversight failure at the economy "
        "ministry. Justice Minister Kern demands full transparency.",
        "Committee of inquiry into arms-export end-use verification",
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "de",
        "Rüstungsexportaffäre",
        "Debatte um ein neues Rüstungsexportkontrollgesetz",
        "Nach Wochen der Berichterstattung liegt ein Entwurf für ein "
        "verschärftes Rüstungsexportkontrollgesetz vor.",
        "Menschenrechtsorganisationen und Rüstungsindustrie liefern sich einen "
        "letzten Schlagabtausch, bevor der Bundestag entscheidet.",
        "Rüstungsexportkontrollgesetz: Bundestag vor Entscheidung",
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "en",
        "Arms export affair",
        "Debate over a new arms export control law",
        "After weeks of coverage, a draft for a tightened arms export control "
        "law is on the table.",
        "Human rights groups and the arms industry trade final blows before "
        "the Bundestag decides.",
        "Arms export control law: Bundestag faces decision",
    ),
]

# (event_id, choice_key, choice_type, cost_pk, effekt_al, effekt_hh, effekt_gi,
#  effekt_zf, char_mood, followup_event_id, followup_delay)
_CHOICES = [
    (
        "ruestungsexport_enthuellung",
        "exportstopp",
        "safe",
        8,
        0,
        0,
        0.2,
        1,
        {"wm": -1, "jm": 1},
        "ruestungsexport_industrie",
        1,
    ),
    (
        "ruestungsexport_enthuellung",
        "vertraege_halten",
        "danger",
        3,
        0,
        0,
        -0.1,
        -1,
        {"wm": 1, "jm": -1},
        "ruestungsexport_untersuchung",
        1,
    ),
    (
        "ruestungsexport_industrie",
        "konversion",
        "primary",
        12,
        0.1,
        -0.3,
        0.1,
        2,
        {"wm": 1},
        "ruestungsexport_kontrollgesetz",
        1,
    ),
    (
        "ruestungsexport_industrie",
        "ausnahmen",
        "danger",
        4,
        -0.1,
        0.1,
        -0.2,
        -1,
        {"wm": 1, "jm": -1},
        "ruestungsexport_kontrollgesetz",
        1,
    ),
    (
        "ruestungsexport_untersuchung",
        "akteneinsicht",
        "safe",
        6,
        0,
        0,
        0.1,
        2,
        {"jm": 1},
        "ruestungsexport_kontrollgesetz",
        1,
    ),
    (
        "ruestungsexport_untersuchung",
        "staatswohl",
        "danger",
        2,
        0,
        0,
        -0.2,
        -4,
        {"im": 1, "jm": -1},
        "ruestungsexport_kontrollgesetz",
        1,
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "strenges_gesetz",
        "primary",
        10,
        0.1,
        0,
        0.3,
        3,
        {"wm": -1, "jm": 1},
        None,
        None,
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "kompromiss",
        "safe",
        5,
        0,
        0,
        0.1,
        1,
        {"wm": 1},
        None,
        None,
    ),
]

# (event_id, choice_key, locale, label, desc, log_msg)
_CHOICES_I18N = [
    (
        "ruestungsexport_enthuellung",
        "exportstopp",
        "de",
        "Exportstopp verhängen",
        "Lieferungen an den betroffenen Empfänger sofort einstellen",
        "Exportstopp verhängt. Menschenrechtsorganisationen erleichtert, Werften-Region alarmiert.",
    ),
    (
        "ruestungsexport_enthuellung",
        "exportstopp",
        "en",
        "Impose an export freeze",
        "Immediately halt deliveries to the affected recipient",
        "Export freeze imposed. Human rights groups relieved, shipyard region alarmed.",
    ),
    (
        "ruestungsexport_enthuellung",
        "vertraege_halten",
        "de",
        "An Verträgen festhalten",
        "Endverbleibserklärung als ausreichend darstellen, Lieferungen fortsetzen",
        "Verträge fortgesetzt. Vorwurf der Mitverantwortung bleibt im Raum stehen.",
    ),
    (
        "ruestungsexport_enthuellung",
        "vertraege_halten",
        "en",
        "Stand by the contracts",
        "Present the end-use declaration as sufficient, continue deliveries",
        "Contracts continued. The complicity accusation keeps hanging over the government.",
    ),
    (
        "ruestungsexport_industrie",
        "konversion",
        "de",
        "Konversionsprogramm auflegen",
        "Werften auf zivile Zusatzaufträge umstellen, staatlich gefördert",
        "Konversionsprogramm aufgelegt. Kostet den Haushalt, sichert aber langfristig Arbeitsplätze.",
    ),
    (
        "ruestungsexport_industrie",
        "konversion",
        "en",
        "Launch a conversion program",
        "State-funded shift of shipyards toward civilian orders",
        "Conversion program launched. Costs the budget but secures jobs long-term.",
    ),
    (
        "ruestungsexport_industrie",
        "ausnahmen",
        "de",
        "Ausnahmegenehmigungen zulassen",
        "Einzelfallgenehmigungen für laufende Aufträge, Exportstopp aufweichen",
        "Ausnahmen zugelassen. Werften beruhigt, Glaubwürdigkeit des Exportstopps beschädigt.",
    ),
    (
        "ruestungsexport_industrie",
        "ausnahmen",
        "en",
        "Allow case-by-case exceptions",
        "Grant individual approvals for existing orders, soften the freeze",
        "Exceptions allowed. Shipyards calmed, credibility of the freeze damaged.",
    ),
    (
        "ruestungsexport_untersuchung",
        "akteneinsicht",
        "de",
        "Vollständige Akteneinsicht gewähren",
        "Alle Unterlagen dem Ausschuss übergeben",
        "Volle Akteneinsicht gewährt. Ausschuss würdigt die Kooperation.",
    ),
    (
        "ruestungsexport_untersuchung",
        "akteneinsicht",
        "en",
        "Grant full access to files",
        "Hand all documents over to the committee",
        "Full file access granted. The committee credits the cooperation.",
    ),
    (
        "ruestungsexport_untersuchung",
        "staatswohl",
        "de",
        "Staatswohl geltend machen",
        "Zentrale Unterlagen als geheimhaltungsbedürftig einstufen",
        "Staatswohl geltend gemacht. Opposition spricht von Vertuschung, Sicherheitsbehörden erleichtert.",
    ),
    (
        "ruestungsexport_untersuchung",
        "staatswohl",
        "en",
        "Invoke reasons of state",
        "Classify key documents as confidential",
        "Reasons of state invoked. Opposition cries cover-up, security agencies relieved.",
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "strenges_gesetz",
        "de",
        "Strenges Kontrollgesetz durchsetzen",
        "Endverbleibskontrollen verschärfen, Ausnahmen stark einschränken",
        "Strenges Gesetz durchgesetzt. Menschenrechtsorganisationen loben, Rüstungsindustrie und Verbündete verstimmt.",
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "strenges_gesetz",
        "en",
        "Push through a strict control law",
        "Tighten end-use verification, sharply limit exceptions",
        "Strict law pushed through. Human rights groups praise it; the arms industry and allies are annoyed.",
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "kompromiss",
        "de",
        "Kompromissregelung mit Ausnahmeklausel",
        "Verschärfte Kontrolle, aber Ausnahmeklausel für strategische Partner",
        "Kompromiss verabschiedet. Moderat begrüßt, niemand ist wirklich zufrieden.",
    ),
    (
        "ruestungsexport_kontrollgesetz",
        "kompromiss",
        "en",
        "Compromise with an exception clause",
        "Tighter controls, but an exception clause for strategic partners",
        "Compromise passed. Moderately welcomed, nobody is truly satisfied.",
    ),
]


def upgrade() -> None:
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
