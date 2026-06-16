from sqlalchemy import Column, Integer, String, TEXT, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database.connection import Base, EmbeddingType

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="SET NULL"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True)
    
    question_text = Column(TEXT, nullable=False)
    answer_text = Column(TEXT, nullable=False)
    marks = Column(Integer, nullable=False)
    difficulty = Column(String(50), nullable=False) # 'easy', 'medium', 'hard'
    question_type = Column(String(100), nullable=False) # 'MCQ', 'Short Answer', etc.
    bloom_level = Column(String(50), default="understanding")
    language = Column(String(50), default="English") # 'English', 'Marathi'
    
    embedding = Column(EmbeddingType, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    board = relationship("Board")
    classroom = relationship("Class")
    subject = relationship("Subject")
    chapter = relationship("Chapter", back_populates="questions")
