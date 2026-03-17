"""Seed 6 Wahlkampf-Aktionen (SMA-276)

Revision ID: 018_seed_wahlkampf
Revises: 017_seed_medien_events
Create Date: 2025-03-17

Migration 5: 6 Wahlkampf-Aktionen mit DE + EN Texten.
rede (8 PK), tv_duell (0 PK, einmalig), koalition (12 PK), milieu (10 PK), medien (15 PK, einmalig), verbands (0 PK, passiv)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "018_seed_wahlkampf"
down_revision: Union[str, Sequence[str], None] = "017_seed_medien_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed 6 Wahlkampf-Aktionen (DE + EN)."""
    conn = op.get_bind()

    # --- wahlkampf_aktionen ---
    # id, aktion_typ, cost_pk, min_complexity, einmalig, max_pro_monat
    aktionen_data = [
        ("wahlkampf_rede", "rede", 8, 1, False, 1),
        ("wahlkampf_tv_duell", "tv_duell", 0, 1, True, 1),
        ("wahlkampf_koalition", "koalition", 12, 1, False, 1),
        ("wahlkampf_milieu", "milieu", 10, 1, False, 1),
        ("wahlkampf_medien", "medien", 15, 1, True, 1),
        ("wahlkampf_verbands", "verbands", 0, 1, False, 1),  # passiv
    ]

    for aid, typ, cost, mc, einmalig, max_pro in aktionen_data:
        conn.execute(
            sa.text("""
                INSERT INTO wahlkampf_aktionen (id, aktion_typ, cost_pk, min_complexity, einmalig, max_pro_monat)
                VALUES (:id, :typ, :cost, :mc, :einmalig, :max_pro)
            """),
            {"id": aid, "typ": typ, "cost": cost, "mc": mc, "einmalig": einmalig, "max_pro": max_pro},
        )

    # --- wahlkampf_aktionen_i18n (DE) ---
    aktionen_i18n_de = [
        ("wahlkampf_rede", "Wahlkampfrede", "Große Rede vor Parteibasis oder Bürgern. Stärkt Zustimmung in der Wählerschaft."),
        ("wahlkampf_tv_duell", "TV-Duell", "Einmaliges TV-Duell mit Oppositionsführer. Hohe Reichweite, keine PK-Kosten."),
        ("wahlkampf_koalition", "Koalitionsauftritt", "Gemeinsamer Auftritt mit Koalitionspartner. Stärkt Koalitionsimage."),
        ("wahlkampf_milieu", "Milieu-Ansprache", "Gezielte Ansprache eines Wählermilieus. Erhöht Zustimmung in dieser Gruppe."),
        ("wahlkampf_medien", "Medienoffensive", "Einmalige große Medienkampagne. Maximale Sichtbarkeit."),
        ("wahlkampf_verbands", "Verbandsarbeit", "Passive Pflege von Verbandsbeziehungen. Keine PK-Kosten, wirkt im Hintergrund."),
    ]

    for aid, name, desc in aktionen_i18n_de:
        conn.execute(
            sa.text("""
                INSERT INTO wahlkampf_aktionen_i18n (aktion_id, locale, name, "desc")
                VALUES (:id, 'de', :name, :desc)
            """),
            {"id": aid, "name": name, "desc": desc},
        )

    # --- wahlkampf_aktionen_i18n (EN) ---
    aktionen_i18n_en = [
        ("wahlkampf_rede", "Campaign Speech", "Major speech before party base or citizens. Strengthens voter approval."),
        ("wahlkampf_tv_duell", "TV Debate", "One-time TV debate with opposition leader. High reach, no PK cost."),
        ("wahlkampf_koalition", "Coalition Appearance", "Joint appearance with coalition partner. Strengthens coalition image."),
        ("wahlkampf_milieu", "Milieu Outreach", "Targeted outreach to a voter milieu. Increases approval in that group."),
        ("wahlkampf_medien", "Media Offensive", "One-time major media campaign. Maximum visibility."),
        ("wahlkampf_verbands", "Association Work", "Passive maintenance of association relations. No PK cost, works in background."),
    ]

    for aid, name, desc in aktionen_i18n_en:
        conn.execute(
            sa.text("""
                INSERT INTO wahlkampf_aktionen_i18n (aktion_id, locale, name, "desc")
                VALUES (:id, 'en', :name, :desc)
            """),
            {"id": aid, "name": name, "desc": desc},
        )


def downgrade() -> None:
    """Remove 6 Wahlkampf-Aktionen."""
    conn = op.get_bind()
    aktion_ids = [
        "wahlkampf_rede", "wahlkampf_tv_duell", "wahlkampf_koalition",
        "wahlkampf_milieu", "wahlkampf_medien", "wahlkampf_verbands",
    ]
    for aid in aktion_ids:
        conn.execute(sa.text("DELETE FROM wahlkampf_aktionen_i18n WHERE aktion_id = :id"), {"id": aid})
        conn.execute(sa.text("DELETE FROM wahlkampf_aktionen WHERE id = :id"), {"id": aid})
