# AI-Powered Maharashtra State Board Question Paper Generator — API & Platform Documentation

This documentation provides details regarding the architecture, RAG pipelines, API endpoints, local configurations, and deployment strategies.

---

## Technical Stack & Architecture

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand, Axios, Lucide React, Framer Motion.
- **Backend**: FastAPI (Python 3.10+), SQLAlchemy 2.0, Pydantic v2, PyPDF, cosine-similarity calculators.
- **Database**: PostgreSQL with `pgvector` extension (Neon PostgreSQL Free Tier). Automatic SQLite fallback configured for local offline testing.
- **AI & RAG Engine**: Google Gemini Flash API (`gemini-1.5-flash`) + SentenceTransformers (`all-MiniLM-L6-v2` 384d local embeddings).
- **PDF Renderer**: Node.js + Headless Puppeteer print-to-PDF engine.

---

## Directory Structure

```
d:\Question Paper Generator/
├── backend/                  # FastAPI Backend application
│   ├── app/
│   │   ├── config/           # Pydantic Settings
│   │   ├── database/         # Database connection pools & sqlite compatibility 
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routes/           # REST controllers (auth, academic, questions, papers)
│   │   ├── services/         # Gemini API, PDF rendering, OCR, and pgvector RAG services
│   │   └── utils/            # JWT helpers and AI Seeder pipeline
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Backend environment variables
├── frontend/                 # Next.js 15 App Router Frontend
│   ├── src/
│   │   ├── app/              # Dashboard pages (Landing, Login, Register, Generator, Preview, Admin)
│   │   ├── components/       # ClientWrapper, layout elements, sidebar, shimmers
│   │   ├── services/         # Axios api interceptor
│   │   └── store/            # Zustand global stores (useAuthStore, usePaperStore)
│   ├── .env.local            # Frontend environment variables
│   └── package.json          # Node dependencies
├── database/
│   └── init.sql              # Database DDL initialization script
├── pdf/
│   └── render_pdf.js         # Node.js Puppeteer PDF printing script
└── docs/
    └── README.md             # Platform Documentation (this file)
```

---

## API Documentation

The REST APIs are hosted by default at `http://localhost:8080/api` with interactive Swagger UI documentation available at `http://localhost:8080/docs`.

### Authentication
- `POST /api/auth/register`: Create a new teacher or admin account.
- `POST /api/auth/login`: Authenticate and receive a JWT Bearer token.

### Academic Metadata
- `GET /api/academic/boards`: List educational boards (seeding defaults).
- `GET /api/academic/classes?board_id=X`: Get classes mapped to a board.
- `GET /api/academic/subjects?class_id=X`: Get subjects mapped to a class.
- `GET /api/academic/chapters?subject_id=X`: Get syllabus chapters mapped to a subject.

### Question Bank & OCR
- `POST /api/questions/`: Add a single question (automatically encodes 384d vector embedding).
- `POST /api/questions/search`: Semantic vector search using cosine distance filtering by chapters.
- `POST /api/questions/seed`: Seed database with 15+ rich Maharashtra Board Class 10 Science questions.
- `POST /api/questions/upload-ocr`: Upload paper PDF/Image, extract text, call Gemini to parse and categorise, and seed questions automatically.

### Question Paper Generator
- `POST /api/papers/`: Submit generation constraints. Retrieves RAG context, calls Gemini Flash, formats and balances difficulty (e.g., 40% easy, 40% medium, 20% hard), randomizes options, rephrases items, and creates Sets A/B/C/D.
- `GET /api/papers/`: List generated papers history.
- `GET /api/papers/{id}`: Fetch detailed paper JSON.
- `GET /api/papers/{id}/pdf?set_char=A&include_answers=false`: Return the compiled PDF stream rendered via Puppeteer.

---

## RAG & Gemini Prompt Pipeline

1. **Embedding**: Questions are cleaned and passed to SentenceTransformers (`all-MiniLM-L6-v2`) which outputs a float array vector of size 384.
2. **Indexing**: stored in PostgreSQL using the pgvector `VECTOR(384)` format with an HNSW/IVFFlat index.
3. **Retrieval**: When a paper is requested, the backend queries the database using `1 - (embedding <=> query_vector)` to pull relevant syllabus questions as context.
4. **LLM Synthesis**: The context questions, marks weightage, difficulty quotas, and sets requirements are compiled into a structured system prompt for `gemini-1.5-flash`.
5. **Sets Shuffling**: Gemini randomizes question positions, reorders MCQ options, and rephrases short/long answers to prevent copying while retaining identical mark mappings.
6. **Answer Keys**: Gemini generates pointwise evaluation rubrics and model answers for every set.

---

## Setup & Running Locally

### 1. Database Setup
Ensure PostgreSQL is running and the `pgvector` extension is active:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
If PostgreSQL is not installed, the application will fallback to a local SQLite database (`qpg.db`) automatically and compute vector search mathematically in Python.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Update `.env` with your `GEMINI_API_KEY` and `DATABASE_URL`.
4. Launch uvicorn:
   ```bash
   python app/main.py
   ```

### 3. Frontend Setup
1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Navigate to the pdf service directory and install Puppeteer:
   ```bash
   cd ../pdf
   npm install puppeteer
   ```
3. Start the Next.js development server:
   ```bash
   cd ../frontend
   npm run dev
   ```
4. Access the web application at `http://localhost:3005`.

---

## Production Deployment Guides

### Frontend (Vercel)
- Bind the repository on Vercel.
- Configure Environment variables:
  - `NEXT_PUBLIC_API_URL` → URL of your deployed Render backend (e.g. `https://qpg-backend.onrender.com`).
- Click Deploy.

### Database (Neon PostgreSQL)
- Create a free tier PostgreSQL database on Neon.
- The `pgvector` extension is enabled by default. Run `database/init.sql` in the SQL Console to setup tables.

### Backend (Render)
- Deploy as a **Web Service** on Render.
- Environment variables:
  - `DATABASE_URL` → Neon connection string.
  - `GEMINI_API_KEY` → Google Gemini API Key.
  - `JWT_SECRET` → A secure secret key string.
- Build command: `pip install -r requirements.txt && npm install --prefix ../pdf puppeteer` (to ensure Puppeteer is installed in the workspace for PDF rendering).
- Start command: `python app/main.py`
