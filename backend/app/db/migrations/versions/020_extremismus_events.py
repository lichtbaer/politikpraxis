"""Extremismus-Eskalation Events (SMA-280)

Revision ID: 020_extremismus_events
Revises: 019_seed_framing
Create Date: 2025-03-17

Migration: event_choices Spalten (koalitionspartner_beziehung_delta, medienklima_delta,
verfahren_dauer_monate) + 2 Extremismus-Events mit Choices (DE).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "020_extremismus_events"
down_revision: Union[str, Sequence[str], None] = "019_seed_framing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add event_choices columns and seed 2 Extremismus-Events."""
    # --- Migration 1: Neue Spalten für event_choices ---
    op.add_column(
        "event_choices",
        sa.Column("koalitionspartner_beziehung_delta", sa.Integer(), nullable=True),
    )
    op.add_column(
        "event_choices",
        sa.Column("medienklima_delta", sa.Integer(), nullable=True),
    )
    op.add_column(
        "event_choices",
        sa.Column("verfahren_dauer_monate", sa.Integer(), nullable=True),
    )

    conn = op.get_bind()

    # --- Migration 2: 2 Extremismus-Events (conditional) ---
    events_data = [
        ("koalitionspartner_extremismus_warnung", "conditional", 2),
        ("verfassungsgericht_klage", "conditional", 3),
    ]
    for eid, etype, minc in events_data:
        conn.execute(
            sa.text("""
                INSERT INTO events (id, event_type, min_complexity)
                VALUES (:id, :etype, :minc)
            """),
            {"id": eid, "etype": etype, "minc": minc},
        )

    # --- events_i18n (DE) ---
    events_i18n_de = [
        ("koalitionspartner_extremismus_warnung", "Koalition", "Koalitionspartner besorgt über Regierungskurs",
         "So kann unsere Koalition nicht weiterarbeiten. Wir brauchen ein Gespräch.",
         "Der Koalitionspartner sieht die politische Ausrichtung der Regierung zunehmend kritisch. "
         "Öffentlich äußert die Fraktionsführung Bedenken gegenüber dem eingeschlagenen Kurs.",
         "Koalition unter Druck"),
        ("verfassungsgericht_klage", "Verfassung", "Verfassungsgericht nimmt Klage gegen Regierungshandeln an",
         "Das Grundgesetz ist keine Empfehlung. Es ist bindend.",
         "Das Bundesverfassungsgericht hat eine Klage gegen die Regierungspolitik angenommen. "
         "Für die nächsten 3 Monate sind Gesetze in den betroffenen Politikfeldern auf Eis gelegt. "
         "Das Verfahren belastet die Regierung massiv.",
         "Verfassungsgericht stoppt Regierung"),
    ]
    for eid, tl, title, quote, context, ticker in events_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'de', :tl, :title, :quote, :context, :ticker)
            """),
            {"eid": eid, "tl": tl, "title": title, "quote": quote, "context": context, "ticker": ticker},
        )

    # --- event_choices + event_choices_i18n ---
    # koalitionspartner_beziehung_delta, medienklima_delta, verfahren_dauer_monate
    max_id_result = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM event_choices"))
    choice_id = max_id_result.scalar() + 1

    choices_data = [
        # koalitionspartner_extremismus_warnung
        ("koalitionspartner_extremismus_warnung", "kurs_korrigieren", "safe", 0, 8, 4, None,
         "Kurs korrigieren", "Wir nehmen die Kritik ernst und justieren unsere Positionen.",
         "Kurs korrigiert — Koalitionspartner beruhigt."),
        ("koalitionspartner_extremismus_warnung", "gespraech_suchen", "primary", 10, 12, 2, None,
         "Koalitionsgespräch einberufen", "10 PK — Intensives Gespräch mit dem Koalitionspartner.",
         "Koalitionsgespräch einberufen."),
        ("koalitionspartner_extremismus_warnung", "ignorieren", "danger", 0, -10, -6, None,
         "Kritik zurückweisen", "Wir stehen zu unserem Kurs.",
         "Koalitionspartner-Kritik zurückgewiesen."),
        # verfassungsgericht_klage
        ("verfassungsgericht_klage", "kooperieren", "safe", 0, 5, 5, 2,
         "Mit dem Gericht kooperieren", "Wir respektieren den Rechtsstaat und arbeiten konstruktiv mit.",
         "Kooperation mit Verfassungsgericht angekündigt."),
        ("verfassungsgericht_klage", "verteidigen", "primary", 15, None, -4, 3,
         "Vor Gericht verteidigen", "15 PK — Rechtliche Verteidigung der Regierungsposition.",
         "Regierung verteidigt Kurs vor Verfassungsgericht."),
        ("verfassungsgericht_klage", "reform_ankuendigen", "safe", 0, 8, 8, 0,
         "Verfassungskonforme Reform ankündigen",
         "Wir kündigen eine Reform an die den verfassungsrechtlichen Bedenken Rechnung trägt.",
         "Verfassungskonforme Reform angekündigt."),
    ]

    for event_id, ckey, ctype, cost, kp_delta, mk_delta, vd_monate, label, desc, log in choices_data:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk,
                    effekt_al, effekt_hh, effekt_gi, effekt_zf,
                    koalitionspartner_beziehung_delta, medienklima_delta, verfahren_dauer_monate)
                VALUES (:id, :event_id, :ckey, :ctype, :cost, 0, 0, 0, 0, :kp_delta, :mk_delta, :vd_monate)
            """),
            {
                "id": choice_id, "event_id": event_id, "ckey": ckey, "ctype": ctype, "cost": cost,
                "kp_delta": kp_delta, "mk_delta": mk_delta, "vd_monate": vd_monate,
            },
        )
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log_msg)
            """),
            {"id": choice_id, "label": label, "desc": desc, "log_msg": log},
        )
        choice_id += 1

    conn.execute(sa.text("SELECT setval('event_choices_id_seq', :max_id)"), {"max_id": choice_id - 1})

    # --- events_i18n (EN) ---
    events_i18n_en = [
        ("koalitionspartner_extremismus_warnung", "Coalition", "Coalition partner concerned about government course",
         "Our coalition cannot continue like this. We need to talk.",
         "The coalition partner views the government's political direction with growing concern. "
         "The parliamentary group leadership publicly expresses reservations about the course taken.",
         "Coalition under pressure"),
        ("verfassungsgericht_klage", "Constitution", "Constitutional Court accepts lawsuit against government actions",
         "The Basic Law is not a recommendation. It is binding.",
         "The Federal Constitutional Court has accepted a lawsuit against government policy. "
         "For the next 3 months, laws in the affected policy areas are on hold. "
         "The proceedings place a heavy burden on the government.",
         "Constitutional Court stops government"),
    ]
    for eid, tl, title, quote, context, ticker in events_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'en', :tl, :title, :quote, :context, :ticker)
            """),
            {"eid": eid, "tl": tl, "title": title, "quote": quote, "context": context, "ticker": ticker},
        )

    # --- event_choices_i18n (EN) ---
    choices_i18n_en = [
        (choice_id - 6, "Correct course", "We take the criticism seriously and adjust our positions.",
         "Course corrected — coalition partner reassured."),
        (choice_id - 5, "Convene coalition talks", "10 PK — Intensive discussion with the coalition partner.",
         "Coalition talks convened."),
        (choice_id - 4, "Reject criticism", "We stand by our course.",
         "Coalition partner criticism rejected."),
        (choice_id - 3, "Cooperate with the court", "We respect the rule of law and work constructively.",
         "Cooperation with Constitutional Court announced."),
        (choice_id - 2, "Defend in court", "15 PK — Legal defence of the government position.",
         "Government defends course before Constitutional Court."),
        (choice_id - 1, "Announce constitution-compliant reform",
         "We announce a reform that addresses the constitutional concerns.",
         "Constitution-compliant reform announced."),
    ]
    for cid, label, desc, log in choices_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'en', :label, :desc, :log_msg)
            """),
            {"id": cid, "label": label, "desc": desc, "log_msg": log},
        )


def downgrade() -> None:
    """Remove Extremismus-Events und Spalten."""
    conn = op.get_bind()
    event_ids = ["koalitionspartner_extremismus_warnung", "verfassungsgericht_klage"]
    for eid in event_ids:
        conn.execute(
            sa.text("DELETE FROM event_choices_i18n WHERE choice_id IN (SELECT id FROM event_choices WHERE event_id = :eid)"),
            {"eid": eid},
        )
        conn.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid})
        conn.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid})

    op.drop_column("event_choices", "verfahren_dauer_monate")
    op.drop_column("event_choices", "medienklima_delta")
    op.drop_column("event_choices", "koalitionspartner_beziehung_delta")
