import os
import re
import subprocess
import tempfile
from typing import Dict, Any
from backend.app.database.connection import IS_SQLITE

class PDFService:
    def render_single_copy(self, paper_data: Dict[str, Any], selected_set: str = "A", include_answers: bool = False) -> str:
        """Renders a single A5 portrait copy of the question paper or answer key."""
        school_name = paper_data.get("school_name", "Maharashtra State Board School")
        class_name = paper_data.get("class_name", "Class 10")
        
        # Clean class name (e.g. "Class 10" -> "10th", "Class 8" -> "8th")
        if "10" in class_name:
            class_name = "10th"
        elif "9" in class_name:
            class_name = "9th"
        elif "8" in class_name:
            class_name = "8th"
        elif "11" in class_name:
            class_name = "11th"
        elif "12" in class_name:
            class_name = "12th"
            
        subject = paper_data.get("subject", "Science")
        # Clean subject name (e.g. "Science and Technology" -> "Science")
        if "Science" in subject:
            subject = "Science"
        elif "Math" in subject:
            subject = "Maths"
            
        total_marks = paper_data.get("total_marks", 20)
        time_allowed = paper_data.get("time_allowed_minutes", 60)
        
        # Format Time Allowed
        if time_allowed >= 60:
            hrs = time_allowed // 60
            mins = time_allowed % 60
            if mins == 0:
                time_str = f"{hrs}:00 hr"
            else:
                time_str = f"{hrs}:{mins:02d} hr"
        else:
            time_str = f"{time_allowed} Min"
            
        # Format Date
        date_str = paper_data.get("date")
        if not date_str:
            import datetime
            now = datetime.datetime.now()
            date_str = now.strftime("%d/%m/%y")
        
        # Format Topic
        topic_str = paper_data.get("topic")
        if not topic_str:
            paper_name = paper_data.get("paper_name", "")
            match = re.search(r'\((.*?)\)', paper_name)
            if match:
                topic_str = match.group(1)
            else:
                topic_str = subject
            
        # Get set data
        set_data = paper_data.get("sets", {}).get(selected_set, {})
        sections = set_data.get("sections", [])
        
        # Answer key data
        answers_list = paper_data.get("answer_key", {}).get(selected_set, [])
        answers_map = {ans["id"]: ans for ans in answers_list}

        title_suffix = " (Answer Key)" if include_answers else ""

        html = f"""
        <div class="header-box">
            <div class="school-name">{school_name}{title_suffix}</div>
            <div class="meta-row">
                <span><strong>Sub:-</strong> {subject}</span>
                <span><strong>Class:-</strong> {class_name}</span>
            </div>
            <div class="meta-row">
                <span><strong>Date:-</strong> {date_str}</span>
                <span><strong>Marks:-</strong> {total_marks}</span>
            </div>
            <div class="meta-row font-small">
                <span><strong>Topic:-</strong> {topic_str}</span>
                <span><strong>Time:-</strong> {time_str}</span>
            </div>
        </div>
        """

        # Instructions & Constants Block
        instructions = paper_data.get("instructions", [])
        constants = paper_data.get("constants", [])
        if instructions or constants:
            html += '<div class="instructions-constants-box">'
            if instructions:
                html += '<div class="instructions-title">Instructions to the Candidates:</div>'
                html += '<ol class="instructions-list">'
                for inst in instructions:
                    cleaned_inst = re.sub(r'^\s*\d+[\.\)]\s*', '', inst)
                    html += f'<li>{cleaned_inst}</li>'
                html += '</ol>'
            if constants:
                if instructions:
                    html += '<div style="margin-top: 6px;"></div>'
                html += '<div class="constants-title">Important Constants / Formulae:</div>'
                html += '<ul class="constants-list">'
                for const in constants:
                    html += f'<li>{const}</li>'
                html += '</ul>'
            html += '</div>'
        
        # Iterate over sections
        for idx, section in enumerate(sections):
            questions = section.get("questions", [])
            if not questions:
                continue
                
            sec_idx = idx + 1
            m = questions[0].get("marks", 1)
            n = len(questions)
            
            # Custom Section Title mapping to match Maharashtra coaching paper format
            choice_str = ""
            sec_marks = n * m
            
            if m == 1:
                title = "Answer in One words:-"
            elif m == 2:
                title = "Answer in very short :-"
                if n >= 3:
                    choice_str = " (Any Two)"
                    sec_marks = 4
            elif m == 3:
                title = "Answer in short:-"
                if n >= 3:
                    choice_str = " (Any Two)"
                    sec_marks = 6
            elif m == 4:
                title = "Answer in long:-"
                if n >= 2:
                    choice_str = " (Any One)"
                    sec_marks = 4
            elif m == 5:
                title = "Answer in long:-"
                if n >= 2:
                    choice_str = " (Any One)"
                    sec_marks = 5
            else:
                title = "Answer the following:-"
                
            html += f"""
            <div class="section-container">
                <div class="section-header">
                    <span class="section-title"><strong>Q.{sec_idx}.</strong> {title}{choice_str}</span>
                    <span class="section-marks">[{sec_marks}]</span>
                </div>
            """
            
            # Roman numerals sub-numbering: i, ii, iii, iv, v, vi
            sub_labels = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"]
            
            for q_idx, q in enumerate(questions):
                sub_label = sub_labels[q_idx % len(sub_labels)]
                q_text = q.get("question_text", "")
                q_options = q.get("options", [])
                q_id = q.get("id", "")
                
                html += f"""
                <div class="question-container">
                    <div class="question-content">
                        <strong>{sub_label})</strong> {q_text}
                """
                
                # Render options if MCQ
                if q_options:
                    labels = ["a", "b", "c", "d"]
                    html += '<div class="options-grid">'
                    for opt_idx, opt in enumerate(q_options):
                        cleaned_opt = re.sub(r'^[a-d]\)\s*', '', opt)
                        label = labels[opt_idx % 4]
                        html += f'<div>{label}) {cleaned_opt}</div>'
                    html += '</div>'
                    
                # Render model answer if requested
                if include_answers and q_id in answers_map:
                    ans_data = answers_map[q_id]
                    points_str = "".join([f"<li>{pt}</li>" for pt in ans_data.get("key_points", [])])
                    points_list = f"<ul>{points_str}</ul>" if points_str else ""
                    html += f"""
                    <div class="answer-box">
                        <div class="answer-title">Model Answer:</div>
                        <div>{ans_data.get('model_answer', '')}</div>
                        {f'<div class="answer-title" style="margin-top:5px;">Key Evaluation Points:</div>{points_list}' if points_list else ''}
                    </div>
                    """
                    
                html += """
                    </div>
                </div>
                """
                
            html += "</div>" # close section-container
            
        return html

    def generate_html(self, paper_data: Dict[str, Any], selected_set: str = "A", include_answers: bool = False) -> str:
        """Generates a styled HTML string for the question paper or answer key."""
        subject = paper_data.get("subject", "Science")
        selected_set = selected_set
        
        title = f"{subject} - Set {selected_set}"
        if include_answers:
            title += " (Answer Key)"

        # CSS styling for board paper format in landscape
        css = """
        @page {
            size: A4 landscape;
            margin: 0;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
        }
        .page-container {
            display: flex;
            width: 297mm;
            min-height: 210mm;
            box-sizing: border-box;
            background: #fff;
        }
        .paper-copy {
            width: 50%;
            box-sizing: border-box;
            padding: 12mm 15mm;
            min-height: 210mm;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        .left-copy {
            border-right: 1.5px dashed #000;
        }
        .right-copy {
            border-left: 1.5px dashed transparent;
        }
        .header-box {
            border: 1.5px solid #000;
            padding: 8px 12px;
            margin-bottom: 20px;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .instructions-constants-box {
            border: 1.5px solid #000;
            padding: 8px 12px;
            margin-bottom: 20px;
            font-size: 9.5pt;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .instructions-title, .constants-title {
            font-weight: bold;
            margin-bottom: 4px;
        }
        .instructions-list, .constants-list {
            margin: 0;
            padding-left: 15px;
        }
        .instructions-list li, .constants-list li {
            margin-bottom: 2px;
        }
        .school-name {
            font-size: 15pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 11pt;
            margin-bottom: 3px;
        }
        .meta-row:last-child {
            margin-bottom: 0;
        }
        .section-container {
            margin-bottom: 20px;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 12px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 3px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .question-container {
            margin-bottom: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .question-content {
            font-size: 11pt;
            line-height: 1.4;
        }
        .options-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 5px;
            margin-left: 20px;
            font-size: 10.5pt;
        }
        .options-grid > div {
            display: inline-block;
            white-space: nowrap;
        }
        .answer-box {
            background-color: #f5f5f5;
            border-left: 3px solid #333;
            margin-top: 6px;
            margin-left: 20px;
            padding: 6px 10px;
            font-size: 10pt;
        }
        .answer-title {
            font-weight: bold;
            margin-bottom: 2px;
        }
        .watermark {
            position: fixed;
            top: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 45pt;
            color: rgba(200, 200, 200, 0.08);
            font-weight: bold;
            z-index: -1000;
            pointer-events: none;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        .left-watermark {
            left: 25%;
        }
        .right-watermark {
            left: 75%;
        }
        """

        single_copy_html = self.render_single_copy(paper_data, selected_set, include_answers)

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title}</title>
            <style>
                {css}
            </style>
        </head>
        <body>
            <div class="watermark left-watermark">{selected_set} - {"ANSWERS" if include_answers else "CONFIDENTIAL"}</div>
            <div class="watermark right-watermark">{selected_set} - {"ANSWERS" if include_answers else "CONFIDENTIAL"}</div>
            
            <div class="page-container">
                <div class="paper-copy left-copy">
                    {single_copy_html}
                </div>
                <div class="paper-copy right-copy">
                    {single_copy_html}
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    def render_pdf(self, html_content: str) -> bytes:
        """Invokes Puppeteer script to render the HTML string to a PDF buffer."""
        # Create temp files
        with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as html_file:
            html_file.write(html_content.encode("utf-8"))
            html_path = html_file.name

        pdf_path = html_path.replace(".html", ".pdf")
        
        try:
            # Find the path of render_pdf.js relative to the project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
            puppeteer_script = os.path.join(project_root, "pdf", "render_pdf.js")

            # Execute Node.js script
            command = ["node", puppeteer_script, html_path, pdf_path]
            print(f"Executing command: {' '.join(command)}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            print("Puppeteer output:", result.stdout)

            # Read generated PDF bytes
            with open(pdf_path, "rb") as pdf_file:
                pdf_bytes = pdf_file.read()
                
            return pdf_bytes
            
        except Exception as e:
            print(f"Error executing Puppeteer: {e}")
            raise e
        finally:
            # Clean up temp files
            if os.path.exists(html_path):
                os.remove(html_path)
            if os.path.exists(pdf_path):
                os.remove(pdf_path)

pdf_service = PDFService()


pdf_service = PDFService()
