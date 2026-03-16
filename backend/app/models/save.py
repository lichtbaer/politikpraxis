import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class GameSave(Base):
    __tablename__ = "game_saves"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[dict] = mapped_column(JSONB, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    approval: Mapped[float] = mapped_column(Float, nullable=False, default=52.0)
    scenario_id: Mapped[str] = mapped_column(String(100), nullable=False, default="standard")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="saves")
