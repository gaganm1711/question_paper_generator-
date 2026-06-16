import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.database.connection import IS_SQLITE
from backend.app.models.question import Question
from backend.app.services.embeddings_service import embeddings_service

class RAGService:
    def add_question(
        self, 
        db: Session, 
        question_text: str, 
        answer_text: str, 
        marks: int, 
        difficulty: str, 
        question_type: str, 
        bloom_level: str = "understanding", 
        language: str = "English", 
        board_id: int = None, 
        class_id: int = None, 
        subject_id: int = None, 
        chapter_id: int = None
    ) -> Question:
        """Saves a question to the database and generates its vector embedding."""
        embedding = embeddings_service.generate_embedding(question_text)
        
        db_question = Question(
            board_id=board_id,
            class_id=class_id,
            subject_id=subject_id,
            chapter_id=chapter_id,
            question_text=question_text,
            answer_text=answer_text,
            marks=marks,
            difficulty=difficulty.lower(),
            question_type=question_type,
            bloom_level=bloom_level,
            language=language,
            embedding=embedding
        )
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        return db_question

    def retrieve_semantic_questions(
        self, 
        db: Session, 
        query: str, 
        subject_id: int, 
        chapter_ids: List[int] = None, 
        limit: int = 10,
        language: str = "English"
    ) -> List[Dict[str, Any]]:
        """Queries the database for questions semantically matching the prompt query."""
        query_vector = embeddings_service.generate_embedding(query)
        
        # Build filters
        filters = [
            Question.subject_id == subject_id,
            Question.language == language
        ]
        if chapter_ids:
            filters.append(Question.chapter_id.in_(chapter_ids))
            
        if IS_SQLITE:
            # Python cosine similarity fallback for SQLite
            questions = db.query(Question).filter(*filters).all()
            scored_questions = []
            
            for q in questions:
                if q.embedding is None:
                    continue
                # Calculate cosine similarity
                q_vec = np.array(q.embedding)
                ref_vec = np.array(query_vector)
                
                dot = np.dot(q_vec, ref_vec)
                norm_q = np.linalg.norm(q_vec)
                norm_ref = np.linalg.norm(ref_vec)
                
                similarity = float(dot / (norm_q * norm_ref)) if norm_q > 0 and norm_ref > 0 else 0.0
                scored_questions.append((q, similarity))
                
            # Sort by similarity descending
            scored_questions.sort(key=lambda x: x[1], reverse=True)
            results = []
            for q, score in scored_questions[:limit]:
                results.append({
                    "question": q,
                    "similarity": score
                })
            return results
        else:
            # PGVector Cosine Distance (<=> operator is cosine distance, so 1 - (<=>) is cosine similarity)
            # Use raw query or pgvector features
            chapter_filter_clause = ""
            params = {
                "subject_id": subject_id,
                "language": language,
                "query_vector": str(query_vector),
                "limit": limit
            }
            if chapter_ids:
                chapter_filter_clause = "AND chapter_id IN :chapter_ids"
                params["chapter_ids"] = tuple(chapter_ids)
                
            query_str = f"""
                SELECT id, question_text, answer_text, marks, difficulty, question_type, bloom_level, chapter_id,
                       (1 - (embedding <=> CAST(:query_vector AS vector))) AS similarity
                FROM questions
                WHERE subject_id = :subject_id 
                  AND language = :language
                  {chapter_filter_clause}
                ORDER BY embedding <=> CAST(:query_vector AS vector)
                LIMIT :limit
            """
            
            raw_results = db.execute(text(query_str), params).fetchall()
            
            results = []
            for row in raw_results:
                # Mock a Question object or construct result dict
                # To keep it consistent, fetch Question objects by ID
                q_obj = db.query(Question).filter(Question.id == row[0]).first()
                if q_obj:
                    results.append({
                        "question": q_obj,
                        "similarity": float(row[8])
                    })
            return results

    def retrieve_questions_by_metadata(
        self,
        db: Session,
        subject_id: int,
        chapter_ids: List[int],
        language: str = "English"
    ) -> List[Question]:
        """Retrieves questions filtering solely by academic metadata (for seeder validation / standard filters)."""
        filters = [
            Question.subject_id == subject_id,
            Question.language == language
        ]
        if chapter_ids:
            filters.append(Question.chapter_id.in_(chapter_ids))
            
        return db.query(Question).filter(*filters).all()

rag_service = RAGService()
