from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class QuestionBase(BaseModel):
    question_text: str
    answer_text: str
    marks: int
    difficulty: str  # 'easy', 'medium', 'hard'
    question_type: str  # 'MCQ', 'Fill in the blanks', 'Short Answer', 'Long Answer', 'HOTS', etc.
    bloom_level: Optional[str] = "understanding"
    language: Optional[str] = "English"
    board_id: Optional[int] = None
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    chapter_id: Optional[int] = None

class QuestionCreate(QuestionBase):
    pass

class QuestionOut(QuestionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class QuestionSearchQuery(BaseModel):
    query: str
    subject_id: int
    chapter_ids: Optional[List[int]] = None
    limit: Optional[int] = 5
