from sqlalchemy import BigInteger, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AdminRateLimitBucket(Base):
    """Geteilter Fixed-Window-Zähler für das Admin-Rate-Limit (#231).

    Ein Row pro Client-IP; `window_start`/`count` werden atomar per
    INSERT ... ON CONFLICT in app/services/admin_rate_limit.py fortgeschrieben,
    damit das Limit über mehrere Worker/Instanzen hinweg greift statt pro
    Prozess separat gezählt zu werden.
    """

    __tablename__ = "admin_rate_limit_bucket"

    ip: Mapped[str] = mapped_column(Text(), primary_key=True)
    window_start: Mapped[int] = mapped_column(BigInteger(), nullable=False)
    count: Mapped[int] = mapped_column(Integer(), nullable=False)
