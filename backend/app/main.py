import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config.settings import settings
from backend.app.database.connection import engine, Base
from backend.app.routes import auth, academic, questions, papers

# Automatically create tables in the database (SQLite or Postgres)
# In production, alembic migrations are preferred, but this guarantees a zero-config setup.
print("Initializing database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables initialized.")

# Auto-seed academic syllabus structure & sample questions on startup
from backend.app.database.connection import SessionLocal
from backend.app.utils.seeder import seed_questions
db = SessionLocal()
try:
    print("Auto-seeding syllabus structure and questions for all subjects...")
    seed_questions(db)
    print("Syllabus structure and questions successfully seeded.")
except Exception as e:
    print(f"Error seeding database structure: {e}")
finally:
    db.close()



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
        reload=True
    )
