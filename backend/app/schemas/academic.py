from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class ChapterBase(BaseModel):
    chapter_name: str
    subject_id: int

class ChapterCreate(ChapterBase):
    pass

class ChapterOut(ChapterBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


class SubjectBase(BaseModel):
    subject_name: str
    class_id: int

class SubjectCreate(SubjectBase):
    pass

class SubjectOut(SubjectBase):
    id: int
    created_at: datetime
    chapters: Optional[List[ChapterOut]] = []
    class Config:
        from_attributes = True


class ClassBase(BaseModel):
    class_name: str
    board_id: int

class ClassCreate(ClassBase):
    pass

class ClassOut(ClassBase):
    id: int
    created_at: datetime
    subjects: Optional[List[SubjectOut]] = []
    class Config:
        from_attributes = True


class BoardBase(BaseModel):
    board_name: str

class BoardCreate(BoardBase):
    pass

class BoardOut(BoardBase):
    id: int
    created_at: datetime
    classes: Optional[List[ClassOut]] = []
    class Config:
        from_attributes = True
