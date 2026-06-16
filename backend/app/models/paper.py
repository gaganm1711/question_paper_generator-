from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database.connection import Base

class GeneratedPaper(Base):
    __tablename__ = "generated_papers"

    id = Column(String(100), primary_key=True, index=True)
    paper_name = Column(String(255), nullable=False)
    paper_json = Column(JSON, nullable=False) # Stores sections, questions, and model answers
    pdf_url = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User")
