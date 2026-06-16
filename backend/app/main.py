import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config.settings import settings
from backend.app.database.connection import engine, Base
from backend.app.routes import auth, academic, questions, papers

import sys
import threading
from backend.app.database.connection import SessionLocal

def init_db_and_seed():
    print("Async database initialization started...", flush=True)
    db = SessionLocal()
    try:
        if not engine.url.drivername.startswith("sqlite"):
            from sqlalchemy import text
            try:
                with engine.begin() as conn:
                    print("Enabling pgvector extension if not exists...", flush=True)
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                    print("pgvector extension check complete.", flush=True)
            except Exception as ddl_err:
                print(f"Warning: Could not auto-create vector extension: {ddl_err}", flush=True)

        print("Creating database tables...", flush=True)
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized.", flush=True)

        # Auto-seed academic syllabus structure & sample questions
        from backend.app.utils.seeder import seed_questions
        print("Auto-seeding syllabus structure and questions...", flush=True)
        seed_questions(db)
        print("Syllabus structure and questions successfully seeded.", flush=True)
    except Exception as e:
        print(f"Error initializing/seeding database: {e}", flush=True)
    finally:
        db.close()

# Start initialization in background so server can bind to port immediately
print("Launching async database initialization thread...", flush=True)
threading.Thread(target=init_db_and_seed, daemon=True).start()



app = FastAPI(
    title="AI Maharashtra State Board Question Paper Generator API",
    description="Full-stack AI RAG API to seed, parse OCR questions, search semantically, and generate printable multi-set question papers.",
    version="1.0.0"
)

# CORS Configuration
# Allow frontend domains (Localhost + Netlify & Vercel subdomains)
origins = [
    "http://localhost:3005",
    "http://127.0.0.1:3005",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.netlify\.app|https://.*\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(academic.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(papers.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Maharashtra State Board Question Paper Generator API.",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
