"""Seed Ideologie, Milieus, Politikfelder, Verbände (DE)

Revision ID: 005_seed_ideologie
Revises: 004_ideologie
Create Date: 2025-03-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "005_seed_ideologie"
down_revision: Union[str, Sequence[str], None] = "004_ideologie"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Ideologie-Werte für Gesetze/Chars, 7 Milieus, 8 Politikfelder, 8 Verbände."""
    conn = op.get_bind()

    # --- 8 Politikfelder (zuerst, da gesetze.politikfeld_id FK darauf verweist) ---
    politikfelder = [
        ("wirtschaft_finanzen", "Wirtschaft & Finanzen", "Wirt"),
        ("arbeit_soziales", "Arbeit & Soziales", "Soz"),
        ("umwelt_energie", "Umwelt & Energie", "Umw"),
        ("innere_sicherheit", "Innere Sicherheit", "Inn"),
        ("bildung_forschung", "Bildung & Forschung", "Bild"),
        ("gesundheit_pflege", "Gesundheit & Pflege", "Ges"),
        ("digital_infrastruktur", "Digital & Infrastruktur", "Dig"),
        ("landwirtschaft", "Landwirtschaft", "Land"),
    ]
    for pfid, name, kurz in politikfelder:
        conn.execute(
            sa.text("""
                INSERT INTO politikfelder (id, vernachlaessigung_start, eu_relevanz, kommunal_relevanz, min_complexity)
                VALUES (:id, 0, 1, 1, 1)
            """),
            {"id": pfid},
        )
        conn.execute(
            sa.text("""
                INSERT INTO politikfelder_i18n (feld_id, locale, name, kurz)
                VALUES (:id, 'de', :name, :kurz)
            """),
            {"id": pfid, "name": name, "kurz": kurz},
        )

    # --- Gesetze: Ideologie + Politikfeld ---
    gesetze_updates = [
        ("ee", -60, -70, -20, "umwelt_energie"),
        ("wb", -50, -20, -60, "wirtschaft_finanzen"),
        ("sr", 70, 0, 40, "wirtschaft_finanzen"),
        ("bp", -20, -10, -70, "bildung_forschung"),
    ]
    for gid, iw, ig, is_, pf in gesetze_updates:
        conn.execute(
            sa.text("""
                UPDATE gesetze SET ideologie_wirtschaft = :iw, ideologie_gesellschaft = :ig,
                ideologie_staat = :is_, politikfeld_id = :pf
                WHERE id = :gid
            """),
            {"gid": gid, "iw": iw, "ig": ig, "is_": is_, "pf": pf},
        )

    # --- Chars: Ideologie ---
    chars_updates = [
        ("kanzler", -10, -20, -30),
        ("fm", 65, 20, 50),
        ("wm", 50, 0, 30),
        ("im", 20, 75, 40),
        ("jm", -20, -50, -20),
        ("um", -30, -65, -40),
    ]
    for cid, iw, ig, is_ in chars_updates:
        conn.execute(
            sa.text("""
                UPDATE chars SET ideologie_wirtschaft = :iw, ideologie_gesellschaft = :ig,
                ideologie_staat = :is_ WHERE id = :cid
            """),
            {"cid": cid, "iw": iw, "ig": ig, "is_": is_},
        )

    # --- 7 Milieus ---
    milieus = [
        ("etablierte", 10, 85, 65, 45, 50, 3, "konservativ"),
        ("leistungstraeger", 15, 80, 40, -20, 20, 2, "arbeit"),
        ("buergerliche_mitte", 14, 70, 10, 15, -10, 2, "konservativ"),
        ("traditionelle", 13, 68, -5, 55, -40, 2, "konservativ"),
        ("soziale_mitte", 15, 72, -45, -30, -55, 2, "progressiv"),
        ("postmaterielle", 12, 75, -60, -70, -35, 2, "progressiv"),
        ("prekaere", 9, 40, -30, 40, -60, 3, "arbeit"),
    ]
    milieus_i18n = [
        ("etablierte", "Etablierte", "Konservativ-wohlhabend", "Wohlhabende, etablierte Eliten mit hoher Wahlbeteiligung."),
        ("leistungstraeger", "Leistungsträger", "Leistungsorientiert", "Erfolgreiche Berufstätige mit mittlerer bis hoher Beteiligung."),
        ("buergerliche_mitte", "Bürgerliche Mitte", "Mittelschicht-konservativ", "Traditionelle Mittelschicht mit moderater Beteiligung."),
        ("traditionelle", "Traditionelle", "Werte-konservativ", "Traditionell orientierte Wähler mit starker Wertebindung."),
        ("soziale_mitte", "Soziale Mitte", "Links-mitte", "Sozial orientierte Mitte mit progressiven Tendenzen."),
        ("postmaterielle", "Postmaterielle", "Grün-progressiv", "Umwelt- und gesellschaftspolitisch progressive Wähler."),
        ("prekaere", "Prekäre", "Abgehängt", "Von Abstieg bedrohte Wähler mit niedriger Beteiligung."),
    ]
    for mid, gew, bb, iw, ig, is_, mc, agg in milieus:
        conn.execute(
            sa.text("""
                INSERT INTO milieus (id, gewicht, basisbeteiligung, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat, min_complexity, aggregat_gruppe)
                VALUES (:id, :gew, :bb, :iw, :ig, :is_, :mc, :agg)
            """),
            {"id": mid, "gew": gew, "bb": bb, "iw": iw, "ig": ig, "is_": is_, "mc": mc, "agg": agg},
        )
    for mid, name, kurz, beschr in milieus_i18n:
        conn.execute(
            sa.text("""
                INSERT INTO milieus_i18n (milieu_id, locale, name, kurzcharakter, beschreibung)
                VALUES (:id, 'de', :name, :kurz, :beschr)
            """),
            {"id": mid, "name": name, "kurz": kurz, "beschr": beschr},
        )

    # --- 8 Verbände ---
    verbaende = [
        ("bdi", "wirtschaft_finanzen", 70, 20, 50, 45, 5, 4, 3, 2),
        ("gbd", "arbeit_soziales", -60, -20, -50, 55, 5, 3, 3, 3),
        ("uvb", "umwelt_energie", -50, -80, -30, 60, 3, 5, 4, 5),
        ("sgd", "innere_sicherheit", 10, 70, 20, 30, 4, 2, 4, 3),
        ("bvd", "bildung_forschung", -20, -40, -60, 50, 2, 3, 5, 5),
        ("pvd", "gesundheit_pflege", -30, -30, -50, 40, 3, 1, 3, 5),
        ("dwv", "digital_infrastruktur", 60, -10, 30, 55, 4, 5, 2, 3),
        ("bvl", "landwirtschaft", 20, 50, -40, 35, 4, 5, 4, 3),
    ]
    verbaende_i18n = [
        ("bdi", "Bundesverband der Deutschen Industrie", "BDI", "Spitzenverband der deutschen Industrie."),
        ("gbd", "Gewerkschaftsbund Deutschland", "GBD", "Dachverband der Gewerkschaften."),
        ("uvb", "Umweltverbände Deutschland", "UVB", "Dachverband der Umwelt- und Naturschutzverbände."),
        ("sgd", "Sicherheitsverbände Deutschland", "SGD", "Interessenvertretung für innere Sicherheit."),
        ("bvd", "Bildungsverbände Deutschland", "BVD", "Dachverband der Bildungsverbände."),
        ("pvd", "Pflegeverbände Deutschland", "PVD", "Interessenvertretung der Pflegebranche."),
        ("dwv", "Digitalwirtschaftsverband", "DWV", "Verband der Digitalwirtschaft."),
        ("bvl", "Bundesverband Landwirtschaft", "BVL", "Spitzenverband der Landwirtschaft."),
    ]
    for vid, pfid, iw, ig, is_, bezieh, sb, se, sl, sk in verbaende:
        conn.execute(
            sa.text("""
                INSERT INTO verbaende (id, politikfeld_id, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat, beziehung_start, staerke_bund, staerke_eu, staerke_laender, staerke_kommunen)
                VALUES (:id, :pfid, :iw, :ig, :is_, :bezieh, :sb, :se, :sl, :sk)
            """),
            {"id": vid, "pfid": pfid, "iw": iw, "ig": ig, "is_": is_, "bezieh": bezieh, "sb": sb, "se": se, "sl": sl, "sk": sk},
        )
    for vid, name, kurz, bio in verbaende_i18n:
        conn.execute(
            sa.text("""
                INSERT INTO verbaende_i18n (verband_id, locale, name, kurz, bio)
                VALUES (:id, 'de', :name, :kurz, :bio)
            """),
            {"id": vid, "name": name, "kurz": kurz, "bio": bio},
        )

    # --- Verbands-Tradeoffs (je 1–2 pro Verband) ---
    tradeoffs_data = [
        ("bdi", "bdi_steuer", -0.2, 0, 0.5, 0, 0, "Keine Digitalsteuer auf Industrie", "Industrie von Digitalsteuer ausnehmen."),
        ("bdi", "bdi_regulierung", -0.1, 0, 0.3, -1, 0, "Regulierungspause für Industrie", "Übergangsfristen bei neuen Regulierungen."),
        ("gbd", "gbd_mindestlohn", 0, 0, -0.4, 2, 0, "Mindestlohnerhöhung", "Mindestlohn anheben."),
        ("gbd", "gbd_mitbestimmung", -0.1, 0, -0.2, 1, 0, "Stärkere Mitbestimmung", "Betriebsräte stärken."),
        ("uvb", "uvb_klima", 0, 0, -0.5, 3, 1, "Klimaschutz verstärken", "Klimaziele verschärfen."),
        ("uvb", "uvb_naturschutz", -0.2, 0, -0.3, 2, 0, "Naturschutz-Flächen", "Mehr Flächen für Naturschutz."),
        ("sgd", "sgd_sicherheit", 0, 0, 0.2, -2, 0, "Mehr Sicherheitspersonal", "Mehr Mittel für Sicherheitsbehörden."),
        ("bvd", "bvd_bildung", -0.3, 0, -0.4, 2, 1, "Bundesfinanzierung Bildung", "Bundesmittel für Bildung erhöhen."),
        ("pvd", "pvd_pflege", -0.4, 0, -0.5, 3, 0, "Pflegefinanzierung erhöhen", "Mehr Mittel für Pflege."),
        ("dwv", "dwv_digital", -0.1, 0, 0.4, 0, 0, "Digitalisierung fördern", "Investitionen in digitale Infrastruktur."),
        ("bvl", "bvl_agrar", -0.2, 0, 0.2, -1, 0, "Agrarsubventionen sichern", "EU-Agrarförderung erhalten."),
        ("bvl", "bvl_subvention", -0.3, 0, 0.1, 0, 0, "Subventionen für Landwirtschaft", "Nationale Agrarförderung."),
    ]
    tid = 1
    for vid, tkey, ea, eh, eg, ez, fdd, label, desc in tradeoffs_data:
        conn.execute(
            sa.text("""
                INSERT INTO verbands_tradeoffs (id, verband_id, tradeoff_key, effekt_al, effekt_hh, effekt_gi, effekt_zf, feld_druck_delta)
                VALUES (:id, :vid, :tkey, :ea, :eh, :eg, :ez, :fdd)
            """),
            {"id": tid, "vid": vid, "tkey": tkey, "ea": ea, "eh": eh, "eg": eg, "ez": ez, "fdd": fdd},
        )
        conn.execute(
            sa.text("""
                INSERT INTO verbands_tradeoffs_i18n (tradeoff_id, locale, label, "desc")
                VALUES (:tid, 'de', :label, :desc)
            """),
            {"tid": tid, "label": label, "desc": desc},
        )
        tid += 1


def downgrade() -> None:
    """Remove seeded data."""
    conn = op.get_bind()

    conn.execute(sa.text("DELETE FROM verbands_tradeoffs_i18n"))
    conn.execute(sa.text("DELETE FROM verbands_tradeoffs"))
    conn.execute(sa.text("DELETE FROM verbaende_i18n"))
    conn.execute(sa.text("DELETE FROM verbaende"))
    conn.execute(sa.text("DELETE FROM milieus_i18n"))
    conn.execute(sa.text("DELETE FROM milieus"))
    conn.execute(sa.text("DELETE FROM politikfelder_i18n"))
    conn.execute(sa.text("DELETE FROM politikfelder"))

    # Reset ideologie/politikfeld to defaults
    conn.execute(sa.text("""
        UPDATE gesetze SET ideologie_wirtschaft = 0, ideologie_gesellschaft = 0, ideologie_staat = 0, politikfeld_id = NULL, politikfeld_sekundaer = '{}'
    """))
    conn.execute(sa.text("""
        UPDATE chars SET ideologie_wirtschaft = 0, ideologie_gesellschaft = 0, ideologie_staat = 0
    """))
