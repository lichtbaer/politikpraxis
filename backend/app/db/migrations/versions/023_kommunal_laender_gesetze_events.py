"""SMA-298: Kommunal- & Länderebene — mehr Gesetze, Events, Tags

Revision ID: 023_kommunal_laender
Revises: 022_eingangszitat
Create Date: 2025-03-17

Migration 1: Tags-Update für 7 bestehende Gesetze (kommunen, land)
Migration 2: 7 neue Gesetze (4 kommunal + 3 länder)
Migration 3: bundesrat_bonus Spalte in event_choices
Migration 4: 3 neue Events (kommunal_haushaltskrise, kommunal_buergerprotest, laender_koalitionskrise)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "023_kommunal_laender"
down_revision: Union[str, Sequence[str], None] = "022_eingangszitat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Tags-Update, 7 neue Gesetze, bundesrat_bonus, 3 neue Events."""
    conn = op.get_bind()

    # --- Migration 1: Tags-Update für 7 bestehende Gesetze ---
    # wb: + kommunen | pflegereform: + kommunen | digi_bildung: + land (hat schon)
    # buerokratieabbau: + kommunen, land | kh_reform: + kommunen | bp: + land (hat schon)
    # mindestlohn: + kommunen | laenderkompetenz: + land (hat schon) | sicherheit_paket: + land
    tag_updates = [
        ("wb", ["bund", "land", "kommune", "kommunen"]),  # wb hatte kommune, + kommunen
        ("pflegereform", ["bund", "land", "kommunen"]),
        ("digi_bildung", ["land", "bund", "eu"]),  # hat schon land
        ("buerokratieabbau", ["bund", "kommunen", "land"]),
        ("kh_reform", ["bund", "land", "kommunen"]),
        ("bp", ["land", "bund"]),  # hat schon land
        ("mindestlohn", ["bund", "kommunen"]),
        ("laenderkompetenz", ["land"]),  # hat schon land
        ("sicherheit_paket", ["bund", "land"]),
    ]
    for gid, tags in tag_updates:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("UPDATE gesetze SET tags = CAST(:tags AS text[]) WHERE id = :id"),
            {"id": gid, "tags": tags_sql},
        )

    # --- Migration 2: 7 neue Gesetze ---
    gesetze_data = [
        # id, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf, ke, kl, einn, inv, kpm, lpm, eim
        (
            "nahverkehr_ausbau",
            ["bund", "kommunen"],
            52,
            -0.4,
            -0.3,
            -0.2,
            5,
            4,
            False,
            -40,
            -20,
            -30,
            "digital_infrastruktur",
            3.0,
            0.5,
            0.0,
            True,
            True,
            False,
            True,
        ),
        (
            "kitaausbau",
            ["bund", "kommunen"],
            58,
            -0.5,
            -0.4,
            -0.3,
            6,
            5,
            False,
            -50,
            -30,
            -40,
            "gesundheit_pflege",
            4.0,
            1.5,
            0.0,
            True,
            True,
            False,
            True,
        ),
        (
            "stadtentwicklung",
            ["bund", "kommunen"],
            54,
            -0.3,
            -0.2,
            -0.2,
            4,
            4,
            False,
            -35,
            -25,
            -30,
            "wirtschaft_finanzen",
            2.0,
            0.3,
            0.0,
            True,
            True,
            False,
            True,
        ),
        (
            "gemeindeordnung_reform",
            ["bund", "kommunen", "land"],
            50,
            -0.2,
            0.1,
            0.1,
            3,
            3,
            True,
            40,
            0,
            0,
            "wirtschaft_finanzen",
            0.0,
            0.0,
            0.0,
            False,
            True,
            True,
            True,
        ),
        (
            "laender_polizeigesetz",
            ["bund", "land"],
            48,
            0,
            -0.1,
            0,
            4,
            4,
            False,
            10,
            60,
            0,
            "innere_sicherheit",
            0.5,
            0.2,
            0.0,
            False,
            False,
            True,
            True,
        ),
        (
            "hochschulrahmen",
            ["bund", "land"],
            55,
            -0.3,
            -0.2,
            -0.2,
            5,
            5,
            False,
            -30,
            -20,
            -25,
            "bildung_forschung",
            1.0,
            0.5,
            0.0,
            True,
            False,
            True,
            True,
        ),
        (
            "laenderfinanzausgleich_reform",
            ["bund", "land"],
            46,
            -0.1,
            0.2,
            0.1,
            0,
            1,
            True,
            20,
            0,
            0,
            "wirtschaft_finanzen",
            0.0,
            0.0,
            0.0,
            False,
            False,
            True,
            True,
        ),
    ]

    for (
        gid,
        tags,
        bt,
        ea,
        eh,
        eg,
        ez,
        lag,
        foed,
        iw,
        ig,
        is_,
        pf,
        ke,
        kl,
        einn,
        inv,
        kpm,
        lpm,
        eim,
    ) in gesetze_data:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat,
                    politikfeld_id, kosten_einmalig, kosten_laufend, einnahmeeffekt, investiv,
                    kommunal_pilot_moeglich, laender_pilot_moeglich, eu_initiative_moeglich)
                VALUES (:id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf,
                    :ke, :kl, :einn, :inv, :kpm, :lpm, :eim)
            """),
            {
                "id": gid,
                "tags": tags_sql,
                "bt": bt,
                "ea": ea,
                "eh": eh,
                "eg": eg,
                "ez": ez,
                "lag": lag,
                "foed": foed,
                "iw": iw,
                "ig": ig,
                "is_": is_,
                "pf": pf,
                "ke": ke,
                "kl": kl,
                "einn": einn,
                "inv": inv,
                "kpm": kpm,
                "lpm": lpm,
                "eim": eim,
            },
        )

    # --- gesetze_i18n (DE) ---
    gesetze_i18n_de = [
        (
            "nahverkehr_ausbau",
            "Nahverkehr-Ausbauprogramm",
            "NAV",
            "Bundesförderung für kommunalen ÖPNV-Ausbau.",
        ),
        (
            "kitaausbau",
            "Kita-Ausbaugesetz",
            "KAG",
            "Bundesweiter Ausbau der Kindertagesbetreuung mit kommunaler Umsetzung.",
        ),
        (
            "stadtentwicklung",
            "Städtebauförderungsgesetz",
            "StBauFG",
            "Förderung nachhaltiger Stadtentwicklung in strukturschwachen Kommunen.",
        ),
        (
            "gemeindeordnung_reform",
            "Gemeindeordnungs-Reform",
            "GOR",
            "Stärkung kommunaler Selbstverwaltung und Entbürokratisierung.",
        ),
        (
            "laender_polizeigesetz",
            "Polizeigesetz-Harmonisierung",
            "PGH",
            "Angleichung der Polizeigesetze der Länder durch Bundesrahmen.",
        ),
        (
            "hochschulrahmen",
            "Hochschulrahmengesetz neu",
            "HRG",
            "Modernisierung des Hochschulrahmens — mehr Autonomie für Länder-Unis.",
        ),
        (
            "laenderfinanzausgleich_reform",
            "Länderfinanzausgleich-Reform",
            "LFA",
            "Neugestaltung des Finanzausgleichs zwischen Geber- und Nehmerländern.",
        ),
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
        (
            "nahverkehr_ausbau",
            "Local Transport Expansion Programme",
            "LTE",
            "Federal funding for municipal public transport expansion.",
        ),
        (
            "kitaausbau",
            "Daycare Expansion Act",
            "DEA",
            "Nationwide expansion of daycare with municipal implementation.",
        ),
        (
            "stadtentwicklung",
            "Urban Development Funding Act",
            "UDFA",
            "Funding for sustainable urban development in structurally weak municipalities.",
        ),
        (
            "gemeindeordnung_reform",
            "Municipal Code Reform",
            "MCR",
            "Strengthening municipal self-government and reducing bureaucracy.",
        ),
        (
            "laender_polizeigesetz",
            "Police Law Harmonisation",
            "PLH",
            "Alignment of state police laws through federal framework.",
        ),
        (
            "hochschulrahmen",
            "Higher Education Framework Act (new)",
            "HEFA",
            "Modernisation of the higher education framework — more autonomy for state universities.",
        ),
        (
            "laenderfinanzausgleich_reform",
            "State Fiscal Equalisation Reform",
            "SFER",
            "Redesign of fiscal equalisation between donor and recipient states.",
        ),
    ]

    for gid, titel, kurz, desc in gesetze_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- Migration 3: bundesrat_bonus Spalte in event_choices ---
    op.add_column(
        "event_choices",
        sa.Column("bundesrat_bonus", sa.Integer(), nullable=True),
    )

    # --- Migration 4: 3 neue Events (conditional) ---
    events_data = [
        ("kommunal_haushaltskrise", "conditional", 2),
        ("kommunal_buergerprotest", "conditional", 2),
        ("laender_koalitionskrise", "conditional", 3),
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
        (
            "kommunal_haushaltskrise",
            "Kommunal",
            "Kommunale Haushaltskrise — Städte fordern Hilfe",
            "Ohne Bundeshilfe müssen wir Schwimmbäder und Büchereien schließen.",
            "Mehrere Großstädte melden akute Haushaltsnot. Der Druck auf den Bund steigt.",
            "Kommunen fordern Bundeshilfe",
        ),
        (
            "kommunal_buergerprotest",
            "Kommunal",
            "Bürgerproteste gegen Windkraftausbau",
            "Wir wollen keine Windräder in unserem Wald.",
            "In mehreren Landkreisen formieren sich Bürgerinitiativen gegen den Ausbau erneuerbarer Energien.",
            "Bürgerproteste gegen Windkraft",
        ),
        (
            "laender_koalitionskrise",
            "Länder",
            "Länder-Koalition unter Druck",
            "Die Bundesregierung ignoriert die Länder. Das hat Konsequenzen.",
            "Eine Länder-Koalition droht mit Bundesrats-Blockade für mehrere Monate.",
            "Länder-Koalition unter Druck",
        ),
    ]
    for eid, tl, title, quote, context, ticker in events_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'de', :tl, :title, :quote, :context, :ticker)
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

    # --- events_i18n (EN) ---
    events_i18n_en = [
        (
            "kommunal_haushaltskrise",
            "Municipal",
            "Municipal budget crisis — cities demand help",
            "Without federal aid we must close swimming pools and libraries.",
            "Several major cities report acute budget distress. Pressure on the federal government is rising.",
            "Municipalities demand federal aid",
        ),
        (
            "kommunal_buergerprotest",
            "Municipal",
            "Citizen protests against wind power expansion",
            "We do not want wind turbines in our forest.",
            "Citizens' initiatives are forming in several districts against the expansion of renewable energy.",
            "Citizen protests against wind power",
        ),
        (
            "laender_koalitionskrise",
            "States",
            "State coalition under pressure",
            "The federal government ignores the states. That has consequences.",
            "A coalition of states threatens to block the Bundesrat for several months.",
            "State coalition under pressure",
        ),
    ]
    for eid, tl, title, quote, context, ticker in events_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:eid, 'en', :tl, :title, :quote, :context, :ticker)
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

    # --- event_choices + event_choices_i18n ---
    max_id_result = conn.execute(
        sa.text("SELECT COALESCE(MAX(id), 0) FROM event_choices")
    )
    choice_id = max_id_result.scalar() + 1

    choices_data = [
        # kommunal_haushaltskrise: nothilfe (eff_hh -3), ablehnen (eff_zf -3), strukturhilfe (15 PK, eff_hh -1.5)
        (
            "kommunal_haushaltskrise",
            "nothilfe",
            "primary",
            0,
            -3.0,
            0,
            0,
            0,
            None,
            "Kommunale Nothilfe (3 Mrd.)",
            "Sofortige Hilfen für Haushaltsnot.",
        ),
        (
            "kommunal_haushaltskrise",
            "ablehnen",
            "danger",
            0,
            0,
            0,
            -3,
            0,
            None,
            "Ablehnen — Eigenverantwortung",
            "Keine Reaktion. Druck steigt.",
        ),
        (
            "kommunal_haushaltskrise",
            "strukturhilfe",
            "safe",
            15,
            -1.5,
            0,
            0,
            0,
            None,
            "Strukturhilfe-Paket ausarbeiten",
            "15 PK — Gezielte Hilfen.",
        ),
        # kommunal_buergerprotest: dialog (10 PK, mk +3), ignorieren (mk -5), kompromiss (8 PK)
        (
            "kommunal_buergerprotest",
            "dialog",
            "primary",
            10,
            0,
            0,
            0,
            3,
            None,
            "Dialog-Prozess starten",
            "10 PK — Medienklima verbessert.",
        ),
        (
            "kommunal_buergerprotest",
            "ignorieren",
            "danger",
            0,
            0,
            0,
            0,
            -5,
            None,
            "Ignorieren",
            "Medienklima verschlechtert.",
        ),
        (
            "kommunal_buergerprotest",
            "kompromiss",
            "safe",
            8,
            0,
            0,
            0,
            0,
            None,
            "Abstandsregeln anpassen",
            "8 PK — Kompromiss.",
        ),
        # laender_koalitionskrise: einlenken (15 PK, br_bonus +10), konfrontation (br_bonus -5)
        (
            "laender_koalitionskrise",
            "einlenken",
            "primary",
            15,
            0,
            0,
            0,
            0,
            10,
            "Einlenken — Länder-Gipfel",
            "15 PK — Bundesrat-Beziehung +10.",
        ),
        (
            "laender_koalitionskrise",
            "konfrontation",
            "danger",
            0,
            0,
            0,
            0,
            0,
            -5,
            "Konfrontation",
            "Bundesrat-Beziehung -5.",
        ),
    ]

    for (
        event_id,
        ckey,
        ctype,
        cost,
        eff_hh,
        eff_gi,
        eff_zf,
        mk_delta,
        br_bonus,
        label,
        desc,
    ) in choices_data:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices (id, event_id, choice_key, choice_type, cost_pk,
                    effekt_al, effekt_hh, effekt_gi, effekt_zf,
                    medienklima_delta, bundesrat_bonus)
                VALUES (:id, :event_id, :ckey, :ctype, :cost, 0, :eff_hh, :eff_gi, :eff_zf, :mk_delta, :br_bonus)
            """),
            {
                "id": choice_id,
                "event_id": event_id,
                "ckey": ckey,
                "ctype": ctype,
                "cost": cost,
                "eff_hh": eff_hh,
                "eff_gi": eff_gi,
                "eff_zf": eff_zf,
                "mk_delta": mk_delta,
                "br_bonus": br_bonus,
            },
        )
        log_msg = f"{label} — {desc}"
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'de', :label, :desc, :log_msg)
            """),
            {"id": choice_id, "label": label, "desc": desc, "log_msg": log_msg},
        )
        choice_id += 1

    # EN event_choices_i18n
    choices_i18n_en = [
        (
            choice_id - 8,
            "Emergency municipal aid (3 bn.)",
            "Immediate aid for budget distress.",
        ),
        (choice_id - 7, "Reject — self-responsibility", "No response. Pressure rises."),
        (choice_id - 6, "Draft structural aid package", "15 PK — Targeted aid."),
        (choice_id - 5, "Start dialogue process", "10 PK — Media climate improves."),
        (choice_id - 4, "Ignore", "Media climate worsens."),
        (choice_id - 3, "Adjust distance rules", "8 PK — Compromise."),
        (
            choice_id - 2,
            "Give in — state summit",
            "15 PK — Bundesrat relationship +10.",
        ),
        (choice_id - 1, "Confrontation", "Bundesrat relationship -5."),
    ]
    for cid, label, desc in choices_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                VALUES (:id, 'en', :label, :desc, :log_msg)
            """),
            {"id": cid, "label": label, "desc": desc, "log_msg": f"{label} — {desc}"},
        )

    conn.execute(
        sa.text("SELECT setval('event_choices_id_seq', :max_id)"),
        {"max_id": choice_id - 1},
    )


def downgrade() -> None:
    """Remove 3 Events, 7 Gesetze, bundesrat_bonus, revert Tags."""
    conn = op.get_bind()

    # Events + Choices
    event_ids = [
        "kommunal_haushaltskrise",
        "kommunal_buergerprotest",
        "laender_koalitionskrise",
    ]
    for eid in event_ids:
        conn.execute(
            sa.text(
                "DELETE FROM event_choices_i18n WHERE choice_id IN (SELECT id FROM event_choices WHERE event_id = :eid)"
            ),
            {"eid": eid},
        )
        conn.execute(
            sa.text("DELETE FROM event_choices WHERE event_id = :eid"), {"eid": eid}
        )
        conn.execute(
            sa.text("DELETE FROM events_i18n WHERE event_id = :eid"), {"eid": eid}
        )
        conn.execute(sa.text("DELETE FROM events WHERE id = :eid"), {"eid": eid})

    op.drop_column("event_choices", "bundesrat_bonus")

    # 7 neue Gesetze entfernen
    new_gesetz_ids = [
        "nahverkehr_ausbau",
        "kitaausbau",
        "stadtentwicklung",
        "gemeindeordnung_reform",
        "laender_polizeigesetz",
        "hochschulrahmen",
        "laenderfinanzausgleich_reform",
    ]
    for gid in new_gesetz_ids:
        conn.execute(
            sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :id"), {"id": gid}
        )
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :id"), {"id": gid})

    # Tags zurücksetzen (vereinfacht — Originalwerte)
    # wb: ["bund","land","kommune"], pflegereform: ["bund","land"], etc.
    revert_tags = [
        ("wb", ["bund", "land", "kommune"]),
        ("pflegereform", ["bund", "land"]),
        ("buerokratieabbau", ["bund"]),
        ("kh_reform", ["bund", "land"]),
        ("mindestlohn", ["bund"]),
        ("sicherheit_paket", ["bund"]),
    ]
    for gid, tags in revert_tags:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("UPDATE gesetze SET tags = CAST(:tags AS text[]) WHERE id = :id"),
            {"id": gid, "tags": tags_sql},
        )
