from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class PaperGenerateRequest(BaseModel):
    board_id: int
    class_id: int
    subject_id: int
    chapter_ids: List[int]
    total_marks: Optional[int] = 40
    question_breakdown: Optional[Dict[str, int]] = None # e.g. {"1": 5, "2": 4, "4": 2}
    easy_percent: Optional[int] = 40
    medium_percent: Optional[int] = 40
    hard_percent: Optional[int] = 20
    language: Optional[str] = "English"
    num_sets: Optional[int] = 1
    school_name: Optional[str] = "Maharashtra State Board School"
    time_allowed_minutes: Optional[int] = 120
    num_diagram_questions: Optional[int] = 0
    date: Optional[str] = "29/12/24"
    instructions: Optional[List[str]] = None
    constants: Optional[List[str]] = None

class PaperOut(BaseModel):
    id: str
    paper_name: str
    paper_json: Dict[str, Any]
    pdf_url: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
