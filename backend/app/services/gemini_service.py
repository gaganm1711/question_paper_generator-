import json
import re
import google.generativeai as genai
from typing import List, Dict, Any
from backend.app.config.settings import settings
from backend.app.models.question import Question

class GeminiService:
    def __init__(self):
        self._configured = False

    def _ensure_configured(self):
        if not self._configured:
            api_key = settings.GEMINI_API_KEY
            if api_key:
                genai.configure(api_key=api_key)
                self._configured = True
            else:
                print("Warning: GEMINI_API_KEY is not set. Gemini calls will fail.")

    def generate_question_paper(
        self,
        board_name: str,
        class_name: str,
        subject_name: str,
        chapters: List[str],
        total_marks: int,
        difficulty_dist: Dict[str, int],  # e.g. {"easy": 40, "medium": 40, "hard": 20}
        language: str,  # "English", "Marathi", "Bilingual"
        num_sets: int,  # 1 to 4
        time_allowed: int,
        school_name: str,
        question_breakdown: Dict[str, int] = None,
        num_diagram_questions: int = 0
    ) -> Dict[str, Any]:
        """Generates a complete Maharashtra Board style question paper with multiple sets and answers using Gemini."""
        self._ensure_configured()

        # Build custom breakdown instruction if provided
        breakdown_instruction = ""
        if question_breakdown:
            breakdown_instruction = "\n- EXACT QUESTION COUNTS REQUIRED: " + ", ".join([
                f"Exactly {count} questions of {m}-mark(s) each" 
                for m, count in question_breakdown.items() if count > 0
            ])

        # Build prompt instructions
        prompt = f"""
You are an expert examiner for the Maharashtra State Secondary and Higher Secondary Education Board.
Generate a structured Question Paper matching the following constraints:
- Board: {board_name}
- Class: {class_name}
- Subject: {subject_name}
- Chapters Included: {", ".join(chapters)}
- Total Marks: {total_marks} marks{breakdown_instruction}
- Time Allowed: {time_allowed} minutes
- School Name: "{school_name}"
- Language: {language} (Provide translations if "Bilingual" or "Marathi")
- Target Difficulty Balance: Easy {difficulty_dist.get('easy', 40)}%, Medium {difficulty_dist.get('medium', 40)}%, Hard {difficulty_dist.get('hard', 20)}%
- Number of Sets to generate: {num_sets} (Label them Set A, Set B, etc.)
{f"- Diagram Questions: Generate exactly {num_diagram_questions} questions that require drawing neat labeled diagrams or explain diagrams. Label these clearly in the question text (e.g. 'With the help of a neat, labeled diagram, explain...')." if num_diagram_questions > 0 else ""}

---
BOARD STYLE & FORMATTING RULES:
1. Divide the paper into logical sections:
   - Section A: Objective Types (e.g., MCQs, Fill in the blanks, Find Odd One Out, Match the following) - 1 mark each.
   - Section B: Very Short / Short Answer Questions (e.g., Definitions, state laws, distinguish between) - 2 marks each.
   - Section C: Medium / Short Answer type II (e.g., Explain processes, solve numericals, give scientific reasons) - 3 marks each.
   - Section D: Long Answers / HOTS (High Order Thinking Skills) (e.g., Explain with neat diagrams, case studies) - 5 marks each.
2. Structure the marks allocation strictly: the sum of marks of all questions inside each set must equal exactly {total_marks}.
3. Difficulty ratio must be maintained closely.

---
MULTI-SET SHUFFLING & REPHRASING RULES:
If number of sets > 1 (e.g. Set A, Set B):
- All sets must test the EXACT same educational concepts, chapters, and question types.
- Shuffling: Shuffle the order of sections or questions within the sections.
- MCQ Option Shuffling: Shuffle the choices (a, b, c, d) of MCQ questions across sets.
- Rephrasing: For non-MCQ questions (Short/Long Answers), modify the wording or numbers (if numericals) slightly in Set B/C/D so that students cannot copy directly, but ensure the marking difficulty, syllabus topic, and rubric remain identical.

---
INSTRUCTIONS FOR QUESTION GENERATION:
Generate entirely original, high-quality, syllabus-compliant questions from scratch using your native knowledge of the Maharashtra State Board curriculum. Do not use external placeholders. Make sure questions are highly relevant to the specified chapters.

---
JSON OUTPUT FORMAT:
You MUST respond with a single valid JSON object. Do not include markdown code block syntax (like ```json) in your raw response, or if you do, make sure it is valid JSON. The JSON structure must be:
{{
  "paper_name": "...",
  "board": "{board_name}",
  "class_name": "{class_name}",
  "subject": "{subject_name}",
  "total_marks": {total_marks},
  "time_allowed_minutes": {time_allowed},
  "instructions": [
    "All questions are compulsory.",
    "Draw neat and labeled diagrams wherever necessary.",
    "Figures to the right indicate full marks."
  ],
  "sets": {{
    "A": {{
      "sections": [
        {{
          "section_name": "Section A",
          "section_instruction": "...",
          "questions": [
            {{
              "id": "q1",
              "question_text": "...",
              "options": ["a) ...", "b) ...", "c) ...", "d) ..."], // Include only if MCQ
              "marks": 1,
              "difficulty": "easy",
              "question_type": "MCQ",
              "chapter_name": "..."
            }}
          ]
        }}
      ]
    }}
    // Add additional sets (B, C, D) here if num_sets > 1
  }},
  "answer_key": {{
    "A": [
      {{
        "id": "q1",
        "model_answer": "...",
        "key_points": ["...", "..."],
        "marks": 1
      }}
    ]
    // Add answer keys for sets B, C, D here if num_sets > 1
  }}
}}
"""

        # Generate using Gemini
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                generation_config={"response_mime_type": "application/json"}
            )
            response = model.generate_content(prompt, request_options={"timeout": 10.0})
            text_out = response.text
            
            # Parse output
            # Strip markdown block if present
            if text_out.startswith("```"):
                text_out = re.sub(r'^```[a-zA-Z]*\n', '', text_out)
                text_out = re.sub(r'\n```$', '', text_out)
                
            paper_data = json.loads(text_out)
            return paper_data
            
        except Exception as e:
            print(f"Error calling Gemini or parsing response: {e}")
            # Fallback mock question paper generation to prevent crashing the platform
            return self._generate_fallback_paper(
                board_name=board_name,
                class_name=class_name,
                subject_name=subject_name,
                chapters=chapters,
                total_marks=total_marks,
                time_allowed=time_allowed,
                school_name=school_name,
                num_sets=num_sets,
                question_breakdown=question_breakdown
            )

    def _get_subject_category(self, subject_name: str) -> str:
        s_lower = subject_name.lower()
        if "math" in s_lower or "algebra" in s_lower or "geometry" in s_lower:
            return "math"
        elif any(x in s_lower for x in ["science", "physics", "chemistry", "biology"]):
            return "science"
        elif any(x in s_lower for x in ["english", "marathi", "hindi", "sanskrit", "language"]):
            return "language"
        else:
            return "social"

    def _get_default_breakdown(self, total_marks: int) -> Dict[str, int]:
        breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        remaining = total_marks
        
        if remaining >= 10:
            count_5 = (remaining // 2) // 5
            if count_5 > 0:
                breakdown[5] = count_5
                remaining -= count_5 * 5
                
        if remaining >= 6:
            count_3 = (remaining // 2) // 3
            if count_3 > 0:
                breakdown[3] = count_3
                remaining -= count_3 * 3
                
        if remaining >= 4:
            count_2 = remaining // 2
            if count_2 > 0:
                breakdown[2] = count_2
                remaining -= count_2 * 2
                
        if remaining > 0:
            breakdown[1] = remaining
            remaining = 0
            
        return {str(k): v for k, v in breakdown.items() if v > 0}

    def _generate_fallback_paper(
        self, board_name: str, class_name: str, subject_name: str, chapters: List[str], 
        total_marks: int, time_allowed: int, school_name: str, num_sets: int,
        question_breakdown: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """Provides a dynamically generated fallback question paper if the Gemini API call fails."""
        if not chapters:
            chapters = ["General Study"]

        if not question_breakdown:
            question_breakdown = self._get_default_breakdown(total_marks)
        else:
            # Clean question breakdown to only include non-zero counts
            question_breakdown = {str(k): int(v) for k, v in question_breakdown.items() if int(v) > 0}
            if not question_breakdown:
                question_breakdown = self._get_default_breakdown(total_marks)

        category = self._get_subject_category(subject_name)

        # Build templates database
        templates = {
            "math": {
                1: [
                    {
                        "type": "MCQ",
                        "text": "For the topic {chapter}, if the equation {coef}x - {const} = 0 holds, what is the value of x?",
                        "options": ["{ans}", "{ans_plus_1}", "{ans_minus_1}", "{ans_plus_2}"],
                        "answer": "Option (a) {ans}.",
                        "key_points": ["Solve linear equation: {coef}x = {const}", "x = {const} / {coef} = {ans}"]
                    },
                    {
                        "type": "MCQ",
                        "text": "Which of the following is a correct algebraic formula or property studied in {chapter}?",
                        "options": ["(a + b)² = a² + 2ab + b²", "(a + b)² = a² + b²", "(a - b)² = a² - b²", "(a + b)(a - b) = a² + 2ab - b²"],
                        "answer": "Option (a) (a + b)² = a² + 2ab + b².",
                        "key_points": ["Standard identity verification", "Expansion of binomial square"]
                    },
                    {
                        "type": "Fill in the blanks",
                        "text": "Find the value of the algebraic expression (a + b)² - 2ab in {chapter} when a = {val1} and b = {val2}.",
                        "answer": "The simplified expression is a² + b². Substituting a = {val1} and b = {val2}, we get {val1}² + {val2}² = {ans}.",
                        "key_points": ["Simplify identity to a² + b²", "Substitute values: {val1}² + {val2}² = {ans}"]
                    }
                ],
                2: [
                    {
                        "type": "Short Answer",
                        "text": "In the chapter {chapter}, find the constant value k if the equation {coef}x + k = {val1} has a solution x = {val2}.",
                        "answer": "Substitute x = {val2} into the equation: {coef}*({val2}) + k = {val1} => {prod} + k = {val1} => k = {val1} - {prod} = {ans}.",
                        "key_points": ["Substitute x = {val2}", "Solve for k: k = {ans}"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Simplify the algebraic fraction for the topic {chapter}: ({coef}x² - {val1}x) / x, given that x is not equal to zero.",
                        "answer": "Factor out x from the numerator: x({coef}x - {val1}) / x. Cancelling x, the simplified expression is {coef}x - {val1}.",
                        "key_points": ["Factor out common term x", "Simplify expression to {coef}x - {val1}"]
                    }
                ],
                3: [
                    {
                        "type": "Reasoning",
                        "text": "Solve the simultaneous equations in {chapter} step-by-step: x + y = {val1} and x - y = {val2}.",
                        "answer": "1. Add the two equations: (x + y) + (x - y) = {val1} + {val2} => 2x = {sum_val} => x = {val_x}.\n2. Substitute x = {val_x} in x + y = {val1}: {val_x} + y = {val1} => y = {val_y}.\n3. The solution is x = {val_x}, y = {val_y}.",
                        "key_points": ["Add equations to find x = {val_x}", "Substitute x to find y = {val_y}", "Solution: ({val_x}, {val_y})"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Calculate the sum of the angles or properties studied in {chapter} for a polygon with {val1} sides.",
                        "answer": "Formula for sum of interior angles: (n - 2) * 180 degrees. Here n = {val1}.\nSum = ({val1} - 2) * 180 = {val_sub} * 180 = {ans} degrees.",
                        "key_points": ["Use formula: (n - 2) * 180", "Substitute n = {val1}", "Result = {ans} degrees"]
                    }
                ],
                4: [
                    {
                        "type": "Short Answer",
                        "text": "Solve the following word problem in {chapter}: The sum of the ages of a father and son is {val1} years. The father is {val2} years older than the son. Find their individual ages.",
                        "answer": "Let the son's age be s. Father's age is s + {val2}.\nEquation: s + (s + {val2}) = {val1} => 2s + {val2} = {val1} => 2s = {val_diff} => s = {val_son}.\nSon's age is {val_son} years, Father's age is {val_father} years.",
                        "key_points": ["Formulate equation: 2s + {val2} = {val1}", "Solve for son's age s = {val_son}", "Determine father's age = {val_father}"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Find the roots of the quadratic equation in {chapter}: x² - {val1}x + {val2} = 0 using the factorization method.",
                        "answer": "Find two numbers that multiply to {val2} and add to -{val1}. These are -{f1} and -{f2}.\nEquation becomes: (x - {f1})(x - {f2}) = 0.\nRoots are x = {f1} or x = {f2}.",
                        "key_points": ["Identify factors -{f1} and -{f2}", "Factorize expression to (x - {f1})(x - {f2})", "Roots: x = {f1}, {f2}"]
                    }
                ],
                5: [
                    {
                        "type": "Long Answer",
                        "text": "State the primary theorem or formula of {chapter}. Prove it theoretically and use it to find the missing length in a triangle with base = {val1} cm and height = {val2} cm.",
                        "answer": "Theorem statement: (detailed explanation of the theorem for {chapter}).\nProof: (theoretical proof steps).\nApplication: Area = 0.5 * base * height = 0.5 * {val1} * {val2} = {ans} cm².",
                        "key_points": ["Theorem statement & theoretical proof steps", "Formula application: Area = 0.5 * b * h", "Final answer: {ans} cm²"]
                    },
                    {
                        "type": "Long Answer",
                        "text": "Explain the graphical method of solving linear equations in {chapter}. Solve the equations 2x + y = {val1} and x + 2y = {val2} graphically and find the coordinates of their intersection point.",
                        "answer": "1. Find coordinates for 2x + y = {val1}: (0, {val1}), ({val_x1}, 0).\n2. Find coordinates for x + 2y = {val2}: (0, {val_y2}), ({val2}, 0).\n3. Plot both lines on graph paper. The lines intersect at x = {val_x}, y = {val_y}.\n4. Verification: 2({val_x}) + {val_y} = {val1} and {val_x} + 2({val_y}) = {val2}.",
                        "key_points": ["Plot coordinates for line 1 and line 2", "Locate intersection point on graph", "Intersection point is ({val_x}, {val_y})"]
                    }
                ]
            },
            "science": {
                1: [
                    {
                        "type": "MCQ",
                        "text": "What is the SI unit of the primary physical quantity measured in {chapter}?",
                        "options": ["Newton (N)", "Joule (J)", "Watt (W)", "Ampere (A)"],
                        "answer": "Option (a) Newton (N).",
                        "key_points": ["SI Unit of force/quantity in {chapter}", "Newton is the standard unit"]
                    },
                    {
                        "type": "MCQ",
                        "text": "Which of the following phenomena is a core concept under {chapter}?",
                        "options": ["Conservation of Energy", "Thermal Expansion", "Chemical Synthesis", "Electromagnetic Radiation"],
                        "answer": "Option (a) Conservation of Energy.",
                        "key_points": ["Fundamental principle of the chapter", "Energy conservation is central"]
                    },
                    {
                        "type": "Fill in the blanks",
                        "text": "True or False: The principles of {chapter} apply to both macroscopic and microscopic bodies in the universe.",
                        "answer": "True. These principles are universal and govern physical behaviors at all scales.",
                        "key_points": ["Universal applicability of {chapter}", "True statement"]
                    }
                ],
                2: [
                    {
                        "type": "Short Answer",
                        "text": "State the law or definition of the core concept in {chapter} and write its standard formula.",
                        "answer": "The law states that the physical behavior in {chapter} depends directly on the inputs and is inversely proportional to the constraints. Formula: F = k * (A / B).",
                        "key_points": ["State the law definition", "State the formula: F = k * (A / B)"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Distinguish between the two main states or forms described in {chapter}.",
                        "answer": "1. Form A represents the static state with zero velocity, whereas Form B represents the dynamic state with active motion.\n2. Form A is conservative, whereas Form B is dissipative.",
                        "key_points": ["Difference in states (static vs dynamic)", "Difference in energy properties (conservative vs dissipative)"]
                    }
                ],
                3: [
                    {
                        "type": "Reasoning",
                        "text": "Give scientific reasons: Why does the rate of reaction or phenomenon in {chapter} change under varying temperatures?",
                        "answer": "As temperature increases, the kinetic energy of particles increases. This leads to a higher frequency of effective collisions or energy transfer, thereby increasing the rate of reaction or physical phenomenon.",
                        "key_points": ["Increase in temperature increases kinetic energy", "More effective collisions or energy transfer", "Results in higher rate of reaction"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Explain the experimental setup used to demonstrate the laws of {chapter} with a simple line diagram description.",
                        "answer": "The setup consists of: 1. A source to generate the input force/stimulus, 2. A medium through which it travels, and 3. A measuring device (like a sensor) to capture the output. We record changes as medium characteristics vary.",
                        "key_points": ["List components: source, medium, measuring device", "Explain process of recording observations"]
                    }
                ],
                4: [
                    {
                        "type": "Short Answer",
                        "text": "Solve the numerical problem in {chapter}: Calculate the energy or force when mass is {val1} kg and acceleration is {val2} m/s² over a distance of {val3} meters.",
                        "answer": "1. Force = mass * acceleration = {val1} * {val2} = {val_f} N.\n2. Work done/Energy = Force * distance = {val_f} * {val3} = {ans} Joules.",
                        "key_points": ["Apply F = m * a to get {val_f} N", "Apply W = F * d to get {ans} Joules"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Describe the chemical reaction or physiological process of {chapter} with a balanced chemical/biochemical equation.",
                        "answer": "During the process, reactant molecules undergo bond breaking to form stable products, releasing/absorbing heat.\nEquation: 2A + B --(catalyst)--> A₂B + heat.",
                        "key_points": ["Explain bond breaking and formation", "State balanced equation: 2A + B -> A₂B + heat"]
                    }
                ],
                5: [
                    {
                        "type": "Long Answer",
                        "text": "Explain the mechanism of {chapter} in detail. Describe the experimental setup or anatomical structure with a neat, labeled diagram.",
                        "answer": "Mechanism details: (detailed explanation of the system, steps 1, 2, 3).\nDiagram Labels: 1. Input/Reagent inlet, 2. Reaction Chamber/Nucleus, 3. Output/Product collector.",
                        "key_points": ["Explain step-by-step mechanism", "Provide diagram labels: Input, Chamber, Output"]
                    },
                    {
                        "type": "Long Answer",
                        "text": "State the law of conservation related to {chapter}. Derive the mathematical expression for the total energy in the system and list its limitations.",
                        "answer": "1. Law statement: Total energy remains constant.\n2. Derivation: E_total = E_potential + E_kinetic. At height h, E_pot = mgh, E_kin = 0. At ground, E_pot = 0, E_kin = 0.5mv² = mgh. Thus E_total is constant.\n3. Limitations: Neglects air resistance, assumes a closed system, and applies only to non-relativistic speeds.",
                        "key_points": ["State conservation law", "Derive E_total = Constant", "List 3 limitations (air resistance, closed system, non-relativistic)"]
                    }
                ]
            },
            "language": {
                1: [
                    {
                        "type": "MCQ",
                        "text": "Identify the figure of speech used in the text related to {chapter}: 'The stars danced playfully in the sky.'",
                        "options": ["Personification", "Simile", "Metaphor", "Alliteration"],
                        "answer": "Option (a) Personification.",
                        "key_points": ["Non-human stars given human action (dancing)", "Matches definition of Personification"]
                    },
                    {
                        "type": "MCQ",
                        "text": "What is the synonym of the word 'resilient' as highlighted in the passage of {chapter}?",
                        "options": ["Strong / Elastic", "Weak / Fragile", "Lazy / Inactive", "Angry / Hostile"],
                        "answer": "Option (a) Strong / Elastic.",
                        "key_points": ["Resilient means able to recoil or spring back into shape", "Strong/Elastic is the closest synonym"]
                    },
                    {
                        "type": "Fill in the blanks",
                        "text": "Fill in the blank with the appropriate preposition: The protagonist in {chapter} succeeded ______ sheer hard work.",
                        "answer": "through / by",
                        "key_points": ["Preposition of cause/agency", "Through/by fits grammatically"]
                    }
                ],
                2: [
                    {
                        "type": "Short Answer",
                        "text": "What is the central theme of the poem/prose selection: {chapter}?",
                        "answer": "The central theme is the importance of perseverance and inner strength in overcoming life's unexpected challenges.",
                        "key_points": ["Core message: perseverance", "Theme: inner strength to overcome challenges"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Rewrite the sentence from direct to indirect speech: The teacher in {chapter} said, 'Honesty is the best policy.'",
                        "answer": "The teacher in {chapter} said that honesty is the best policy. (Note: Universal truths do not change tense in indirect speech).",
                        "key_points": ["Identify universal truth statement", "Keep same tense: 'honesty is the best policy'"]
                    }
                ],
                3: [
                    {
                        "type": "Short Answer",
                        "text": "Explain the significance of the title '{chapter}' with reference to the story/essay.",
                        "answer": "The title is highly symbolic of the main conflict, foreshadowing the ultimate transformation of the main character.",
                        "key_points": ["Symbolic nature of title", "Foreshadows character transformation"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Write a short paragraph (50-60 words) on your personal response to the characters in {chapter}.",
                        "answer": "The characters are well-developed and highly relatable. Their struggles with societal expectations reflect realistic scenarios, making their final victory inspiring.",
                        "key_points": ["Relatable characters", "Reflects realistic scenarios", "Inspiring resolution"]
                    }
                ],
                4: [
                    {
                        "type": "Short Answer",
                        "text": "Read the excerpt from {chapter} and write a summary focusing on the primary moral lesson.",
                        "answer": "The summary highlights how small actions of kindness accumulate to create a significant impact in the community.",
                        "key_points": ["Summary of primary actions", "Focus on the moral: kindness impact"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Draft a dialogue between the narrator and a character from {chapter} about the resolution of the conflict.",
                        "answer": "Dialogue writing showing a question-and-answer format, addressing the resolution and future hopes.",
                        "key_points": ["Proper dialogue formatting", "Address conflict resolution"]
                    }
                ],
                5: [
                    {
                        "type": "Long Answer",
                        "text": "Write a detailed appreciation of the poem/prose {chapter}, covering aspects like theme, poetic devices, language style, and values.",
                        "answer": "Appreciation sections: 1. About Author/Poet, 2. Central Theme, 3. Language & Style, 4. Poetic Devices (Alliteration, Metaphor), 5. Personal Opinion & Value.",
                        "key_points": ["Poet/Author background", "Theme and message", "Style and devices used", "Values and opinion"]
                    },
                    {
                        "type": "Long Answer",
                        "text": "Imagine you are the author of {chapter}. Write a formal letter to a reviewer explaining the social context and inspiration behind your work.",
                        "answer": "Formal letter layout: Address, Subject, Salutation, Body explaining the 19th-century societal norms that inspired the work, Sign-off.",
                        "key_points": ["Formal letter format", "Explain social context and inspiration"]
                    }
                ]
            },
            "social": {
                1: [
                    {
                        "type": "MCQ",
                        "text": "Which key historical event, policy, or concept forms the basis of {chapter}?",
                        "options": ["Socio-economic development", "Democratic centralization", "Agrarian reforms", "Constitutional amendments"],
                        "answer": "Option (a) Socio-economic development.",
                        "key_points": ["Core event/concept of the chapter", "Socio-economic development is the foundation"]
                    },
                    {
                        "type": "MCQ",
                        "text": "Who is the primary pioneer or author associated with the theories in {chapter}?",
                        "options": ["Dr. B. R. Ambedkar", "Adam Smith", "Dadabhai Naoroji", "All of the above"],
                        "answer": "Option (d) All of the above.",
                        "key_points": ["Pioneers associated with the topic", "All listed leaders are relevant"]
                    },
                    {
                        "type": "Fill in the blanks",
                        "text": "True or False: The resource planning principles of {chapter} are vital for sustainable development.",
                        "answer": "True. Sustainable development relies on efficient planning as discussed in {chapter}.",
                        "key_points": ["Link to sustainable development", "True statement"]
                    }
                ],
                2: [
                    {
                        "type": "Short Answer",
                        "text": "Define the core concepts or terms discussed in {chapter}.",
                        "answer": "Definition: It refers to the systematic framework implemented by the state to balance resources and human growth.",
                        "key_points": ["Define core concepts", "Relevance to balancing resources"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "List two primary reasons why the event or concept in {chapter} is considered a turning point.",
                        "answer": "1. It restructured the political/geographical boundaries of the region.\n2. It gave rise to local self-governance movements.",
                        "key_points": ["Reason 1: Restructured boundaries", "Reason 2: Local self-governance rise"]
                    }
                ],
                3: [
                    {
                        "type": "Reasoning",
                        "text": "Explain the main causes that led to the development of the policies/revolts in {chapter}.",
                        "answer": "The causes include: 1. Economic exploitation by external forces, 2. Growing social consciousness and education, and 3. Ineffective administrative reforms by the local government.",
                        "key_points": ["Cause 1: Economic exploitation", "Cause 2: Social consciousness growth", "Cause 3: Administrative failure"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "Differentiate between the primary and secondary features of the system described in {chapter}.",
                        "answer": "Primary features focus on immediate resource allocation and legislative approval, while secondary features focus on long-term capacity building and public feedback channels.",
                        "key_points": ["Primary: Immediate allocation & legislation", "Secondary: Long-term capacity & feedback"]
                    }
                ],
                4: [
                    {
                        "type": "Short Answer",
                        "text": "Analyze the long-term impact of {chapter} on the socio-economic conditions of Maharashtra.",
                        "answer": "The long-term impact includes the establishment of cooperative networks, improvement in literacy rates, and increased political representation for rural areas.",
                        "key_points": ["Establishment of cooperative networks", "Improvement in literacy rates", "Increased political representation"]
                    },
                    {
                        "type": "Short Answer",
                        "text": "What role did the media or local governance play in the movements described in {chapter}?",
                        "answer": "Media acted as a voice for the marginalized, publishing essays and reports that exposed injustices, while local governance provided a platform to pass resolutions.",
                        "key_points": ["Media as voice exposing injustice", "Local governance passing resolutions"]
                    }
                ],
                5: [
                    {
                        "type": "Long Answer",
                        "text": "Describe the overall system, organizational structure, or chronological history of {chapter} in detail.",
                        "answer": "Structure overview: 1. Introduction & Origin, 2. Key phases of development, 3. Main structural components, 4. Critical analysis and modern relevance.",
                        "key_points": ["Origin and intro", "Phases of development", "Structural components", "Modern relevance analysis"]
                    },
                    {
                        "type": "Long Answer",
                        "text": "Explain how the principles of {chapter} can be applied to solve modern-day challenges in public administration or economics.",
                        "answer": "Application points: 1. Decentralization of power to local bodies, 2. Transparent resource mapping, 3. Collaborative policy formulation involving community stakeholders, 4. Regular public audit of expenditures.",
                        "key_points": ["Decentralization of power", "Transparent resource mapping", "Collaborative policy", "Public expenditure audits"]
                    }
                ]
            }
        }

        # Sorting active marks categories
        active_marks = [int(m) for m in question_breakdown.keys()]
        active_marks.sort()

        sets_data = {}
        answer_keys = {}

        # Loop to create each set (A, B, C, D)
        for s_idx in range(num_sets):
            set_char = chr(65 + s_idx)
            set_offset = s_idx
            sections = []
            set_answers = []

            global_q_idx = 1
            section_chars = ["A", "B", "C", "D", "E"]

            for m_idx, mark in enumerate(active_marks):
                count = question_breakdown[str(mark)]
                sec_char = section_chars[min(m_idx, len(section_chars)-1)]
                
                # Setup section instructions
                if mark == 1:
                    inst = "Choose the correct alternative or fill in the blanks (1 mark each)"
                elif mark == 2:
                    inst = "Answer the following questions briefly (2 marks each)"
                elif mark == 3:
                    inst = "Answer the following short answer type II questions (3 marks each)"
                elif mark == 4:
                    inst = "Answer the following medium answer questions (4 marks each)"
                else:
                    inst = "Answer the following long answer questions with diagrams where appropriate (5 marks each)"

                section_questions = []

                for q_i in range(count):
                    q_global_index = global_q_idx
                    global_q_idx += 1

                    # Pick chapter
                    chapter = chapters[(q_global_index - 1) % len(chapters)]

                    # Pick template
                    cat_templates = templates[category][mark]
                    template = cat_templates[(q_global_index - 1) % len(cat_templates)]

                    # Instantiation values
                    coef = ((q_global_index + set_offset) % 4) + 2
                    val1 = ((q_global_index * 3 + set_offset) % 8) + 6
                    val2 = ((q_global_index * 2 + set_offset) % 5) + 2
                    val3 = ((q_global_index * 4 + set_offset) % 10) + 12

                    const = coef * val2
                    ans = val2
                    ans_plus_1 = ans + 1
                    ans_minus_1 = ans - 1
                    ans_plus_2 = ans + 2
                    prod = coef * val2
                    sum_val = val1 + val2
                    val_x = (sum_val) // 2
                    val_y = val1 - val_x
                    val_x1 = val1 / 2
                    val_y2 = val2 / 2
                    val_sub = val1 - 2
                    val_diff = val1 - val2
                    if val_diff % 2 != 0:
                        val_diff += 1
                        val1 += 1
                    val_son = val_diff // 2
                    val_father = val_son + val2
                    f1 = val2
                    f2 = val2 + 1
                    val_q_sum = f1 + f2
                    val_q_prod = f1 * f2
                    val_f = val1 * val2
                    ans_sci_work = val_f * val3

                    vocab_list = ["resilient", "abundant", "ephemeral", "pragmatic", "benevolent"]
                    syn_list = ["strong/elastic", "plentiful", "short-lived", "practical", "kind/generous"]
                    ant1_list = ["weak/fragile", "scarce", "permanent", "unrealistic", "cruel/selfish"]
                    ant2_list = ["lazy/inactive", "barren", "long-lasting", "foolish", "stingy"]
                    ant3_list = ["angry/hostile", "empty", "eternal", "emotional", "greedy"]
                    
                    vocab_idx = (q_global_index + set_offset) % len(vocab_list)
                    vocab = vocab_list[vocab_idx]
                    syn = syn_list[vocab_idx]
                    ant1 = ant1_list[vocab_idx]
                    ant2 = ant2_list[vocab_idx]
                    ant3 = ant3_list[vocab_idx]

                    fmt = {
                        "chapter": chapter,
                        "coef": coef,
                        "const": const,
                        "ans": ans,
                        "ans_plus_1": ans_plus_1,
                        "ans_minus_1": ans_minus_1,
                        "ans_plus_2": ans_plus_2,
                        "val1": val1,
                        "val2": val2,
                        "val3": val3,
                        "prod": prod,
                        "sum_val": sum_val,
                        "val_x": val_x,
                        "val_y": val_y,
                        "val_x1": val_x1,
                        "val_y2": val_y2,
                        "val_sub": val_sub,
                        "val_diff": val_diff,
                        "val_son": val_son,
                        "val_father": val_father,
                        "f1": f1,
                        "f2": f2,
                        "val_f": val_f,
                        "vocab": vocab,
                        "syn": syn,
                        "ant1": ant1,
                        "ant2": ant2,
                        "ant3": ant3
                    }

                    # Determine answer override values
                    if category == "math":
                        if mark == 1:
                            fmt["ans"] = ans
                        elif mark == 3:
                            fmt["ans"] = val_sub * 180
                        elif mark == 5:
                            fmt["ans"] = 0.5 * val1 * val2
                    elif category == "science":
                        if mark == 4:
                            fmt["ans"] = ans_sci_work

                    # Format texts
                    formatted_text = template["text"].format(**fmt)
                    
                    formatted_options = []
                    if template["type"] == "MCQ":
                        raw_options = [opt.format(**fmt) for opt in template["options"]]
                        # Deterministic shuffle
                        raw_options.sort()
                        shift = (q_global_index + set_offset) % len(raw_options)
                        raw_options = raw_options[shift:] + raw_options[:shift]
                        labels = ["a", "b", "c", "d"]
                        for o_idx, opt in enumerate(raw_options):
                            formatted_options.append(f"{labels[o_idx]}) {opt}")

                    formatted_ans = template["answer"].format(**fmt)
                    if template["type"] == "MCQ":
                        correct_cleaned = template["answer"].format(**fmt).replace("Option (a) ", "").rstrip(".")
                        correct_label = "a"
                        for o_idx, opt_str in enumerate(formatted_options):
                            cleaned_opt_str = re.sub(r'^[a-d]\)\s*', '', opt_str)
                            if correct_cleaned in cleaned_opt_str or cleaned_opt_str in correct_cleaned:
                                correct_label = ["a", "b", "c", "d"][o_idx]
                                break
                        formatted_ans = f"Option ({correct_label}) {correct_cleaned}."

                    formatted_key_points = [kp.format(**fmt) for kp in template["key_points"]]

                    q_id = f"q{q_global_index}_{set_char}"
                    
                    # Create question object
                    q_obj = {
                        "id": q_id,
                        "question_text": formatted_text,
                        "marks": mark,
                        "difficulty": "easy" if mark <= 2 else ("medium" if mark <= 4 else "hard"),
                        "question_type": template["type"],
                        "chapter_name": chapter
                    }
                    if formatted_options:
                        q_obj["options"] = formatted_options
                        
                    section_questions.append(q_obj)

                    # Create answer key object
                    set_answers.append({
                        "id": q_id,
                        "model_answer": formatted_ans,
                        "key_points": formatted_key_points,
                        "marks": mark
                    })

                sections.append({
                    "section_name": f"Section {sec_char}",
                    "section_instruction": inst,
                    "questions": section_questions
                })

            sets_data[set_char] = {"sections": sections}
            answer_keys[set_char] = set_answers

        paper_res = {
            "paper_name": f"{class_name} {subject_name} Examination (Fallback System)",
            "board": board_name,
            "class_name": class_name,
            "subject": subject_name,
            "total_marks": total_marks,
            "time_allowed_minutes": time_allowed,
            "instructions": [
                "All questions are compulsory.",
                "Draw neat and labeled diagrams wherever necessary.",
                "Figures to the right indicate full marks."
            ],
            "sets": sets_data,
            "answer_key": answer_keys
        }
        if category == "science":
            paper_res["constants"] = [
                "Acceleration due to gravity (g) = 9.8 m/s²",
                "Speed of light (c) = 3 × 10⁸ m/s",
                "Planck's constant (h) = 6.63 × 10⁻³⁴ J·s"
            ]
        return paper_res

    def regenerate_single_question(
        self,
        board_name: str,
        class_name: str,
        subject_name: str,
        chapter: str,
        question_type: str,
        marks: int,
        difficulty: str,
        language: str,
        current_question_text: str,
        is_diagram: bool = False
    ) -> Dict[str, Any]:
        """Regenerates a single board-compliant question using Gemini AI 2.5 Flash."""
        self._ensure_configured()
        
        diagram_rule = ""
        if is_diagram:
            diagram_rule = "\n- The question MUST require drawing a neat, labeled diagram, explaining a diagram, or completing a diagram."
            
        prompt = f"""
You are an expert examiner for the Maharashtra State Secondary and Higher Secondary Education Board.
Generate a single, original question of type '{question_type}' carrying exactly {marks} mark(s) and difficulty '{difficulty}' for the chapter '{chapter}' in the subject '{subject_name}' (Class {class_name}, Board {board_name}).
Language: {language} (Provide translations if "Bilingual" or "Marathi")
{diagram_rule}

CRITICAL REQUIREMENT:
The question MUST be different from the following current question:
"{current_question_text}"

JSON OUTPUT FORMAT:
You MUST respond with a single valid JSON object. Do not include markdown code block syntax (like ```json) in your raw response, or if you do, make sure it is valid JSON. The JSON structure must be:
{{
  "question_text": "...",
  "options": ["a) ...", "b) ...", "c) ...", "d) ..."], // Include only if MCQ/objective options are needed
  "marks": {marks},
  "difficulty": "{difficulty}",
  "question_type": "{question_type}",
  "chapter_name": "{chapter}",
  "model_answer": "...",
  "key_points": ["...", "..."]
}}
"""
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                generation_config={"response_mime_type": "application/json"}
            )
            response = model.generate_content(prompt, request_options={"timeout": 10.0})
            text_out = response.text
            
            # Strip markdown block if present
            if text_out.startswith("```"):
                text_out = re.sub(r'^```[a-zA-Z]*\n', '', text_out)
                text_out = re.sub(r'\n```$', '', text_out)
                
            q_data = json.loads(text_out)
            return q_data
        except Exception as e:
            print(f"Error regenerating question via Gemini: {e}")
            fallback_text = f"Explain the core concept of {chapter} in detail."
            if is_diagram:
                fallback_text = f"Draw a neat, labeled diagram of the key process in {chapter} and explain its functions."
                
            fallback_options = []
            if question_type == "MCQ":
                fallback_text = f"Which of the following is a primary feature of {chapter}?"
                fallback_options = ["a) Option A", "b) Option B", "c) Option C", "d) Option D"]
                
            return {
                "question_text": fallback_text,
                "options": fallback_options,
                "marks": marks,
                "difficulty": difficulty,
                "question_type": question_type,
                "chapter_name": chapter,
                "model_answer": f"Detail answer explaining {chapter}.",
                "key_points": [f"Introduction to {chapter}", f"Main features and functions of {chapter}"]
            }

gemini_service = GeminiService()
