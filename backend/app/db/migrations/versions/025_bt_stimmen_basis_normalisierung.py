"""SMA-307: BT-Stimmen Basis-Werte auf neutrale ~50% normalisieren

Revision ID: 025_bt_stimmen_basis
Revises: 024_framing_labels
Create Date: 2025-03-17

Dynamische BT-Stimmen: Basis-Werte werden zu neutralen Ausgangswerten.
Die Partei-Kongruenz-Boni verschieben dann je nach Koalition.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "025_bt_stimmen_basis"
down_revision: Union[str, Sequence[str], None] = "024_framing_labels"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEUE_BASIS_WERTE: dict[str, int] = {
    "ee": 50,
    "wb": 52,
    "sr": 50,
    "bp": 52,
    "mindestlohn": 50,
    "pflegereform": 56,
    "kh_reform": 52,
    "digi_bildung": 52,
    "buerokratieabbau": 54,
    "ki_foerder": 55,
    "sicherheit_paket": 52,
    "laenderkompetenz": 50,
    "klimaschutz": 50,
    "lieferkette": 50,
    "grundrechte": 52,
    "sondervermoegen_klima": 50,
    "schuldenbremse_reform": 50,
    "vermoegensteuer": 50,
    "steuerreform_2": 54,
    "nahverkehr_ausbau": 52,
    "kitaausbau": 54,
    "stadtentwicklung": 52,
    "gemeindeordnung_reform": 50,
    "laender_polizeigesetz": 52,
    "hochschulrahmen": 52,
    "laenderfinanzausgleich_reform": 50,
}


def upgrade() -> None:
    """Setze bt_stimmen_ja auf neutrale Basis-Werte."""
    conn = op.get_bind()
    for gid, bt in NEUE_BASIS_WERTE.items():
        conn.execute(
            sa.text("UPDATE gesetze SET bt_stimmen_ja = :bt WHERE id = :id"),
            {"id": gid, "bt": bt},
        )


def downgrade() -> None:
    """Rückgängig: alte Werte aus 002, 006, 011, 023."""
    conn = op.get_bind()
    alte_werte: dict[str, int] = {
        "ee": 48,
        "wb": 55,
        "sr": 51,
        "bp": 53,
        "mindestlohn": 52,
        "pflegereform": 55,
        "kh_reform": 53,
        "digi_bildung": 51,
        "buerokratieabbau": 54,
        "ki_foerder": 58,
        "sicherheit_paket": 48,
        "laenderkompetenz": 44,
        "klimaschutz": 46,
        "lieferkette": 50,
        "grundrechte": 56,
        "sondervermoegen_klima": 46,
        "schuldenbremse_reform": 44,
        "vermoegensteuer": 48,
        "steuerreform_2": 54,
        "nahverkehr_ausbau": 52,
        "kitaausbau": 58,
        "stadtentwicklung": 54,
        "gemeindeordnung_reform": 50,
        "laender_polizeigesetz": 48,
        "hochschulrahmen": 55,
        "laenderfinanzausgleich_reform": 46,
    }
    for gid, bt in alte_werte.items():
        conn.execute(
            sa.text("UPDATE gesetze SET bt_stimmen_ja = :bt WHERE id = :id"),
            {"id": gid, "bt": bt},
        )
