"""SMA-404: Wirtschaftssektoren-Tabelle, Gesetze.sektor_effekte, dynamische Events GBD/BDI.

Revision ID: 048_sma404_wirtschaftssektoren
Revises: 047_sma403_ideologie_wert
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

revision: str = "048_sma404_wirtschaftssektoren"
down_revision: Union[str, Sequence[str], None] = "047_sma403_ideologie_wert"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "gesetze",
        sa.Column("sektor_effekte", JSONB(), nullable=False, server_default="[]"),
    )

    op.create_table(
        "wirtschaftssektoren",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name_de", sa.Text(), nullable=False),
        sa.Column("zustand_start", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("verband_ids", ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("min_complexity", sa.Integer(), nullable=False, server_default="2"),
    )

    conn = op.get_bind()

    sektoren_rows: list[dict[str, Any]] = [
        {
            "id": "industrie",
            "name_de": "Industrie & Energie",
            "zustand_start": 50,
            "verband_ids": ["bdi", "dwv"],
            "min_complexity": 2,
        },
        {
            "id": "arbeit",
            "name_de": "Arbeit & Soziales",
            "zustand_start": 50,
            "verband_ids": ["gbd"],
            "min_complexity": 2,
        },
        {
            "id": "konsum",
            "name_de": "Konsum & Handel",
            "zustand_start": 52,
            "verband_ids": ["bvl", "pvd"],
            "min_complexity": 2,
        },
        {
            "id": "gruen",
            "name_de": "Grüne Wirtschaft",
            "zustand_start": 45,
            "verband_ids": ["uvb"],
            "min_complexity": 3,
        },
        {
            "id": "finanz",
            "name_de": "Finanz & Kapital",
            "zustand_start": 55,
            "verband_ids": ["bdi", "bvd"],
            "min_complexity": 3,
        },
    ]
    for row in sektoren_rows:
        conn.execute(
            sa.text("""
                INSERT INTO wirtschaftssektoren (id, name_de, zustand_start, verband_ids, min_complexity)
                VALUES (:id, :name_de, :zustand_start, :verband_ids, :min_complexity)
                ON CONFLICT (id) DO UPDATE SET
                    name_de = EXCLUDED.name_de,
                    zustand_start = EXCLUDED.zustand_start,
                    verband_ids = EXCLUDED.verband_ids,
                    min_complexity = EXCLUDED.min_complexity
            """),
            {
                "id": row["id"],
                "name_de": row["name_de"],
                "zustand_start": row["zustand_start"],
                "verband_ids": row["verband_ids"],
                "min_complexity": row["min_complexity"],
            },
        )

    # Sektor-Effekte je Politikfeld (beschlossenes Gesetz → verzögerte Zustandsänderung)
    pf_effects: list[tuple[str, list[dict[str, Any]]]] = [
        (
            "wirtschaft_finanzen",
            [
                {"sektor": "industrie", "delta": 4, "verzoegerung_monate": 1},
                {"sektor": "finanz", "delta": 3, "verzoegerung_monate": 1},
            ],
        ),
        (
            "arbeit_soziales",
            [
                {"sektor": "arbeit", "delta": 5, "verzoegerung_monate": 0},
                {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 2},
            ],
        ),
        (
            "umwelt_energie",
            [
                {"sektor": "gruen", "delta": 6, "verzoegerung_monate": 2},
                {"sektor": "industrie", "delta": -3, "verzoegerung_monate": 3},
            ],
        ),
        (
            "innere_sicherheit",
            [
                {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 1},
                {"sektor": "finanz", "delta": -1, "verzoegerung_monate": 2},
            ],
        ),
        (
            "bildung_forschung",
            [
                {"sektor": "arbeit", "delta": 3, "verzoegerung_monate": 2},
                {"sektor": "finanz", "delta": -2, "verzoegerung_monate": 1},
            ],
        ),
        (
            "gesundheit_pflege",
            [
                {"sektor": "konsum", "delta": 3, "verzoegerung_monate": 0},
                {"sektor": "arbeit", "delta": 2, "verzoegerung_monate": 1},
            ],
        ),
        (
            "digital_infrastruktur",
            [
                {"sektor": "finanz", "delta": 3, "verzoegerung_monate": 1},
                {"sektor": "industrie", "delta": 2, "verzoegerung_monate": 2},
            ],
        ),
        (
            "landwirtschaft",
            [
                {"sektor": "konsum", "delta": 2, "verzoegerung_monate": 1},
                {"sektor": "gruen", "delta": 2, "verzoegerung_monate": 2},
            ],
        ),
    ]
    for pf, eff in pf_effects:
        conn.execute(
            sa.text("""
                UPDATE gesetze SET sektor_effekte = CAST(:j AS jsonb)
                WHERE politikfeld_id = :pf
            """),
            {"pf": pf, "j": json.dumps(eff)},
        )

    op.add_column("event_choices", sa.Column("verband_delta", JSONB(), nullable=True))
    op.add_column("event_choices", sa.Column("sektor_delta", JSONB(), nullable=True))
    op.add_column(
        "event_choices",
        sa.Column("haushalt_saldo_delta_mrd", sa.Numeric(6, 2), nullable=True),
    )

    events_meta = [
        {
            "id": "dyn_gbd_forderung_aufschwung",
            "event_type": "dynamic",
            "trigger_typ": "sektor_ueber",
            "trigger_params": {"sektor": "arbeit", "wert": 70, "bip_wachstum_min": 1.5},
            "min_complexity": 3,
        },
        {
            "id": "dyn_bdi_krise_forderung",
            "event_type": "dynamic",
            "trigger_typ": "sektor_unter",
            "trigger_params": {"sektor": "industrie", "wert": 30},
            "min_complexity": 3,
        },
    ]
    for eid_del in ("dyn_gbd_forderung_aufschwung", "dyn_bdi_krise_forderung"):
        conn.execute(
            sa.text("""
                DELETE FROM event_choices_i18n WHERE choice_id IN (
                    SELECT id FROM event_choices WHERE event_id = :eid
                )
            """),
            {"eid": eid_del},
        )
        conn.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid_del})

    for em in events_meta:
        conn.execute(
            sa.text("""
                INSERT INTO events (
                    id, event_type, trigger_typ, trigger_params, einmalig, min_complexity
                ) VALUES (
                    :id, :event_type, :trigger_typ, CAST(:trigger_params AS jsonb),
                    true, :min_complexity
                )
                ON CONFLICT (id) DO UPDATE SET
                    event_type = EXCLUDED.event_type,
                    trigger_typ = EXCLUDED.trigger_typ,
                    trigger_params = EXCLUDED.trigger_params,
                    einmalig = EXCLUDED.einmalig,
                    min_complexity = EXCLUDED.min_complexity
            """),
            {
                "id": em["id"],
                "event_type": em["event_type"],
                "trigger_typ": em["trigger_typ"],
                "trigger_params": json.dumps(em["trigger_params"]),
                "min_complexity": em["min_complexity"],
            },
        )

    i18n_events = [
        (
            "dyn_gbd_forderung_aufschwung",
            "Wirtschaft",
            "Gewerkschaften fordern Lohnerhöhungen",
            "Der Aufschwung kommt bei den Arbeitnehmerinnen kaum an.",
            "Die GBD fordert eine stärkere Beteiligung am Wachstum — mit konkreten Forderungen.",
            "Gewerkschaften: Forderungen im Aufschwung",
        ),
        (
            "dyn_bdi_krise_forderung",
            "Wirtschaft",
            "BDI fordert Industriepaket",
            "Die Industrie steht unter Druck.",
            "Der BDI verlangt schnelle politische Entlastungen, um Standortschließungen zu verhindern.",
            "Industrie: Hilferuf an die Regierung",
        ),
    ]
    for eid, tl, title, quote, context, ticker in i18n_events:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'de', :tl, :title, :quote, :context, :ticker)
                ON CONFLICT (event_id, locale) DO UPDATE SET
                    type_label = EXCLUDED.type_label,
                    title = EXCLUDED.title,
                    quote = EXCLUDED.quote,
                    context = EXCLUDED.context,
                    ticker = EXCLUDED.ticker
            """),
            {
                "eid": eid,
                "tl": tl,
                "title": title,
                "quote": quote,
                "context": context,
                "ticker": ticker,
            },
        )

    def insert_choice(
        eid: str,
        key: str,
        ctype: str,
        cost: int,
        eff: dict[str, float],
        label: str,
        desc: str,
        log: str,
        kpd: int | None = None,
        mk: int | None = None,
        verband_delta: dict[str, int] | None = None,
        sektor_delta: dict[str, int] | None = None,
        haushalt_saldo_delta_mrd: float | None = None,
    ) -> None:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (
                    event_id, choice_key, choice_type, cost_pk,
                    effekt_al, effekt_hh, effekt_gi, effekt_zf,
                    koalitionspartner_beziehung_delta, medienklima_delta,
                    verband_delta, sektor_delta, haushalt_saldo_delta_mrd
                ) VALUES (
                    :eid, :key, :ctype, :cost,
                    :al, :hh, :gi, :zf,
                    :kpd, :mk,
                    CAST(:verband_delta AS jsonb), CAST(:sektor_delta AS jsonb), :hsdm
                )
            """),
            {
                "eid": eid,
                "key": key,
                "ctype": ctype,
                "cost": cost,
                "al": eff.get("al", 0),
                "hh": eff.get("hh", 0),
                "gi": eff.get("gi", 0),
                "zf": eff.get("zf", 0),
                "kpd": kpd,
                "mk": mk,
                "verband_delta": json.dumps(verband_delta) if verband_delta else None,
                "sektor_delta": json.dumps(sektor_delta) if sektor_delta else None,
                "hsdm": haushalt_saldo_delta_mrd,
            },
        )
        r2 = conn.execute(
            sa.text(
                "SELECT id FROM event_choices WHERE event_id = :eid AND choice_key = :key ORDER BY id DESC LIMIT 1"
            ),
            {"eid": eid, "key": key},
        )
        cid = r2.scalar_one()
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:cid, 'de', :label, :desc, :log)
            """),
            {"cid": cid, "label": label, "desc": desc, "log": log},
        )

    # GBD-Event
    insert_choice(
        "dyn_gbd_forderung_aufschwung",
        "mindestlohn",
        "primary",
        10,
        {"zf": -2},
        "Mindestlohnerhöhung vorbereiten",
        "Stärkt die GBD, belastet die Industrie-Stimmung.",
        "Mindestlohn-Initiative angekündigt. Gewerkschaften zufrieden, Industrie kritisch.",
        kpd=-5,
        verband_delta={"gbd": 12, "bdi": -6},
        sektor_delta={"arbeit": 5},
    )
    insert_choice(
        "dyn_gbd_forderung_aufschwung",
        "tarifautonomie",
        "safe",
        8,
        {},
        "Tarifautonomie stärken",
        "Weniger direkte Kosten — Partner kann unruhig werden.",
        "Tarifautonomie betont. GBD moderat zufrieden.",
        kpd=-8,
        verband_delta={"gbd": 6},
    )
    insert_choice(
        "dyn_gbd_forderung_aufschwung",
        "ablehnen",
        "danger",
        0,
        {},
        "Forderungen ablehnen",
        "Sparpolitischer Kurs — GBD und Medien reagieren negativ.",
        "Gewerkschaftsforderungen abgewiesen. Proteste und kritische Berichterstattung.",
        mk=-4,
        verband_delta={"gbd": -8},
    )

    # BDI-Event
    insert_choice(
        "dyn_bdi_krise_forderung",
        "entlastungspaket",
        "primary",
        12,
        {},
        "Entlastungspaket",
        "Mehrausgaben — BDI zufrieden, Saldo belastet.",
        "Industrie-Entlastungspaket beschlossen.",
        haushalt_saldo_delta_mrd=-5.0,
        verband_delta={"bdi": 12},
        sektor_delta={"industrie": 8},
    )
    insert_choice(
        "dyn_bdi_krise_forderung",
        "strukturwandel",
        "safe",
        10,
        {},
        "Strukturwandelprogramm",
        "Grüne Sektoren profitieren, höhere Ausgaben.",
        "Strukturwandelprogramm mit Klima- und Industriekomponenten.",
        haushalt_saldo_delta_mrd=-8.0,
        verband_delta={"bdi": 4, "uvb": 6},
        sektor_delta={"industrie": 4, "gruen": 8},
    )
    insert_choice(
        "dyn_bdi_krise_forderung",
        "ablehnen",
        "danger",
        0,
        {},
        "Ablehnen",
        "Fiskalisch neutral kurzfristig — Industrie und Medien verärgert.",
        "Industriepaket abgelehnt. BDI und Medien mit scharfer Kritik.",
        mk=-6,
        verband_delta={"bdi": -12},
    )


def downgrade() -> None:
    bind = op.get_bind()
    for eid in ("dyn_gbd_forderung_aufschwung", "dyn_bdi_krise_forderung"):
        bind.execute(
            sa.text("""
                DELETE FROM event_choices_i18n WHERE choice_id IN (
                    SELECT id FROM event_choices WHERE event_id = :eid
                )
            """),
            {"eid": eid},
        )
        bind.execute(sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid})
        bind.execute(sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid})
        bind.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid})

    op.drop_column("event_choices", "haushalt_saldo_delta_mrd")
    op.drop_column("event_choices", "sektor_delta")
    op.drop_column("event_choices", "verband_delta")

    op.drop_table("wirtschaftssektoren")
    op.drop_column("gesetze", "sektor_effekte")
