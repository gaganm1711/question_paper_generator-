from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.database.connection import get_db
from backend.app.models.academic import Board, Class, Subject, Chapter
from backend.app.schemas.academic import (
    BoardCreate, BoardOut, ClassCreate, ClassOut, 
    SubjectCreate, SubjectOut, ChapterCreate, ChapterOut
)
from backend.app.utils.security import get_current_user, get_current_admin
from backend.app.models.user import User

router = APIRouter(prefix="/academic", tags=["Academic Metadata"])

# --- GET ENDPOINTS ---

@router.get("/boards", response_model=List[BoardOut])
def get_boards(db: Session = Depends(get_db)):
    boards = db.query(Board).all()
    # Auto-seed board if database is empty
    if not boards:
        default_board = Board(board_name="Maharashtra State Board")
        db.add(default_board)
        db.commit()
        db.refresh(default_board)
        boards = [default_board]
    return boards

@router.get("/classes", response_model=List[ClassOut])
def get_classes(board_id: int, db: Session = Depends(get_db)):
    classes = db.query(Class).filter(Class.board_id == board_id).all()
    # Auto-seed class 10 if board exists and class list is empty
    if not classes:
        board = db.query(Board).filter(Board.id == board_id).first()
        if board and board.board_name == "Maharashtra State Board":
            c10 = Class(class_name="Class 10", board_id=board_id)
            db.add(c10)
            db.commit()
            db.refresh(c10)
            classes = [c10]
    return classes

@router.get("/subjects", response_model=List[SubjectOut])
def get_subjects(class_id: int, db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.class_id == class_id).all()
    # Auto-seed Science & Technology if class is Class 10 and empty
    if not subjects:
        classroom = db.query(Class).filter(Class.id == class_id).first()
        if classroom and classroom.class_name == "Class 10":
            s10 = Subject(subject_name="Science and Technology", class_id=class_id)
            db.add(s10)
            db.commit()
            db.refresh(s10)
            subjects = [s10]
    return subjects

@router.get("/chapters", response_model=List[ChapterOut])
def get_chapters(subject_id: int, db: Session = Depends(get_db)):
    chapters = db.query(Chapter).filter(Chapter.subject_id == subject_id).all()
    # Auto-seed default Science chapters if empty
    if not chapters:
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if subject and subject.subject_name == "Science and Technology":
            chapter_names = ["Gravitation", "Periodic Classification of Elements", "Chemical Reactions and Equations", "Effects of Electric Current", "Refraction of Light"]
            seeded_chapters = []
            for ch_name in chapter_names:
                ch = Chapter(chapter_name=ch_name, subject_id=subject_id)
                db.add(ch)
                seeded_chapters.append(ch)
            db.commit()
            for ch in seeded_chapters:
                db.refresh(ch)
            chapters = seeded_chapters
    return chapters


# --- POST ENDPOINTS (ADMIN PROTECTED) ---

@router.post("/boards", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
def create_board(board_in: BoardCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    existing = db.query(Board).filter(Board.board_name == board_in.board_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Board already exists")
    board = Board(board_name=board_in.board_name)
    db.add(board)
    db.commit()
    db.refresh(board)
    return board

@router.post("/classes", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(class_in: ClassCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    existing = db.query(Class).filter(Class.class_name == class_in.class_name, Class.board_id == class_in.board_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Class already exists for this board")
    classroom = Class(class_name=class_in.class_name, board_id=class_in.board_id)
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(subject_in: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    existing = db.query(Subject).filter(Subject.subject_name == subject_in.subject_name, Subject.class_id == subject_in.class_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject already exists for this class")
    subject = Subject(subject_name=subject_in.subject_name, class_id=subject_in.class_id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.post("/chapters", response_model=ChapterOut, status_code=status.HTTP_201_CREATED)
def create_chapter(chapter_in: ChapterCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    existing = db.query(Chapter).filter(Chapter.chapter_name == chapter_in.chapter_name, Chapter.subject_id == chapter_in.subject_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Chapter already exists for this subject")
    chapter = Chapter(chapter_name=chapter_in.chapter_name, subject_id=chapter_in.subject_id)
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter
