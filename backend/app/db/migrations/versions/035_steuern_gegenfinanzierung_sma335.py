"""SMA-335: Steuer-System, Gegenfinanzierung — steuern, gesetze-Erweiterung, gegenfinanzierung_log

Revision ID: 035_steuern_sma335
Revises: 034_merge_033_heads
Create Date: 2026-03-18

- steuern-Tabelle (10 Steuern)
- gesetze: steuer_id, steuer_delta, konjunktur_effekt, konjunktur_lag
- gegenfinanzierung_log
- Seed: 10 Steuern, 8 Steuergesetze
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "035_steuern_sma335"
down_revision: Union[str, Sequence[str], None] = "034_merge_033_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Steuern-Tabelle, gesetze-Spalten, gegenfinanzierung_log, Seed."""
    # --- steuern-Tabelle ---
    op.create_table(
        "steuern",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name_de", sa.Text(), nullable=False),
        sa.Column("typ", sa.Text(), nullable=False),
        sa.Column("aktueller_satz", sa.Numeric(6, 2), nullable=True),
        sa.Column("min_satz", sa.Numeric(6, 2), nullable=True),
        sa.Column("max_satz", sa.Numeric(6, 2), nullable=True),
        sa.Column("einnahmen_basis", sa.Numeric(8, 2), nullable=True),
        sa.Column("einnahmen_pro_prozent", sa.Numeric(6, 2), nullable=True),
        sa.Column("konjunktur_sensitivitaet", sa.Numeric(4, 2), server_default="0"),
        sa.Column("min_complexity", sa.Integer(), server_default="2"),
        sa.CheckConstraint("typ IN ('direkt', 'indirekt', 'co2')", name="steuern_typ_check"),
    )

    # --- gesetze-Spalten ---
    op.add_column(
        "gesetze",
        sa.Column("steuer_id", sa.Text(), sa.ForeignKey("steuern.id"), nullable=True),
    )
    op.add_column(
        "gesetze",
        sa.Column("steuer_delta", sa.Numeric(6, 2), nullable=True),
    )
    op.add_column(
        "gesetze",
        sa.Column("konjunktur_effekt", sa.Numeric(4, 2), server_default="0"),
    )
    op.add_column(
        "gesetze",
        sa.Column("konjunktur_lag", sa.Integer(), server_default="0"),
    )

    # --- gegenfinanzierung_log ---
    op.create_table(
        "gegenfinanzierung_log",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("game_id", sa.Text(), nullable=True),
        sa.Column("gesetz_id", sa.Text(), nullable=True),
        sa.Column("monat", sa.Integer(), nullable=True),
        sa.Column("option_key", sa.Text(), nullable=True),
        sa.Column("ressort", sa.Text(), nullable=True),
        sa.Column("betrag", sa.Numeric(8, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )

    conn = op.get_bind()

    # --- Seed: 10 Steuern ---
    steuern = [
        ("einkommensteuer", "Einkommensteuer Spitze", "direkt", 42, 30, 50, 90, 8.5, -0.2, 2),
        ("koerperschaftsteuer", "Körperschaftsteuer", "direkt", 15, 10, 25, 40, 4.0, -0.3, 2),
        ("mwst_standard", "Mehrwertsteuer Standard", "indirekt", 19, 16, 22, 150, 8.0, -0.4, 2),
        ("mwst_ermaessigt", "Mehrwertsteuer Ermäßigt", "indirekt", 7, 5, 10, 25, 3.5, -0.2, 2),
        ("co2_steuer", "CO2-Steuer", "co2", 25, 25, 80, 10, 0.5, -0.1, 2),
        ("energiesteuer", "Energiesteuer", "indirekt", 0, 0, 0, 35, 1.5, -0.2, 2),
        ("kapitalertragsteuer", "Kapitalertragsteuer", "direkt", 25, 20, 30, 20, 2.0, -0.1, 2),
        ("vermoegensteuer", "Vermögensteuer", "direkt", 0, 0, 2, 0, 15.0, -0.2, 2),
        ("digitalsteuer", "Digitalsteuer", "indirekt", 0, 0, 5, 0, 3.0, -0.1, 2),
        ("erbschaftsteuer", "Erbschaftsteuer", "direkt", 0, 0, 0, 8, 1.0, -0.05, 2),
    ]
    for sid, name, typ, aktuell, min_s, max_s, basis, pro_proz, sens, minc in steuern:
        conn.execute(
            sa.text("""
                INSERT INTO steuern (id, name_de, typ, aktueller_satz, min_satz, max_satz,
                    einnahmen_basis, einnahmen_pro_prozent, konjunktur_sensitivitaet, min_complexity)
                VALUES (:id, :name, :typ, :aktuell, :min_s, :max_s, :basis, :pro_proz, :sens, :minc)
            """),
            {
                "id": sid, "name": name, "typ": typ, "aktuell": aktuell or None,
                "min_s": min_s or None, "max_s": max_s or None, "basis": basis or None,
                "pro_proz": pro_proz or None, "sens": sens, "minc": minc,
            },
        )

    # --- Seed: 8 Steuergesetze (IDs die noch nicht existieren prüfen) ---
    # Einkommensteuer +2%, Einkommensteuer -2%, Körperschaftsteuer -3%, MwSt +1%,
    # CO2 +25€, Vermögenssteuer einführen, Digitalsteuer einführen, Spitzensteuersatz (Duplikat)
    # Wir nutzen bestehende IDs wo möglich und fügen neue hinzu
    gesetze_steuer = [
        # gid, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf,
        # ke, kl, einn, inv, minc, steuer_id, steuer_delta, konj_eff, konj_lag
        ("est_plus_2", ["bund"], 52, 0, 0, 0, 4, 3, False, -20, -30, -20, "wirtschaft_finanzen",
         0.0, 0.0, 17.0, False, 1, "einkommensteuer", 2.0, -0.1, 3),
        ("est_minus_2", ["bund"], 54, 0, 0, 0, 4, 3, False, 20, 30, 20, "wirtschaft_finanzen",
         0.0, 0.0, -17.0, False, 1, "einkommensteuer", -2.0, 0.1, 3),
        ("koerp_minus_3", ["bund"], 50, 0, 0, 0, 4, 3, False, 70, 5, 50, "wirtschaft_finanzen",
         0.0, 0.0, -12.0, False, 1, "koerperschaftsteuer", -3.0, 0.15, 4),
        ("mwst_plus_1", ["bund"], 53, 0, 0, 0, 4, 2, False, -30, -20, -30, "wirtschaft_finanzen",
         0.0, 0.0, 8.0, False, 1, "mwst_standard", 1.0, -0.05, 3),
        ("co2_plus_25", ["bund", "eu"], 51, 0, 0, 0, 4, 2, False, -30, -60, -20, "umwelt_energie",
         0.0, 0.0, 5.0, False, 1, "co2_steuer", 25.0, -0.05, 2),
        ("vermoegensteuer_einfuehren", ["bund"], 48, 0, 0, 0, 6, 4, False, -75, -10, -30, "wirtschaft_finanzen",
         0.0, 0.0, 15.0, False, 1, "vermoegensteuer", 1.0, -0.1, 6),
        ("digitalsteuer_einfuehren", ["bund", "eu"], 55, 0, 0, 0, 4, 3, False, -40, -20, -30, "digital_infrastruktur",
         0.0, 0.0, 3.0, False, 1, "digitalsteuer", 3.0, -0.02, 4),
        ("spitzensteuersatz_plus", ["bund"], 46, 0, 0, 0, 3, 3, False, -65, -10, -30, "wirtschaft_finanzen",
         0.0, 0.0, 10.0, False, 1, "einkommensteuer", 2.0, -0.15, 3),
    ]

    for (
        gid, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, inv, minc,
        steuer_id, steuer_delta, konj_eff, konj_lag
    ) in gesetze_steuer:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
                    politikfeld_id, kosten_einmalig, kosten_laufend, einnahmeeffekt, investiv, min_complexity,
                    steuer_id, steuer_delta, konjunktur_effekt, konjunktur_lag)
                VALUES (:id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf,
                    :ke, :kl, :einn, :inv, :minc, :steuer_id, :steuer_delta, :konj_eff, :konj_lag)
            """),
            {
                "id": gid, "tags": tags_sql, "bt": bt, "ea": ea, "eh": eh, "eg": eg, "ez": ez, "lag": lag,
                "foed": foed, "iw": iw, "ig": ig, "is_": is_, "pf": pf, "ke": ke, "kl": kl, "einn": einn,
                "inv": inv, "minc": minc, "steuer_id": steuer_id, "steuer_delta": steuer_delta,
                "konj_eff": konj_eff, "konj_lag": konj_lag,
            },
        )

    # --- gesetze_i18n (DE) ---
    gesetze_i18n_de = [
        ("est_plus_2", "Einkommensteuer-Erhöhungsgesetz", "ESt+2",
         "Anhebung des Spitzensteuersatzes um 2 Prozentpunkte."),
        ("est_minus_2", "Einkommensteuer-Entlastungsgesetz", "ESt-2",
         "Senkung des Spitzensteuersatzes um 2 Prozentpunkte."),
        ("koerp_minus_3", "Körperschaftsteuer-Senkungsgesetz", "KSt-3",
         "Senkung der Körperschaftsteuer um 3 Prozentpunkte."),
        ("mwst_plus_1", "Mehrwertsteuer-Erhöhungsgesetz", "MwSt+1",
         "Anhebung des Regelsteuersatzes um 1 Prozentpunkt."),
        ("co2_plus_25", "CO2-Preis-Erhöhungsgesetz", "CO2+25",
         "Anhebung der CO2-Bepreisung um 25 €/Tonne."),
        ("vermoegensteuer_einfuehren", "Vermögensteuer-Wiedereinführungsgesetz", "VermSt",
         "Wiedereinführung einer Vermögensteuer auf hohe Vermögen."),
        ("digitalsteuer_einfuehren", "Digitalsteuer-Einführungsgesetz", "DigiSt",
         "Einführung einer Steuer auf digitale Plattformumsätze."),
        ("spitzensteuersatz_plus", "Spitzensteuersatz-Erhöhungsgesetz", "SpSt+",
         "Anhebung des Spitzensteuersatzes mit stärkerem Umverteilungseffekt."),
    ]
    for gid, titel, kurz, desc in gesetze_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'de', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- gesetze_i18n (EN) ---
    gesetze_i18n_en = [
        ("est_plus_2", "Income Tax Increase Act", "IT+2",
         "Raising the top tax rate by 2 percentage points."),
        ("est_minus_2", "Income Tax Relief Act", "IT-2",
         "Lowering the top tax rate by 2 percentage points."),
        ("koerp_minus_3", "Corporate Tax Reduction Act", "CT-3",
         "Reducing corporate tax by 3 percentage points."),
        ("mwst_plus_1", "VAT Increase Act", "VAT+1",
         "Raising the standard VAT rate by 1 percentage point."),
        ("co2_plus_25", "CO2 Price Increase Act", "CO2+25",
         "Raising CO2 pricing by 25 €/tonne."),
        ("vermoegensteuer_einfuehren", "Wealth Tax Reintroduction Act", "WT",
         "Reintroduction of a wealth tax on high assets."),
        ("digitalsteuer_einfuehren", "Digital Tax Introduction Act", "DT",
         "Introduction of a tax on digital platform revenues."),
        ("spitzensteuersatz_plus", "Top Tax Rate Increase Act", "TTR+",
         "Raising the top tax rate with stronger redistribution effect."),
    ]
    for gid, titel, kurz, desc in gesetze_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )


def downgrade() -> None:
    """Remove steuern, gegenfinanzierung_log, gesetze-Spalten, Seed-Gesetze."""
    conn = op.get_bind()

    # Gesetze löschen
    for gid in [
        "est_plus_2", "est_minus_2", "koerp_minus_3", "mwst_plus_1", "co2_plus_25",
        "vermoegensteuer_einfuehren", "digitalsteuer_einfuehren", "spitzensteuersatz_plus",
    ]:
        conn.execute(sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :id"), {"id": gid})
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :id"), {"id": gid})

    op.drop_table("gegenfinanzierung_log")
    op.drop_column("gesetze", "konjunktur_lag")
    op.drop_column("gesetze", "konjunktur_effekt")
    op.drop_column("gesetze", "steuer_delta")
    op.drop_column("gesetze", "steuer_id")
    op.drop_table("steuern")
