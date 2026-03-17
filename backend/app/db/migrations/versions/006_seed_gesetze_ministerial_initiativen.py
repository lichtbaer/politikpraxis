"""Seed 10 neue Gesetze + Grundrechte-Gesetz + 5 Ministerial-Initiativen (SMA-265)

Revision ID: 006_seed_gesetze
Revises: 005_seed_ideologie
Create Date: 2025-03-17

10 neue Gesetze je Ideologie-Cluster, 1 Grundrechte-Gesetz für Kern,
5 Ministerial-Initiativen (Wolf, Braun, Lehmann, Maier, Kern).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "006_seed_gesetze"
down_revision: Union[str, Sequence[str], None] = "005_seed_ideologie"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed 11 neue Gesetze + 5 Ministerial-Initiativen."""
    conn = op.get_bind()

    # --- 11 neue Gesetze (10 aus Issue + 1 Grundrechte für Kern) ---
    gesetze_data = [
        # id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
        # foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat, politikfeld_id
        ("mindestlohn", ["bund"], 52, -0.4, -0.3, -0.8, 5, 3, False, -60, -20, -50, "arbeit_soziales"),
        ("pflegereform", ["bund", "land"], 55, 0, -0.5, -0.3, 6, 5, False, -35, -30, -50, "gesundheit_pflege"),
        ("kh_reform", ["bund", "land"], 53, 0, -0.4, -0.2, 4, 6, False, -25, -30, -40, "gesundheit_pflege"),
        ("digi_bildung", ["land", "bund", "eu"], 51, -0.2, -0.6, -0.4, 3, 5, False, -10, -40, -60, "bildung_forschung"),
        ("buerokratieabbau", ["bund"], 54, -0.3, 0.3, 0.2, 2, 3, False, 65, 10, 50, "wirtschaft_finanzen"),
        ("ki_foerder", ["bund", "eu"], 58, -0.5, -0.3, 0.1, 4, 4, False, 55, -5, 25, "digital_infrastruktur"),
        ("sicherheit_paket", ["bund"], 48, 0, -0.2, 0, 3, 3, False, 10, 80, 25, "innere_sicherheit"),
        ("laenderkompetenz", ["land"], 44, 0, 0.1, 0, 1, 4, True, 15, 30, -70, "digital_infrastruktur"),
        ("klimaschutz", ["bund", "eu"], 46, -0.1, -0.8, -0.3, 4, 5, False, -70, -80, -30, "umwelt_energie"),
        ("lieferkette", ["bund", "eu"], 50, 0, -0.1, -0.4, 2, 4, False, -40, -50, -20, "wirtschaft_finanzen"),
        ("grundrechte", ["bund"], 56, 0, 0, -0.2, 3, 4, False, -20, -50, -30, "innere_sicherheit"),
    ]

    for (
        gid, tags, bt, ea, eh, eg, ez, lag, foed, iw, ig, is_, pf
    ) in gesetze_data:
        tags_sql = "{" + ",".join(f'"{t}"' for t in tags) + "}"
        conn.execute(
            sa.text("""
                INSERT INTO gesetze (id, tags, bt_stimmen_ja, effekt_al, effekt_hh, effekt_gi, effekt_zf, effekt_lag,
                    foederalismus_freundlich, ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat, politikfeld_id)
                VALUES (:id, CAST(:tags AS text[]), :bt, :ea, :eh, :eg, :ez, :lag, :foed, :iw, :ig, :is_, :pf)
            """),
            {
                "id": gid, "tags": tags_sql, "bt": bt, "ea": ea, "eh": eh, "eg": eg, "ez": ez, "lag": lag,
                "foed": foed, "iw": iw, "ig": ig, "is_": is_, "pf": pf,
            },
        )

    # --- gesetze_i18n (DE) ---
    gesetze_i18n_de = [
        ("mindestlohn", "Mindestlohnerhöhungsgesetz", "MLG",
         "Anhebung des gesetzlichen Mindestlohns auf 14,50 Euro. Stärkung der Kaufkraft und soziale Absicherung."),
        ("pflegereform", "Pflegereformgesetz", "PRG",
         "Verbesserung der Pflegefinanzierung und Qualitätsstandards. Mehr Personal in Pflegeheimen."),
        ("kh_reform", "Krankenhausstrukturreform", "KHR",
         "Neuordnung der Krankenhauslandschaft. Bessere Versorgung in ländlichen Regionen."),
        ("digi_bildung", "Digitale Bildungsoffensive", "DBO",
         "Bundesweite Digitalisierung von Schulen. Ausstattung mit Tablets und digitale Lehrpläne."),
        ("buerokratieabbau", "Bürokratieabbau- und Entlastungsgesetz", "BEG",
         "Vereinfachung von Genehmigungsverfahren. Weniger Melde- und Nachweispflichten für Unternehmen."),
        ("ki_foerder", "KI-Förder- und Regulierungsgesetz", "KIFG",
         "Förderung von KI-Forschung und -Entwicklung. Regulierung von Hochrisiko-Anwendungen."),
        ("sicherheit_paket", "Innere-Sicherheit-Stärkungsgesetz", "ISSG",
         "Mehr Befugnisse für Sicherheitsbehörden. Stärkung der Videoüberwachung und des Datenaustauschs."),
        ("laenderkompetenz", "Länderkompetenz-Stärkungsgesetz", "LKG",
         "Übertragung von Zuständigkeiten vom Bund auf die Länder. Stärkung des Föderalismus."),
        ("klimaschutz", "Klimaschutzsofortprogramm", "KSP",
         "Sofortmaßnahmen für Klimaschutz. Ausbau erneuerbarer Energien und CO2-Preise."),
        ("lieferkette", "Lieferkettensorgfaltspflichtgesetz", "LkSG",
         "Sorgfaltspflichten für Unternehmen in globalen Lieferketten. Menschenrechte und Umwelt."),
        ("grundrechte", "Grundrechtsstärkungsgesetz", "GrSG",
         "Stärkung der Grundrechte im digitalen Zeitalter. Verbesserter Datenschutz und Transparenz."),
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
        ("mindestlohn", "Minimum Wage Increase Act", "MLG",
         "Raising the statutory minimum wage to 14.50 euros. Strengthening purchasing power and social security."),
        ("pflegereform", "Care Reform Act", "PRG",
         "Improvement of care funding and quality standards. More staff in care homes."),
        ("kh_reform", "Hospital Structure Reform", "KHR",
         "Reorganisation of the hospital landscape. Better care in rural regions."),
        ("digi_bildung", "Digital Education Offensive", "DBO",
         "Nationwide digitalisation of schools. Equipment with tablets and digital curricula."),
        ("buerokratieabbau", "Bureaucracy Reduction and Relief Act", "BEG",
         "Simplification of approval procedures. Fewer reporting and proof obligations for companies."),
        ("ki_foerder", "AI Promotion and Regulation Act", "KIFG",
         "Promotion of AI research and development. Regulation of high-risk applications."),
        ("sicherheit_paket", "Domestic Security Strengthening Act", "ISSG",
         "More powers for security authorities. Strengthening of video surveillance and data exchange."),
        ("laenderkompetenz", "State Competence Strengthening Act", "LKG",
         "Transfer of competencies from federal to state level. Strengthening of federalism."),
        ("klimaschutz", "Climate Protection Emergency Programme", "KSP",
         "Immediate measures for climate protection. Expansion of renewable energies and CO2 prices."),
        ("lieferkette", "Supply Chain Due Diligence Act", "LkSG",
         "Due diligence obligations for companies in global supply chains. Human rights and environment."),
        ("grundrechte", "Fundamental Rights Strengthening Act", "GrSG",
         "Strengthening of fundamental rights in the digital age. Improved data protection and transparency."),
    ]

    for gid, titel, kurz, desc in gesetze_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO gesetze_i18n (gesetz_id, locale, titel, kurz, "desc")
                VALUES (:id, 'en', :titel, :kurz, :desc)
            """),
            {"id": gid, "titel": titel, "kurz": kurz, "desc": desc},
        )

    # --- 5 Ministerial-Initiativen ---
    # Wolf, Braun, Lehmann, Maier, Kern
    # char_id: um=Wolf, im=Braun, fm=Lehmann, wm=Maier, jm=Kern
    ministerial_data = [
        ("wolf_klimaschutz", "um", "klimaschutz", "mood+event"),
        ("braun_sicherheit", "im", "sicherheit_paket", "mood+ideologie_distanz"),
        ("lehmann_buerokratie", "fm", "buerokratieabbau", "mood+ideologie_distanz"),
        ("maier_ki", "wm", "ki_foerder", "event+ideologie_distanz"),
        ("kern_grundrechte", "jm", "grundrechte", "mood+event"),
    ]

    for mid, char_id, gesetz_ref_id, trigger_type in ministerial_data:
        conn.execute(
            sa.text("""
                INSERT INTO ministerial_initiativen (id, char_id, gesetz_ref_id, trigger_type, min_complexity, cooldown_months)
                VALUES (:id, :char_id, :gesetz_ref_id, :trigger_type, 3, 8)
            """),
            {"id": mid, "char_id": char_id, "gesetz_ref_id": gesetz_ref_id, "trigger_type": trigger_type},
        )

    # --- ministerial_initiativen_i18n (DE) ---
    ministerial_i18n_de = [
        ("wolf_klimaschutz", "Klimaschutzsofortprogramm", "Wolf initiiert das Klimaschutzsofortprogramm.",
         "„Wenn wir jetzt nicht handeln, wird es zu spät sein.\""),
        ("braun_sicherheit", "Innere-Sicherheit-Paket", "Braun bringt das Innere-Sicherheit-Paket ein.",
         "„Die Bürger erwarten mehr Sicherheit.\""),
        ("lehmann_buerokratie", "Bürokratieabbau", "Lehmann initiiert das Bürokratieabbau-Gesetz.",
         "„Weniger Bürokratie bedeutet mehr Wachstum.\""),
        ("maier_ki", "KI-Fördergesetz", "Maier bringt das KI-Förder- und Regulierungsgesetz ein.",
         "„Deutschland muss bei KI vorne dabei sein.\""),
        ("kern_grundrechte", "Grundrechtsstärkung", "Kern initiiert das Grundrechtsstärkungsgesetz.",
         "„Grundrechte sind in der digitalen Welt nicht verhandelbar.\""),
    ]

    for mid, titel, desc, quote in ministerial_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO ministerial_initiativen_i18n (initiative_id, locale, titel, "desc", quote)
                VALUES (:id, 'de', :titel, :desc, :quote)
            """),
            {"id": mid, "titel": titel, "desc": desc, "quote": quote},
        )

    # --- ministerial_initiativen_i18n (EN) ---
    ministerial_i18n_en = [
        ("wolf_klimaschutz", "Climate Protection Programme", "Wolf initiates the climate protection emergency programme.",
         "„If we don't act now, it will be too late.\""),
        ("braun_sicherheit", "Domestic Security Package", "Braun introduces the domestic security package.",
         "„Citizens expect more security.\""),
        ("lehmann_buerokratie", "Bureaucracy Reduction", "Lehmann initiates the bureaucracy reduction act.",
         "„Less bureaucracy means more growth.\""),
        ("maier_ki", "AI Promotion Act", "Maier introduces the AI promotion and regulation act.",
         "„Germany must be at the forefront of AI.\""),
        ("kern_grundrechte", "Fundamental Rights Strengthening", "Kern initiates the fundamental rights strengthening act.",
         "„Fundamental rights are not negotiable in the digital world.\""),
    ]

    for mid, titel, desc, quote in ministerial_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO ministerial_initiativen_i18n (initiative_id, locale, titel, "desc", quote)
                VALUES (:id, 'en', :titel, :desc, :quote)
            """),
            {"id": mid, "titel": titel, "desc": desc, "quote": quote},
        )


def downgrade() -> None:
    """Remove 11 Gesetze + 5 Ministerial-Initiativen."""
    conn = op.get_bind()

    # Ministerial-Initiativen zuerst (FK auf gesetze)
    conn.execute(sa.text("DELETE FROM ministerial_initiativen_i18n"))
    conn.execute(sa.text("DELETE FROM ministerial_initiativen"))

    # Gesetze
    new_ids = [
        "mindestlohn", "pflegereform", "kh_reform", "digi_bildung", "buerokratieabbau",
        "ki_foerder", "sicherheit_paket", "laenderkompetenz", "klimaschutz", "lieferkette", "grundrechte",
    ]
    for gid in new_ids:
        conn.execute(sa.text("DELETE FROM gesetze_i18n WHERE gesetz_id = :id"), {"id": gid})
        conn.execute(sa.text("DELETE FROM gesetze WHERE id = :id"), {"id": gid})
