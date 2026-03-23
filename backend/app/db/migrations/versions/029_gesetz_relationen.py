"""SMA-312: Gesetz-Abhängigkeitssystem — requires, excludes, enhances

Revision ID: 029_gesetz_relationen
Revises: 028_spargesetze
Create Date: 2026-03-18

- gesetz_relationen Tabelle
- Seed: Relationen für bestehende Gesetze (requires, excludes, enhances)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "029_gesetz_relationen"
down_revision: Union[str, Sequence[str], None] = "028_spargesetze"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create gesetz_relationen table and seed relations."""
    op.create_table(
        "gesetz_relationen",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "gesetz_a_id", sa.Text(), sa.ForeignKey("gesetze.id"), nullable=False
        ),
        sa.Column(
            "gesetz_b_id", sa.Text(), sa.ForeignKey("gesetze.id"), nullable=False
        ),
        sa.Column(
            "relation_typ",
            sa.Text(),
            sa.CheckConstraint(
                "relation_typ IN ('requires', 'excludes', 'enhances')",
                name="ck_relation_typ",
            ),
            nullable=False,
        ),
        sa.Column("beschreibung_de", sa.Text(), nullable=True),
        sa.Column(
            "enhances_faktor", sa.Numeric(4, 2), nullable=True, server_default="1.0"
        ),
    )
    op.create_index(
        "ix_gesetz_relationen_gesetz_a", "gesetz_relationen", ["gesetz_a_id"]
    )
    op.create_index(
        "ix_gesetz_relationen_gesetz_b", "gesetz_relationen", ["gesetz_b_id"]
    )

    conn = op.get_bind()

    # Seed: Relationen für bestehende Gesetze
    # Format: (gesetz_a_id, gesetz_b_id, relation_typ, beschreibung_de, enhances_faktor)
    # gesetz_a = das Gesetz, das die Relation hat; gesetz_b = Ziel
    # REQUIRES: gesetz_a benötigt gesetz_b (gesetz_a kann erst nach gesetz_b)
    # EXCLUDES: gesetz_a und gesetz_b schließen sich aus
    # ENHANCES: gesetz_a wirkt stärker wenn gesetz_b beschlossen (enhances_faktor)
    relationen = [
        # REQUIRES — Aufbausequenzen
        (
            "sondervermoegen_klima",
            "schuldenbremse_reform",
            "requires",
            "Das Sondervermögen außerhalb der Schuldenbremse setzt deren Reform voraus.",
            None,
        ),
        # EXCLUDES — Gegenseitige Ausschlüsse (beide Richtungen)
        (
            "unternehmenssteuer_reform",
            "spitzensteuersatz",
            "excludes",
            "Gleichzeitige Unternehmenssteuerentlastung und Spitzensteuersatzerhöhung widersprechen sich.",
            None,
        ),
        (
            "spitzensteuersatz",
            "unternehmenssteuer_reform",
            "excludes",
            "Gleichzeitige Unternehmenssteuerentlastung und Spitzensteuersatzerhöhung widersprechen sich.",
            None,
        ),
        (
            "unternehmenssteuer_reform",
            "vermoegensteuer",
            "excludes",
            "Steuersenkung für Unternehmen und Vermögenssteuer sind gegenläufige Signale.",
            None,
        ),
        (
            "vermoegensteuer",
            "unternehmenssteuer_reform",
            "excludes",
            "Steuersenkung für Unternehmen und Vermögenssteuer sind gegenläufige Signale.",
            None,
        ),
        # ENHANCES — Synergien (ee = EE-Beschleunigungsgesetz)
        (
            "ee",
            "co2_steuer",
            "enhances",
            "CO2-Bepreisung verstärkt den Anreiz für erneuerbare Energien — Synergieeffekt +30%.",
            1.3,
        ),
        (
            "kitaausbau",
            "schuldenbremse_reform",
            "enhances",
            "Mit mehr fiskalischem Spielraum wirkt der Kita-Ausbau 20% stärker.",
            1.2,
        ),
    ]

    for ga, gb, typ, beschr, faktor in relationen:
        conn.execute(
            sa.text("""
                INSERT INTO gesetz_relationen (gesetz_a_id, gesetz_b_id, relation_typ, beschreibung_de, enhances_faktor)
                VALUES (:ga, :gb, :typ, :beschr, :faktor)
            """),
            {"ga": ga, "gb": gb, "typ": typ, "beschr": beschr, "faktor": faktor},
        )


def downgrade() -> None:
    """Drop gesetz_relationen table."""
    op.drop_index("ix_gesetz_relationen_gesetz_b", table_name="gesetz_relationen")
    op.drop_index("ix_gesetz_relationen_gesetz_a", table_name="gesetz_relationen")
    op.drop_table("gesetz_relationen")
