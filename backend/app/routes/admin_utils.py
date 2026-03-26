"""Gemeinsame Hilfsfunktionen für Admin-Routes."""

from decimal import Decimal


def to_float(v: Decimal | float | None) -> float:
    """Decimal/float/None sicher in float konvertieren."""
    return float(v) if v is not None else 0.0
