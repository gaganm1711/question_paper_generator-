# AI-Powered Maharashtra State Board Question Paper Generator

A production-ready full-stack platform to automatically generate Maharashtra State Board style question papers using RAG (Retrieval Augmented Generation), semantic search, pgvector, and Google Gemini Flash API.

---

## 🚀 Key Features

- **Maharashtra State Board Layout**: Generates papers exactly matching Class 10 Science formatting conventions.
- **RAG & Semantic Retrieval**: Searches for curriculum-aligned questions using local 384d vector embeddings.
- **Cheating Prevention (Sets A-D)**: Generates up to 4 shuffled sets with reordered MCQ options and rephrased short/long answers.
- **Automated Answer Key**: Creates model answers and grading rubrics for teachers.
- **OCR Import**: Automatically extracts and parses question banks from uploaded PDFs using Gemini OCR parsing.
- **A4 PDF Downloader**: Pixel-perfect printable PDFs rendered using Puppeteer.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand state management.
- **Backend**: FastAPI, SQLAlchemy, Pydantic, Cosine Distance search.
- **Database**: PostgreSQL with `pgvector` extension (with automatic SQLite fallback for offline local runs).
- **AI**: Google Gemini Flash API & SentenceTransformers.

---

## 📂 Project Structure

```
├── backend/                  # FastAPI Backend application
├── frontend/                 # Next.js 15 App Router Frontend
├── database/                 # init.sql schema
├── pdf/                      # Puppeteer PDF render script
└── docs/                     # Full API & Setup Documentation
```

For detailed setup, API schema endpoints, RAG prompts, and deployment guides, please see [Documentation](docs/README.md).

---

## ⚡ Quick Start

### 1. Setup the Backend
```bash
cd backend
pip install -r requirements.txt
# Set your GEMINI_API_KEY in backend/.env
python app/main.py
```

### 2. Setup PDF rendering
```bash
cd pdf
npm install puppeteer
```

### 3. Setup the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3005](http://localhost:3005) to view the application. Go to **Admin Panel** to seed the initial dataset!
