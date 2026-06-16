from sqlalchemy.orm import Session
from backend.app.models.academic import Board, Class, Subject, Chapter
from backend.app.models.question import Question
from backend.app.services.embeddings_service import embeddings_service

# Exact Maharashtra State Board syllabus as specified by user
SYLLABUS_DATA = {
    "Class 8": {
        "Maths Part 1": [
            "Rational and Irrational Numbers",
            "Parallel Lines and Transversals",
            "Indices and Cube Roots",
            "Altitudes and Medians of Triangle",
            "Expansion Formulae",
            "Factorisation of Algebraic Expressions",
            "Variation",
            "Quadrilateral Constructions and Types",
            "Discount and Commission",
            "Division of Polynomials",
            "Statistics",
            "Equations in One Variable",
            "Congruence of Triangles",
            "Compound Interest",
            "Area",
            "Surface Area and Volume",
            "Circle, Chord and Arc"
        ],
        "Maths Part 2": [
            "Basic Concepts in Geometry",
            "Parallel Lines",
            "Triangles",
            "Constructions of Triangles",
            "Quadrilaterals",
            "Circle",
            "Coordinate Geometry",
            "Trigonometry",
            "Surface Area and Volume"
        ],
        "Science": [
            "Living World and Classification of Microbes",
            "Health and Diseases",
            "Force and Pressure",
            "Current Electricity and Magnetism",
            "Inside the Atom",
            "Composition of Matter",
            "Metals and Nonmetals",
            "Disaster Management",
            "Cell and Cell Organelles",
            "Human Body and Organ System",
            "Introduction to Acid and Base",
            "Chemical Change and Chemical Bond",
            "Sedimentary and Igneous Rock",
            "Effects of Heat",
            "Sound",
            "Reflection of Light",
            "Manmade Materials",
            "Ecosystems",
            "Life Cycle of Stars"
        ]
    },
    "Class 9": {
        "Maths Part 1": [
            "Sets",
            "Real Numbers",
            "Polynomials",
            "Ratio and Proportion",
            "Linear Equations in Two Variables",
            "Financial Planning",
            "Statistics"
        ],
        "Maths Part 2": [
            "Basic Concepts in Geometry",
            "Parallel Lines",
            "Triangles",
            "Constructions of Triangles",
            "Quadrilaterals",
            "Circle",
            "Coordinate Geometry",
            "Trigonometry",
            "Surface Area and Volume"
        ],
        "Science Part 1": [
            "Laws of Motion",
            "Work and Energy",
            "Current Electricity",
            "Measurement of Matter",
            "Acids Bases and Salts",
            "Classification of Plants",
            "Energy Flow in Ecosystem",
            "Useful and Harmful Microbes",
            "Environmental Management",
            "Information Communication Technology",
            "Reflection of Light",
            "Study of Sound",
            "Carbon: An Important Element",
            "Substances in Common Use",
            "Life Processes in Living Organisms",
            "Heredity and Variation",
            "Introduction to Biotechnology",
            "Observing Space: Telescopes"
        ],
        "Science Part 2": [
            "Heredity and Evolution",
            "Life Processes in Living Organisms Part 1",
            "Life Processes in Living Organisms Part 2",
            "Environmental Management",
            "Towards Green Energy",
            "Animal Classification",
            "Introduction to Microbiology",
            "Cell Biology and Biotechnology",
            "Social Health",
            "Disaster Management"
        ]
    },
    "Class 10": {
        "Maths Part 1": [
            "Linear Equations in Two Variables",
            "Quadratic Equations",
            "Arithmetic Progression",
            "Financial Planning",
            "Probability",
            "Statistics"
        ],
        "Maths Part 2": [
            "Similarity",
            "Pythagoras Theorem",
            "Circle",
            "Geometric Constructions",
            "Co-ordinate Geometry",
            "Trigonometry",
            "Mensuration"
        ],
        "Science Part 1": [
            "Gravitation",
            "Periodic Classification of Elements",
            "Chemical Reactions and Equations",
            "Effects of Electric Current",
            "Heat",
            "Refraction of Light",
            "Lenses",
            "Metallurgy",
            "Carbon Compounds",
            "Space Missions"
        ],
        "Science Part 2": [
            "Heredity and Evolution",
            "Life Processes in Living Organisms Part 1",
            "Life Processes in Living Organisms Part 2",
            "Environmental Management",
            "Towards Green Energy",
            "Animal Classification",
            "Introduction to Microbiology",
            "Cell Biology and Biotechnology",
            "Social Health",
            "Disaster Management"
        ]
    },
    "Class 11": {
        "Physics": [
            "Units and Measurements",
            "Mathematical Methods",
            "Motion in a Plane",
            "Laws of Motion",
            "Gravitation",
            "Mechanical Properties of Solids",
            "Thermal Properties of Matter",
            "Sound",
            "Optics",
            "Electrostatics",
            "Electric Current Through Conductors",
            "Magnetism",
            "Electromagnetic Waves and Communication System",
            "Semiconductors"
        ],
        "Chemistry Part 1": [
            "Some Basic Concepts of Chemistry",
            "Introduction to Analytical Chemistry",
            "Some Analytical Techniques",
            "Structure of Atom",
            "Chemical Bonding",
            "Redox Reactions",
            "Modern Periodic Table",
            "Elements of Group 1 and Group 2",
            "Elements of Groups 13, 14 and 15"
        ],
        "Chemistry Part 2": [
            "States of Matter: Gaseous and Liquid States",
            "Adsorption and Colloids",
            "Chemical Equilibrium",
            "Nuclear Chemistry and Radioactivity",
            "Basic Principles of Organic Chemistry",
            "Hydrocarbons",
            "Chemistry in Everyday Life"
        ],
        "Biology": [
            "Living World",
            "Systematics of Living Organisms",
            "Kingdom Plantae",
            "Kingdom Animalia",
            "Cell Structure and Organization",
            "Biomolecules",
            "Cell Division",
            "Plant Tissues and Anatomy",
            "Morphology of Flowering Plants",
            "Animal Tissue",
            "Study of Animal Type – Cockroach",
            "Photosynthesis",
            "Respiration and Energy Transfer",
            "Human Nutrition",
            "Excretion and Osmoregulation",
            "Skeleton and Movements"
        ],
        "Maths Part 1": [
            "Angle and its Measurement",
            "Trigonometry I",
            "Trigonometry II",
            "Determinants and Matrices",
            "Straight Line",
            "Circle",
            "Conic Sections",
            "Measures of Dispersion",
            "Probability"
        ],
        "Maths Part 2": [
            "Complex Numbers",
            "Sequences and Series",
            "Permutations and Combinations",
            "Method of Induction and Binomial Theorem",
            "Sets and Relations",
            "Functions",
            "Limits",
            "Continuity",
            "Differentiation"
        ]
    },
    "Class 12": {
        "Physics Part 1": [
            "Rotational Dynamics",
            "Mechanical Properties of Fluids",
            "Kinetic Theory of Gases and Radiation",
            "Thermodynamics",
            "Oscillations",
            "Superposition of Waves",
            "Wave Optics"
        ],
        "Physics Part 2": [
            "Electrostatics",
            "Current Electricity",
            "Magnetic Fields due to Electric Current",
            "Magnetic Materials",
            "Electromagnetic Induction",
            "AC Circuits",
            "Dual Nature of Radiation and Matter",
            "Structure of Atoms and Nuclei",
            "Semiconductor Devices"
        ],
        "Chemistry Part 1": [
            "Solid State",
            "Solutions",
            "Ionic Equilibrium",
            "Chemical Thermodynamics",
            "Electrochemistry",
            "Chemical Kinetics",
            "Elements of Groups 16, 17 and 18",
            "Transition and Inner Transition Elements",
            "Coordination Compounds"
        ],
        "Chemistry Part 2": [
            "Halogen Derivatives",
            "Alcohols Phenols and Ethers",
            "Aldehydes Ketones and Carboxylic Acids",
            "Amines",
            "Biomolecules",
            "Introduction to Polymer Chemistry",
            "Green Chemistry and Nanochemistry"
        ],
        "Biology Part 1": [
            "Reproduction in Lower and Higher Plants",
            "Reproduction in Lower and Higher Animals",
            "Inheritance and Variation",
            "Molecular Basis of Inheritance",
            "Origin and Evolution of Life",
            "Plant Growth and Mineral Nutrition",
            "Respiration and Energy Transfer",
            "Human Health and Diseases"
        ],
        "Biology Part 2": [
            "Control and Coordination",
            "Human Reproduction",
            "Enhancement of Food Production",
            "Biotechnology",
            "Organisms and Populations",
            "Ecosystems and Energy Flow",
            "Biodiversity Conservation and Environment"
        ],
        "Maths Part 1": [
            "Mathematical Logic",
            "Matrices",
            "Trigonometric Functions",
            "Pair of Straight Lines",
            "Vectors",
            "Line and Plane",
            "Linear Programming"
        ],
        "Maths Part 2": [
            "Differentiation",
            "Applications of Derivatives",
            "Indefinite Integration",
            "Definite Integration",
            "Application of Definite Integration",
            "Differential Equations",
            "Probability Distributions",
            "Bernoulli Trials"
        ]
    }
}

# Preseeded questions for Class 10 Science Part 1
SEED_QUESTIONS = [
    {
        "chapter": "Gravitation",
        "question_text": "The gravitational force between two objects of masses m1 and m2 separated by distance d is F. If the distance between them is doubled, what will be the new force?",
        "answer_text": "According to Newton's law of gravitation, F = G * (m1 * m2) / d². If distance d becomes 2d, the new force F' = G * (m1 * m2) / (2d)² = F / 4. Therefore, the force reduces to one-fourth of its original value.",
        "marks": 1,
        "difficulty": "easy",
        "question_type": "MCQ",
        "bloom_level": "remembering",
        "language": "English"
    },
    {
        "chapter": "Gravitation",
        "question_text": "Distinguish between Mass and Weight. (Write at least 2 points of differences)",
        "answer_text": "1. Mass is the measure of the quantity of matter contained in an object, whereas Weight is the force with which the earth attracts the object.\n2. Mass remains constant everywhere (even on other planets), whereas Weight changes from place to place depending on the acceleration due to gravity (g).\n3. Mass is a scalar quantity and its SI unit is kg. Weight is a vector quantity and its SI unit is Newton (N).",
        "marks": 2,
        "difficulty": "medium",
        "question_type": "Short Answer",
        "bloom_level": "understanding",
        "language": "English"
    },
    {
        "chapter": "Gravitation",
        "question_text": "State Kepler's three laws of planetary motion.",
        "answer_text": "1. Kepler's First Law (Law of Orbits): The orbit of a planet is an ellipse with the Sun at one of the two foci.\n2. Kepler's Second Law (Law of Equal Areas): The line joining the planet and the Sun sweeps equal areas in equal intervals of time.\n3. Kepler's Third Law (Law of Periods): The square of the period of revolution of a planet around the Sun is directly proportional to the cube of the mean distance of the planet from the Sun (T² ∝ r³).",
        "marks": 3,
        "difficulty": "medium",
        "question_type": "Reasoning",
        "bloom_level": "understanding",
        "language": "English"
    },
    {
        "chapter": "Chemical Reactions and Equations",
        "question_text": "Which of the following is a balanced decomposition reaction?",
        "answer_text": "2H₂O (l) --(Electricity)--> 2H₂ (g) + O₂ (g). In this reaction, a single reactant (water) breaks down into two simpler products using electrical energy, and the atoms are balanced on both sides.",
        "marks": 1,
        "difficulty": "easy",
        "question_type": "MCQ",
        "bloom_level": "remembering",
        "language": "English"
    },
    {
        "chapter": "Chemical Reactions and Equations",
        "question_text": "What is an endothermic reaction? Explain with a balanced chemical equation.",
        "answer_text": "A chemical reaction in which heat is absorbed from the surroundings is called an endothermic reaction.\nExample: CaCO₃ (s) + Heat ---> CaO (s) + CO₂ (g)",
        "marks": 2,
        "difficulty": "easy",
        "question_type": "Short Answer",
        "bloom_level": "understanding",
        "language": "English"
    },
    {
        "chapter": "Refraction of Light",
        "question_text": "What is the unit of refractive index of a medium?",
        "answer_text": "Refractive index has no unit. It is a ratio of the speed of light in two different media (n = v1 / v2). Since it is a ratio of similar physical quantities, it is a dimensionless pure number.",
        "marks": 1,
        "difficulty": "easy",
        "question_type": "MCQ",
        "bloom_level": "remembering",
        "language": "English"
    }
]


def seed_academic_structure(db: Session):
    """Initializes the board, class, subject, and chapters in the database."""
    # 1. Seed Board
    board = db.query(Board).filter(Board.board_name == "Maharashtra State Board").first()
    if not board:
        board = Board(board_name="Maharashtra State Board")
        db.add(board)
        db.commit()
        db.refresh(board)
        print("Seeded Board: Maharashtra State Board")

    chapters_map = {}

    # Iterate over classes and subjects
    for class_name, subjects_dict in SYLLABUS_DATA.items():
        # Find or create Class
        classroom = db.query(Class).filter(Class.class_name == class_name, Class.board_id == board.id).first()
        if not classroom:
            classroom = Class(class_name=class_name, board_id=board.id)
            db.add(classroom)
            db.commit()
            db.refresh(classroom)
            print(f"Seeded Class: {class_name}")

        for subject_name, chapters_list in subjects_dict.items():
            # Find or create Subject
            subject = db.query(Subject).filter(
                Subject.subject_name == subject_name,
                Subject.class_id == classroom.id
            ).first()
            if not subject:
                subject = Subject(subject_name=subject_name, class_id=classroom.id)
                db.add(subject)
                db.commit()
                db.refresh(subject)
                print(f"Seeded Subject: {class_name} -> {subject_name}")

            # Find or create Chapters
            for ch_name in chapters_list:
                ch = db.query(Chapter).filter(
                    Chapter.chapter_name == ch_name,
                    Chapter.subject_id == subject.id
                ).first()
                if not ch:
                    ch = Chapter(chapter_name=ch_name, subject_id=subject.id)
                    db.add(ch)
                    db.commit()
                    db.refresh(ch)

                # Save Class 10 Science Part 1 chapters for question seeding
                if class_name == "Class 10" and subject_name == "Science Part 1":
                    chapters_map[ch_name] = ch

    return board, chapters_map


def seed_questions(db: Session):
    """Generates embeddings and seeds standard board questions into the database."""
    board, chapters_map = seed_academic_structure(db)

    # Fetch Class 10 Science Part 1 subject reference
    classroom = db.query(Class).filter(Class.class_name == "Class 10", Class.board_id == board.id).first()
    if not classroom:
        return

    subject = db.query(Subject).filter(
        Subject.subject_name == "Science Part 1",
        Subject.class_id == classroom.id
    ).first()

    if not subject:
        return

    # Check if questions are already seeded
    existing_count = db.query(Question).filter(Question.subject_id == subject.id).count()
    if existing_count > 0:
        print(f"Questions already seeded ({existing_count} questions found). Skipping.")
        return

    print("Generating question embeddings and seeding questions...")
    for sq in SEED_QUESTIONS:
        ch_obj = chapters_map.get(sq["chapter"])
        if not ch_obj:
            continue

        print(f"Seeding question: '{sq['question_text'][:50]}...'")
        embedding = embeddings_service.generate_embedding(sq["question_text"])

        q_db = Question(
            board_id=board.id,
            class_id=classroom.id,
            subject_id=subject.id,
            chapter_id=ch_obj.id,
            question_text=sq["question_text"],
            answer_text=sq["answer_text"],
            marks=sq["marks"],
            difficulty=sq["difficulty"],
            question_type=sq["question_type"],
            bloom_level=sq["bloom_level"],
            language=sq["language"],
            embedding=embedding
        )
        db.add(q_db)

    db.commit()
    print("Database seeding completed successfully!")
