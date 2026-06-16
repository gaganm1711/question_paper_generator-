from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database.connection import get_db
from backend.app.models.question import Question
from backend.app.models.academic import Chapter
from backend.app.schemas.question import QuestionCreate, QuestionOut, QuestionSearchQuery
from backend.app.services.rag_service import rag_service
from backend.app.services.ocr_service import ocr_service
from backend.app.utils.seeder import seed_questions
from backend.app.utils.security import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/questions", tags=["Questions Bank"])

@router.get("/", response_model=List[QuestionOut])
def list_questions(
    subject_id: Optional[int] = None, 
    chapter_id: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Question)
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if chapter_id:
        query = query.filter(Question.chapter_id == chapter_id)
    return query.order_by(Question.created_at.desc()).all()

@router.post("/", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(
    q_in: QuestionCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return rag_service.add_question(
        db=db,
        question_text=q_in.question_text,
        answer_text=q_in.answer_text,
        marks=q_in.marks,
        difficulty=q_in.difficulty,
        question_type=q_in.question_type,
        bloom_level=q_in.bloom_level,
        language=q_in.language,
        board_id=q_in.board_id,
        class_id=q_in.class_id,
        subject_id=q_in.subject_id,
        chapter_id=q_in.chapter_id
    )

@router.post("/search")
def search_semantic_questions(
    search_req: QuestionSearchQuery, 
    db: Session = Depends(get_db)
):
    """Semantic search against the question bank."""
    results = rag_service.retrieve_semantic_questions(
        db=db,
        query=search_req.query,
        subject_id=search_req.subject_id,
        chapter_ids=search_req.chapter_ids,
        limit=search_req.limit
    )
    
    # Format return list for frontend
    formatted = []
    for res in results:
        q = res["question"]
        formatted.append({
            "id": q.id,
            "question_text": q.question_text,
            "answer_text": q.answer_text,
            "marks": q.marks,
            "difficulty": q.difficulty,
            "question_type": q.question_type,
            "chapter_name": q.chapter.chapter_name if q.chapter else None,
            "similarity": res["similarity"]
        })
    return formatted

@router.post("/seed")
def trigger_seeder(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Seed the database with high-quality default questions."""
    try:
        seed_questions(db)
        return {"status": "success", "message": "Database successfully seeded with Maharashtra Board Class 10 Science questions."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

@router.post("/upload-ocr")
async def upload_ocr_questions(
    file: UploadFile = File(...),
    board_id: int = Form(...),
    class_id: int = Form(...),
    subject_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extracts questions from a PDF/Image, runs OCR, runs AI parsing, and seeds them into the database."""
    contents = await file.read()
    
    # 1. Extract raw text from PDF
    raw_text = ocr_service.extract_text_from_pdf(contents)
    
    # 2. If direct extraction returns nothing, try pytesseract image OCR
    if not raw_text.strip():
        raw_text = ocr_service.run_image_ocr(contents)
        
    if not raw_text.strip():
        raise HTTPException(
            status_code=400, 
            detail="Failed to extract any text from the uploaded file. Please make sure it is a valid text PDF or clean image."
        )

    # 3. Retrieve chapters for mapping
    chapters = db.query(Chapter).filter(Chapter.subject_id == subject_id).all()
    chapters_list = [ch.chapter_name for ch in chapters]
    chapters_map = {ch.chapter_name: ch.id for ch in chapters}
    
    if not chapters_list:
        raise HTTPException(
            status_code=400,
            detail="No chapters found for this subject. Please seed chapters before uploading question banks."
        )

    # 4. Parse raw text into structured question JSON list using Gemini
    parsed_questions = ocr_service.parse_questions_with_ai(raw_text, chapters_list)
    
    if not parsed_questions:
        raise HTTPException(
            status_code=500,
            detail="AI question parsing failed. Could not format the document into questions."
        )

    # 5. Insert questions into the database
    added_questions = []
    for pq in parsed_questions:
        ch_name = pq.get("chapter_name")
        ch_id = chapters_map.get(ch_name) if ch_name in chapters_map else None
        
        # If no direct match, check sub-strings
        if not ch_id and ch_name:
            for name, cid in chapters_map.items():
                if name.lower() in ch_name.lower() or ch_name.lower() in name.lower():
                    ch_id = cid
                    break
                    
        # Fallback to first chapter if none matches
        if not ch_id and chapters:
            ch_id = chapters[0].id

        q_db = rag_service.add_question(
            db=db,
            question_text=pq.get("question_text"),
            answer_text=pq.get("answer_text", "Answer to be updated."),
            marks=pq.get("marks", 1),
            difficulty=pq.get("difficulty", "medium").lower(),
            question_type=pq.get("question_type", "Short Answer"),
            bloom_level=pq.get("bloom_level", "understanding"),
            language="English",
            board_id=board_id,
            class_id=class_id,
            subject_id=subject_id,
            chapter_id=ch_id
        )
        added_questions.append(q_db)

    return {
        "status": "success",
        "questions_count": len(added_questions),
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "marks": q.marks,
                "difficulty": q.difficulty,
                "question_type": q.question_type,
                "chapter_name": q.chapter.chapter_name if q.chapter else None
            } for q in added_questions
        ]
    }
