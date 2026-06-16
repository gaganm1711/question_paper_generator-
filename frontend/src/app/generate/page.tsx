'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePaperStore } from '@/store/usePaperStore';
import { useRouter } from 'next/navigation';
import { 
  Loader2, Sparkles, BookOpen, Layers, Check, 
  ArrowLeft, ArrowRight, Settings, Info, Plus, Trash2
} from 'lucide-react';

export default function GeneratePaper() {
  const { token } = useAuthStore();
  const { 
    boards, classes, subjects, chapters,
    fetchBoards, fetchClasses, fetchSubjects, fetchChapters,
    generatePaper, actionLoading, error 
  } = usePaperStore();
  const router = useRouter();

  // Form Steps
  const [step, setStep] = useState(1);

  // Form State
  const [selectedBoard, setSelectedBoard] = useState<number | ''>('');
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  // Question counts by marks (coaching class default paper style)
  const [count1, setCount1] = useState<number>(5);
  const [count2, setCount2] = useState<number>(3);
  const [count3, setCount3] = useState<number>(3);
  const [count4, setCount4] = useState<number>(0);
  const [count5, setCount5] = useState<number>(2);

  // Dynamic sum calculation
  const totalMarks = (count1 * 1) + (count2 * 2) + (count3 * 3) + (count4 * 4) + (count5 * 5);
  const [timeAllowed, setTimeAllowed] = useState<number>(60);
  const [language, setLanguage] = useState<string>('English');
  const [numSets, setNumSets] = useState<number>(1);
  const [schoolName, setSchoolName] = useState<string>('Career Launcher Tuition Classes');
  const [diagramQuestions, setDiagramQuestions] = useState<number>(2);
  
  // Difficulty State
  const [easyPercent, setEasyPercent] = useState<number>(40);
  const [mediumPercent, setMediumPercent] = useState<number>(40);
  const [hardPercent, setHardPercent] = useState<number>(20);

  // Custom Metadata & Guidelines state
  const [date, setDate] = useState<string>('29/12/24');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [constants, setConstants] = useState<string[]>([]);

  // Load default instructions and constants based on selected subject
  useEffect(() => {
    if (selectedSubject) {
      const subjectObj = subjects.find(s => s.id === selectedSubject);
      const subjectName = subjectObj ? subjectObj.subject_name.toLowerCase() : '';
      
      if (subjectName.includes('science') || subjectName.includes('physics') || subjectName.includes('chemistry') || subjectName.includes('biology')) {
        setInstructions([
          "All questions are compulsory.",
          "Draw neat and labeled diagrams wherever necessary.",
          "Figures to the right indicate full marks.",
          "Use of a non-programmable calculator is allowed."
        ]);
        setConstants([
          "Acceleration due to gravity (g) = 9.8 m/s²",
          "Speed of light (c) = 3 × 10⁸ m/s",
          "Planck's constant (h) = 6.63 × 10⁻³⁴ J·s"
        ]);
      } else if (subjectName.includes('math') || subjectName.includes('algebra') || subjectName.includes('geometry') || subjectName.includes('arithmetic')) {
        setInstructions([
          "All questions are compulsory.",
          "Use of calculator is not allowed.",
          "Figures to the right indicate full marks.",
          "Draw neat diagrams wherever necessary."
        ]);
        setConstants([
          "π = 22/7 or 3.14",
          "√2 = 1.414",
          "√3 = 1.732"
        ]);
      } else {
        setInstructions([
          "All questions are compulsory.",
          "Figures to the right indicate full marks."
        ]);
        setConstants([]);
      }
    } else {
      setInstructions([
        "All questions are compulsory.",
        "Figures to the right indicate full marks."
      ]);
      setConstants([]);
    }
  }, [selectedSubject, subjects]);

  const handleInstructionChange = (idx: number, value: string) => {
    const updated = [...instructions];
    updated[idx] = value;
    setInstructions(updated);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, "New instruction."]);
  };

  const handleDeleteInstruction = (idx: number) => {
    setInstructions(instructions.filter((_, i) => i !== idx));
  };

  const handleConstantChange = (idx: number, value: string) => {
    const updated = [...constants];
    updated[idx] = value;
    setConstants(updated);
  };

  const handleAddConstant = () => {
    setConstants([...constants, "Constant = Value"]);
  };

  const handleDeleteConstant = (idx: number) => {
    setConstants(constants.filter((_, i) => i !== idx));
  };

  // Auth Protection
  useEffect(() => {
    if (!token && !localStorage.getItem('token')) {
      router.push('/login');
    } else {
      fetchBoards();
    }
  }, [token, router, fetchBoards]);

  // Lazy Fetching Chained Selectors
  const handleBoardChange = (id: number) => {
    setSelectedBoard(id);
    setSelectedClass('');
    setSelectedSubject('');
    setSelectedChapters([]);
    fetchClasses(id);
  };

  const handleClassChange = (id: number) => {
    setSelectedClass(id);
    setSelectedSubject('');
    setSelectedChapters([]);
    fetchSubjects(id);
  };

  const handleSubjectChange = (id: number) => {
    setSelectedSubject(id);
    setSelectedChapters([]);
    fetchChapters(id);
  };

  const handleChapterToggle = (id: number) => {
    setSelectedChapters(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  // Pre-select chapter "Life process in living organism part I" as default if present
  useEffect(() => {
    if (chapters.length > 0) {
      const targetCh = chapters.find(ch => 
        ch.chapter_name.toLowerCase().includes("life process in living organism part i") ||
        ch.chapter_name.toLowerCase().includes("life process in living organism part 1")
      );
      if (targetCh && !selectedChapters.includes(targetCh.id)) {
        setSelectedChapters([targetCh.id]);
      }
    }
  }, [chapters]);

  const handleSelectAllChapters = () => {
    if (selectedChapters.length === chapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(chapters.map(ch => ch.id));
    }
  };

  const handleNext = () => {
    if (step === 1 && (!selectedBoard || !selectedClass || !selectedSubject)) return;
    if (step === 2 && selectedChapters.length === 0) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Validate difficulty sums
    if (easyPercent + mediumPercent + hardPercent !== 100) {
      alert('Difficulty distribution percentages must add up to exactly 100%!');
      return;
    }

    const payload = {
      board_id: Number(selectedBoard),
      class_id: Number(selectedClass),
      subject_id: Number(selectedSubject),
      chapter_ids: selectedChapters,
      total_marks: totalMarks,
      question_breakdown: {
        "1": count1,
        "2": count2,
        "3": count3,
        "4": count4,
        "5": count5
      },
      easy_percent: easyPercent,
      medium_percent: mediumPercent,
      hard_percent: hardPercent,
      language,
      num_sets: numSets,
      school_name: schoolName,
      time_allowed_minutes: timeAllowed,
      num_diagram_questions: diagramQuestions,
      date: date,
      instructions: instructions,
      constants: constants
    };

    const paper = await generatePaper(payload);
    if (paper) {
      router.push(`/preview/${paper.id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Wizard Step Progress Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Create Question Paper
          </h2>
          <p className="text-slate-400 text-xs mt-1">Configure your paper requirements step-by-step</p>
        </div>
        <div className="flex gap-2">
          {[1, 3, 4].map((s_num, i) => {
            // Mapping s_num to 1, 2, 3 visually
            const step_label = i + 1;
            return (
              <div 
                key={s_num}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                  step > i ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}
              >
                {step > i + 1 ? <Check className="w-4 h-4" /> : step_label}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Content container */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6 min-h-[350px] flex flex-col justify-between">
        
        {/* STEP 1: Academic Settings */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-bold text-white text-base border-b border-slate-900 pb-3">Academic Selection</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Board Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Board</label>
                <select
                  value={selectedBoard}
                  onChange={(e) => handleBoardChange(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="" disabled className="bg-[#03040c]">Select Board</option>
                  {boards.map(b => (
                    <option key={b.id} value={b.id} className="bg-[#03040c]">{b.board_name}</option>
                  ))}
                </select>
              </div>

              {/* Class Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Class</label>
                <select
                  disabled={!selectedBoard}
                  value={selectedClass}
                  onChange={(e) => handleClassChange(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                >
                  <option value="" disabled className="bg-[#03040c]">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#03040c]">{c.class_name}</option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subject</label>
                <select
                  disabled={!selectedClass}
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                >
                  <option value="" disabled className="bg-[#03040c]">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#03040c]">{s.subject_name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl flex gap-3 text-slate-400 text-xs">
              <Info className="w-5 h-5 text-indigo-400 shrink-0" />
              <p className="leading-normal">
                If the selections list is empty, navigate to the <strong>Admin Panel</strong> to run the auto-seeder script and populate default board details.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Chapters Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-bold text-white text-base">Select Syllabus Chapters</h3>
              <button 
                onClick={handleSelectAllChapters}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {selectedChapters.length === chapters.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {chapters.length === 0 ? (
              <p className="text-slate-500 text-xs italic">Select an academic subject first to populate chapters.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {chapters.map(ch => {
                  const isChecked = selectedChapters.includes(ch.id);
                  return (
                    <div 
                      key={ch.id}
                      onClick={() => handleChapterToggle(ch.id)}
                      className={`p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer flex items-center justify-between ${
                        isChecked 
                          ? 'border-indigo-500/40 bg-indigo-600/5 text-white font-medium' 
                          : 'border-slate-800 bg-slate-900/10 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{ch.chapter_name}</span>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isChecked ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-800 bg-slate-950'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Config & Difficulty parameters */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="font-bold text-white text-base border-b border-slate-900 pb-3">Format & Constraints</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* School Name */}
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">School Header Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Enter School/College Name"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Custom Marks Allocation */}
              <div className="col-span-1 md:col-span-2 space-y-4 border-t border-b border-slate-900/80 py-4 my-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Configure Question Marks Breakdown</h4>
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25">
                    Calculated Total: {totalMarks} Marks
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">1-Mark Qs</label>
                    <input
                      type="number"
                      min={0}
                      value={count1}
                      onChange={(e) => setCount1(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">2-Mark Qs</label>
                    <input
                      type="number"
                      min={0}
                      value={count2}
                      onChange={(e) => setCount2(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">3-Mark Qs</label>
                    <input
                      type="number"
                      min={0}
                      value={count3}
                      onChange={(e) => setCount3(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">4-Mark Qs</label>
                    <input
                      type="number"
                      min={0}
                      value={count4}
                      onChange={(e) => setCount4(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">5-Mark Qs</label>
                    <input
                      type="number"
                      min={0}
                      value={count5}
                      onChange={(e) => setCount5(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Time Limit (Minutes)</label>
                <input
                  type="number"
                  value={timeAllowed}
                  onChange={(e) => setTimeAllowed(Number(e.target.value))}
                  min={30}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="English" className="bg-[#03040c]">English</option>
                  <option value="Marathi" className="bg-[#03040c]">Marathi</option>
                  <option value="Bilingual" className="bg-[#03040c]">Bilingual (English + Marathi)</option>
                </select>
              </div>

              {/* Multi-set Generator */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Number of Sets</label>
                <select
                  value={numSets}
                  onChange={(e) => setNumSets(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={1} className="bg-[#03040c]">1 Set (Set A)</option>
                  <option value={2} className="bg-[#03040c]">2 Sets (Set A, B)</option>
                  <option value={4} className="bg-[#03040c]">4 Sets (Set A, B, C, D)</option>
                </select>
              </div>

              {/* Diagram-based Questions selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Diagram-based Questions</label>
                <select
                  value={diagramQuestions}
                  onChange={(e) => setDiagramQuestions(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={0} className="bg-[#03040c]">0 Questions</option>
                  <option value={1} className="bg-[#03040c]">1 Question</option>
                  <option value={2} className="bg-[#03040c]">2 Questions</option>
                  <option value={3} className="bg-[#03040c]">3 Questions</option>
                  <option value={4} className="bg-[#03040c]">4 Questions</option>
                  <option value={5} className="bg-[#03040c]">5 Questions</option>
                </select>
              </div>

              {/* Exam Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Exam Date</label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="e.g. 29/12/24"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Candidate Instructions Editor */}
            <div className="space-y-4 pt-4 border-t border-slate-900">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Candidate Instructions</label>
                <button 
                  onClick={handleAddInstruction}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Instruction
                </button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {instructions.map((inst, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900/30 border border-slate-850 p-2 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <input 
                      type="text" 
                      value={inst} 
                      onChange={(e) => handleInstructionChange(idx, e.target.value)}
                      className="w-full bg-transparent border-b border-slate-800 focus:border-indigo-500 focus:outline-none px-1 py-0.5 text-xs text-white placeholder-slate-600 transition-colors"
                      placeholder="Enter instruction"
                    />
                    <button 
                      onClick={() => handleDeleteInstruction(idx)} 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete instruction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {instructions.length === 0 && (
                  <p className="text-slate-500 text-xs italic">No instructions defined. Click "Add Instruction" to create one.</p>
                )}
              </div>
            </div>

            {/* Constants Editor */}
            <div className="space-y-4 pt-4 border-t border-slate-900">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Physical Constants / Formulae</label>
                <button 
                  onClick={handleAddConstant}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Constant
                </button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {constants.map((constItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900/30 border border-slate-850 p-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <input 
                      type="text" 
                      value={constItem} 
                      onChange={(e) => handleConstantChange(idx, e.target.value)}
                      className="w-full bg-transparent border-b border-slate-800 focus:border-indigo-500 focus:outline-none px-1 py-0.5 text-xs text-white placeholder-slate-600 transition-colors"
                      placeholder="e.g. g = 9.8 m/s²"
                    />
                    <button 
                      onClick={() => handleDeleteConstant(idx)} 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete constant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {constants.length === 0 && (
                  <p className="text-slate-500 text-xs italic">No constants defined. Click "Add Constant" to create one.</p>
                )}
              </div>
            </div>

            {/* Difficulty distribution sliders/inputs */}
            <div className="space-y-4 pt-4 border-t border-slate-900">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Difficulty Distribution (Sum must equal 100%)</label>
                <span className={`text-xs font-bold ${easyPercent + mediumPercent + hardPercent === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Sum: {easyPercent + mediumPercent + hardPercent}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Easy %</span>
                  <input
                    type="number"
                    value={easyPercent}
                    onChange={(e) => setEasyPercent(Number(e.target.value))}
                    max={100}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Medium %</span>
                  <input
                    type="number"
                    value={mediumPercent}
                    onChange={(e) => setMediumPercent(Number(e.target.value))}
                    max={100}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Hard %</span>
                  <input
                    type="number"
                    value={hardPercent}
                    onChange={(e) => setHardPercent(Number(e.target.value))}
                    max={100}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex justify-between items-center pt-8 border-t border-slate-900 mt-8">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && (!selectedBoard || !selectedClass || !selectedSubject)) ||
                (step === 2 && selectedChapters.length === 0)
              }
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating Exam Set...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Run AI Generator
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
