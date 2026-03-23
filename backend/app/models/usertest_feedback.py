import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class UserTestFeedback(Base):
    __tablename__ = "usertest_feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_id: Mapped[str] = mapped_column(Text(), nullable=False, index=True)
    game_stat_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("game_stats.id", ondelete="SET NULL"),
        nullable=True,
    )
    kontext: Mapped[str] = mapped_column(
        Text(), nullable=False
    )  # "header" | "spielende"

    bewertung_gesamt: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    verstaendlichkeit: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    fehler_gemeldet: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="false"
    )
    fehler_beschreibung: Mapped[str | None] = mapped_column(Text(), nullable=True)
    positives: Mapped[str | None] = mapped_column(Text(), nullable=True)
    verbesserungen: Mapped[str | None] = mapped_column(Text(), nullable=True)
    sonstiges: Mapped[str | None] = mapped_column(Text(), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
