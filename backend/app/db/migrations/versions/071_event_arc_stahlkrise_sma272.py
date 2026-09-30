"""#272: Dritter Story-Arc "Stahlkrise".

Nutzt das Arc-Schema aus Migration 065 (`arc_id`/`arc_stage`) ohne Engine-Änderungen.
Ein Stahlkonzern kündigt die Schließung eines Hochofenstandorts an. Die Reaktion der
Regierung verzweigt den Arc:

- Staatsbeteiligung → die EU-Kommission prüft die Beihilfe (Stufe 2a)
- keine Einzelfallhilfe → die Belegschaft besetzt das Werk (Stufe 2b)

Beide Wege münden in eine Grundsatzentscheidung zur Industriestrategie für die
Grundstoffindustrie (Stufe 3). Der Arc verbindet drei Ebenen: Bund, EU (Beihilferecht)
und Land (Strukturwandel). Konzern und Standort sind fiktiv.

Revision ID: 071_event_arc_stahlkrise_sma272
Revises: 070_random_events_nachseeden
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "071_event_arc_stahlkrise_sma272"
down_revision: Union[str, Sequence[str], None] = "070_random_events_nachseeden"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ARC_ID = "stahlkrise"

# (id, arc_stage, event_type, min_complexity)
_EVENTS = [
    ("stahlkrise_ankuendigung", 1, "danger", 1),
    ("stahlkrise_beihilfe", 2, "warn", 1),
    ("stahlkrise_protest", 2, "danger", 1),
    ("stahlkrise_industriestrategie", 3, "primary", 1),
]

# (event_id, locale, type_label, title, quote, context, ticker)
_EVENTS_I18N = [
    (
        "stahlkrise_ankuendigung",
        "de",
        "Stahlkrise",
        "Kessler Stahlwerke kündigen Aus für Hochofenstandort an",
        "„Ohne Hilfe aus Berlin gehen hier nächstes Jahr die Lichter aus.“",
        "Der Konzern will den Standort mit rund 8.000 Beschäftigten schließen, falls "
        "der Bund den Umbau auf wasserstoffbasierten Stahl nicht mitfinanziert. Das "
        "Wirtschaftsministerium drängt auf eine Entscheidung, das Finanzministerium "
        "warnt vor einem Präzedenzfall.",
        "Stahlwerk vor dem Aus: 8.000 Jobs in Gefahr",
    ),
    (
        "stahlkrise_ankuendigung",
        "en",
        "Steel crisis",
        "Kessler Steelworks announce closure of blast furnace site",
        '"Without help from Berlin, the lights go out here next year."',
        "The group wants to close the site and its roughly 8,000 jobs unless the "
        "federal government co-finances the switch to hydrogen-based steel. The "
        "economics ministry is pressing for a decision; the finance ministry warns "
        "of a precedent.",
        "Steelworks on the brink: 8,000 jobs at risk",
    ),
    (
        "stahlkrise_beihilfe",
        "de",
        "Stahlkrise",
        "EU-Kommission prüft Staatshilfe für Kessler",
        "„Wettbewerb im Binnenmarkt endet nicht an der deutschen Grenze.“",
        "Stahlhersteller aus drei Mitgliedstaaten haben Beschwerde eingelegt, Brüssel "
        "eröffnet ein Beihilfeverfahren. Genehmigt die Kommission die Hilfe nur mit "
        "Auflagen, muss Kessler Kapazitäten abbauen und schneller auf grünen Stahl "
        "umstellen.",
        "Brüssel prüft Kessler-Hilfen",
    ),
    (
        "stahlkrise_beihilfe",
        "en",
        "Steel crisis",
        "EU Commission scrutinises state aid for Kessler",
        '"Competition in the single market does not stop at the German border."',
        "Steelmakers from three member states have filed complaints and Brussels "
        "opens a state-aid procedure. If the Commission only approves the aid with "
        "conditions, Kessler must cut capacity and switch to green steel faster.",
        "Brussels probes Kessler aid",
    ),
    (
        "stahlkrise_protest",
        "de",
        "Stahlkrise",
        "Belegschaft besetzt Werkstor – Region fordert den Bund",
        "„Wir sind nicht die Verfügungsmasse einer Konzernbilanz.“",
        "Seit Tagen blockieren Beschäftigte das Werksgelände, Zulieferer melden "
        "Kurzarbeit an. Die Landesregierung verlangt vom Bund ein Programm für den "
        "Strukturwandel der Region.",
        "Stahlwerk besetzt: Region in Aufruhr",
    ),
    (
        "stahlkrise_protest",
        "en",
        "Steel crisis",
        "Workers occupy plant gate — region calls on Berlin",
        '"We are not a bargaining chip on a corporate balance sheet."',
        "Workers have been blocking the site for days and suppliers are announcing "
        "short-time work. The state government demands a federal structural-change "
        "programme for the region.",
        "Steelworks occupied: region in uproar",
    ),
    (
        "stahlkrise_industriestrategie",
        "de",
        "Stahlkrise",
        "Kabinett ringt um Industriestrategie für Grundstoffe",
        "„Kessler war kein Einzelfall. Chemie, Zement und Glas stehen vor derselben "
        "Frage.“",
        "Weitere Unternehmen der Grundstoffindustrie melden Förderbedarf für den "
        "klimaneutralen Umbau an. Die Regierung muss entscheiden, ob sie Einzelfälle "
        "rettet oder einen allgemeinen Rahmen setzt.",
        "Industriestrategie: Kabinett uneins",
    ),
    (
        "stahlkrise_industriestrategie",
        "en",
        "Steel crisis",
        "Cabinet wrestles with an industrial strategy for basic materials",
        '"Kessler was no isolated case. Chemicals, cement and glass face the same '
        'question."',
        "Further basic-materials companies are registering funding needs for a "
        "climate-neutral conversion. The government must decide whether to rescue "
        "individual cases or set a general framework.",
        "Industrial strategy: cabinet divided",
    ),
]

# (event_id, choice_key, choice_type, cost_pk, al, hh, gi, zf, char_mood,
#  followup_event_id, followup_delay)
_CHOICES = [
    (
        "stahlkrise_ankuendigung",
        "staatsbeteiligung",
        "primary",
        12,
        -0.2,
        -0.3,
        0,
        1,
        {"am": 1, "fm": -1},
        "stahlkrise_beihilfe",
        2,
    ),
    (
        "stahlkrise_ankuendigung",
        "keine_einzelfallhilfe",
        "danger",
        2,
        0.3,
        0,
        0.1,
        -2,
        {"fm": 1, "am": -1},
        "stahlkrise_protest",
        1,
    ),
    (
        "stahlkrise_beihilfe",
        "auflagen_akzeptieren",
        "safe",
        6,
        0.1,
        -0.1,
        0,
        1,
        {"wm": 1},
        "stahlkrise_industriestrategie",
        2,
    ),
    (
        "stahlkrise_beihilfe",
        "konfrontation",
        "danger",
        3,
        0,
        -0.1,
        0,
        -1,
        {"wm": -1, "jm": -1},
        "stahlkrise_industriestrategie",
        2,
    ),
    (
        "stahlkrise_protest",
        "strukturfonds",
        "primary",
        10,
        -0.2,
        -0.3,
        -0.1,
        2,
        {"am": 1, "fm": -1},
        "stahlkrise_industriestrategie",
        2,
    ),
    (
        "stahlkrise_protest",
        "transfergesellschaft",
        "safe",
        4,
        0.1,
        -0.1,
        0,
        0,
        {"am": 1},
        "stahlkrise_industriestrategie",
        2,
    ),
    (
        "stahlkrise_industriestrategie",
        "klimaschutzvertraege",
        "primary",
        10,
        -0.1,
        -0.2,
        0,
        2,
        {"um": 1, "wm": 1, "fm": -1},
        None,
        None,
    ),
    (
        "stahlkrise_industriestrategie",
        "technologieoffen",
        "safe",
        4,
        0.1,
        0.1,
        0.1,
        -1,
        {"fm": 1, "um": -1},
        None,
        None,
    ),
]

# (event_id, choice_key, locale, label, desc, log_msg)
_CHOICES_I18N = [
    (
        "stahlkrise_ankuendigung",
        "staatsbeteiligung",
        "de",
        "Staatsbeteiligung und Umbauhilfe",
        "Bund steigt ein und finanziert den Umbau mit — teuer, rettet Arbeitsplätze",
        "Bund steigt bei Kessler ein. Belegschaft erleichtert, Haushälter skeptisch.",
    ),
    (
        "stahlkrise_ankuendigung",
        "staatsbeteiligung",
        "en",
        "State stake and conversion aid",
        "The federal government buys in and co-finances the conversion — costly, saves jobs",
        "Federal government takes a stake in Kessler. Workforce relieved, budget hawks sceptical.",
    ),
    (
        "stahlkrise_ankuendigung",
        "keine_einzelfallhilfe",
        "de",
        "Keine Einzelfallhilfe",
        "Unternehmerische Entscheidung respektieren — billig, aber riskant für die Region",
        "Keine Staatshilfe für Kessler. Gewerkschaften kündigen Widerstand an.",
    ),
    (
        "stahlkrise_ankuendigung",
        "keine_einzelfallhilfe",
        "en",
        "No case-by-case bailout",
        "Respect the business decision — cheap, but risky for the region",
        "No state aid for Kessler. Unions announce resistance.",
    ),
    (
        "stahlkrise_beihilfe",
        "auflagen_akzeptieren",
        "de",
        "Auflagen akzeptieren",
        "Kapazitätsabbau und schnelleren Umbau zusagen — die Hilfe wird genehmigt",
        "Beihilfe mit Auflagen genehmigt. Kessler baut um, einige Stellen fallen weg.",
    ),
    (
        "stahlkrise_beihilfe",
        "auflagen_akzeptieren",
        "en",
        "Accept the conditions",
        "Commit to cutting capacity and a faster conversion — the aid gets approved",
        "Aid approved with conditions. Kessler converts; some jobs are cut.",
    ),
    (
        "stahlkrise_beihilfe",
        "konfrontation",
        "de",
        "Auf Konfrontation gehen",
        "Auf strategische Grundstoffindustrie pochen, Verfahren aussitzen",
        "Bundesregierung stellt sich gegen Brüssel. Eine Rückforderung der Hilfe droht.",
    ),
    (
        "stahlkrise_beihilfe",
        "konfrontation",
        "en",
        "Confront Brussels",
        "Insist on a strategic basic industry and sit out the procedure",
        "The government defies Brussels. The aid may have to be repaid.",
    ),
    (
        "stahlkrise_protest",
        "strukturfonds",
        "de",
        "Strukturwandelfonds auflegen",
        "Milliardenprogramm für neue Industrie in der Region",
        "Strukturwandelfonds beschlossen. Die Blockade endet, Zweifel an der Finanzierung bleiben.",
    ),
    (
        "stahlkrise_protest",
        "strukturfonds",
        "en",
        "Launch a structural-change fund",
        "Multi-billion programme for new industry in the region",
        "Structural-change fund adopted. The blockade ends; doubts about the financing remain.",
    ),
    (
        "stahlkrise_protest",
        "transfergesellschaft",
        "de",
        "Transfergesellschaft finanzieren",
        "Qualifizierung und Vermittlung für die Beschäftigten — begrenzt, aber gezielt",
        "Transfergesellschaft startet. Die Stimmung bleibt angespannt.",
    ),
    (
        "stahlkrise_protest",
        "transfergesellschaft",
        "en",
        "Fund a transfer company",
        "Retraining and job placement for the workforce — limited but targeted",
        "Transfer company launched. The mood remains tense.",
    ),
    (
        "stahlkrise_industriestrategie",
        "klimaschutzvertraege",
        "de",
        "Klimaschutzverträge für alle",
        "Differenzverträge für den klimaneutralen Umbau der Grundstoffindustrie",
        "Klimaschutzverträge beschlossen. Industrie und Umweltverbände zeigen sich zufrieden.",
    ),
    (
        "stahlkrise_industriestrategie",
        "klimaschutzvertraege",
        "en",
        "Climate contracts for all",
        "Carbon contracts for difference to convert basic industry to climate neutrality",
        "Climate contracts adopted. Industry and environmental groups are satisfied.",
    ),
    (
        "stahlkrise_industriestrategie",
        "technologieoffen",
        "de",
        "Technologieoffen, ohne Subventionen",
        "Keine Einzelhilfen mehr, der CO₂-Preis soll es richten",
        "Keine neuen Industriehilfen. Umweltverbände und Gewerkschaften kritisieren den Kurs.",
    ),
    (
        "stahlkrise_industriestrategie",
        "technologieoffen",
        "en",
        "Technology-neutral, no subsidies",
        "No more case-by-case aid; the carbon price is to do the job",
        "No new industrial aid. Environmental groups and unions criticise the course.",
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
