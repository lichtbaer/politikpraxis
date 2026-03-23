import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class GameStat(Base):
    __tablename__ = "game_stats"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    session_id: Mapped[str] = mapped_column(Text(), nullable=False, index=True)
    partei: Mapped[str] = mapped_column(Text(), nullable=False)
    complexity: Mapped[int] = mapped_column(Integer(), nullable=False)
    gewonnen: Mapped[bool] = mapped_column(Boolean(), nullable=False)
    wahlprognose: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    monate_gespielt: Mapped[int] = mapped_column(Integer(), nullable=False)

    gesetze_beschlossen: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    gesetze_gescheitert: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    koalitionsbruch: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="false"
    )
    saldo_final: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    gini_final: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    arbeitslosigkeit_final: Mapped[float | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    medienklima_final: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    skandale_gesamt: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    pk_verbraucht: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    top_politikfeld: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bewertung_gesamt: Mapped[str | None] = mapped_column(Text(), nullable=True)
    titel: Mapped[str | None] = mapped_column(Text(), nullable=True)
    opt_in_community: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="false"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user = relationship("User", back_populates="game_stats")
