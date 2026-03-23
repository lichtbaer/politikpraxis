"""SMA-294: eingangszitat in chars_i18n + Seed für alle 9 Chars (DE)

Revision ID: 022_eingangszitat
Revises: 021_parteien
Create Date: 2025-03-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "022_eingangszitat"
down_revision: Union[str, Sequence[str], None] = "021_parteien"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Eingangszitate für alle 9 Chars (DE) — aus Content-Dokument SMA-294
CHARS_EINGANGSZITAT_DE = [
    (
        "kanzler",
        "„Die Koalition hält nur, wenn jeder seinen Beitrag leistet — ich erwarte Loyalität.",
    ),
    ("fm", "„Kein Gesetz ohne Deckungsnachweis. Das ist nicht verhandelbar."),
    ("wm", "„Standortpolitik ist kein Luxus — sie ist unsere Zukunft."),
    (
        "im",
        "„Sicherheit geht vor. Wer das nicht versteht, hat in diesem Kabinett nichts verloren.",
    ),
    ("jm", "„Verfassungswidrige Vorhaben werde ich nicht mittragen — Punkt."),
    ("um", "„Klimapolitik ist keine Verhandlungsmasse. Die Zeit läuft."),
    (
        "am",
        "„Mindestlohn und Tarifbindung — das sind keine Wunschthemen, das sind Pflicht.",
    ),
    ("gm", "„Der Pflegenotstand ist real. Wir müssen es anerkennen und handeln."),
    (
        "bm",
        "„Der Föderalismus blockiert jede Reform. Ohne Anerkennung des Notstands bin ich raus.",
    ),
]

CHARS_EINGANGSZITAT_EN = [
    (
        "kanzler",
        '"The coalition holds only if everyone contributes — I expect loyalty."',
    ),
    ("fm", '"No law without proof of funding. That is non-negotiable."'),
    ("wm", '"Business location policy is not a luxury — it is our future."'),
    (
        "im",
        '"Security comes first. Whoever does not understand that has no place in this cabinet."',
    ),
    ("jm", '"I will not support unconstitutional projects — period."'),
    ("um", '"Climate policy is not negotiable. Time is running out."'),
    (
        "am",
        '"Minimum wage and collective bargaining — these are not wish topics, they are mandatory."',
    ),
    ("gm", '"The care crisis is real. We must acknowledge it and act."'),
    (
        "bm",
        '"Federalism blocks every reform. Without recognition of the emergency I am out."',
    ),
]


def upgrade() -> None:
    """Add eingangszitat column to chars_i18n and seed."""
    op.add_column(
        "chars_i18n",
        sa.Column("eingangszitat", sa.Text(), nullable=True),
    )

    conn = op.get_bind()
    for char_id, zitat in CHARS_EINGANGSZITAT_DE:
        conn.execute(
            sa.text(
                "UPDATE chars_i18n SET eingangszitat = :zitat WHERE char_id = :cid AND locale = 'de'"
            ),
            {"zitat": zitat, "cid": char_id},
        )
    for char_id, zitat in CHARS_EINGANGSZITAT_EN:
        conn.execute(
            sa.text(
                "UPDATE chars_i18n SET eingangszitat = :zitat WHERE char_id = :cid AND locale = 'en'"
            ),
            {"zitat": zitat, "cid": char_id},
        )


def downgrade() -> None:
    """Remove eingangszitat column."""
    op.drop_column("chars_i18n", "eingangszitat")
