import io
import json
import re
from pypdf import PdfReader
from typing import List, Dict, Any
from backend.app.config.settings import settings
import google.generativeai as genai

class OCRService:
    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extracts text from PDF bytes. Direct text extraction first; returns empty if scanned."""
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error during PDF text extraction: {e}")
            return ""

    def run_image_ocr(self, file_bytes: bytes) -> str:
        """Fallback function using pytesseract for scanned documents."""
        try:
            import pytesseract
            from PIL import Image
            
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as e:
            print(f"Pytesseract OCR failed or not installed: {e}")
            return ""

    def parse_questions_with_ai(self, raw_text: str, chapters_list: List[str]) -> List[Dict[str, Any]]:
        """Sends raw text to Gemini to parse into structured question objects matched to standard syllabus chapters."""
        if not raw_text.strip():
            return []

        # Configure genai
        api_key = settings.GEMINI_API_KEY
        if api_key:
            genai.configure(api_key=api_key)
        else:
            print("Warning: GEMINI_API_KEY not set during OCR parsing.")
            return []

        prompt = f"""
You are a teacher's assistant specialized in processing curriculum documents.
Your task is to read the raw text extracted from a question paper or question bank and extract individual questions.
Map each question to the closest matching chapter from this list: {", ".join(chapters_list)}.

Here is the raw text:
{raw_text}

---
CRITICAL RULES FOR EXTRACTION:
1. Identify distinct questions, their marks, and their question type (e.g. MCQ, Short Answer, Long Answer, HOTS, Fill in the blanks).
2. If the text does not contain answers, generate a high-quality, pointwise model answer for each question.
3. Set the difficulty to 'easy', 'medium', or 'hard'.
4. Ensure the output is valid JSON matching this schema:
[
  {{
    "question_text": "...",
    "answer_text": "...",
    "marks": 2,
    "difficulty": "medium",
    "question_type": "Short Answer",
    "bloom_level": "understanding",
    "chapter_name": "..." // Must match one from the chapters list if possible
  }}
]
"""
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                generation_config={"response_mime_type": "application/json"}
            )
            response = model.generate_content(prompt)
            text_out = response.text

            # Parse out markdown JSON indicators if present
            if text_out.startswith("```"):
                text_out = re.sub(r'^```[a-zA-Z]*\n', '', text_out)
                text_out = re.sub(r'\n```$', '', text_out)

            parsed_data = json.loads(text_out)
            if isinstance(parsed_data, list):
                return parsed_data
            elif isinstance(parsed_data, dict) and "questions" in parsed_data:
                return parsed_data["questions"]
            return []
        except Exception as e:
            print(f"Error parsing raw text with Gemini: {e}")
            return []

ocr_service = OCRService()
