import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class GameSave(Base):
    __tablename__ = "game_saves"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slot: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    game_state: Mapped[dict] = mapped_column(JSONB, nullable=False)
    partei: Mapped[str | None] = mapped_column(Text, nullable=True)
    monat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wahlprognose: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    complexity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_meta: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="saves")
