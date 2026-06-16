'use client';

import { useEffect, useState, use } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePaperStore } from '@/store/usePaperStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import { 
  Loader2, ArrowLeft, Download, ZoomIn, ZoomOut, 
  Settings, Check, Sparkles, Plus, Trash2, Edit3, Calendar
} from 'lucide-react';

export default function PaperPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { token } = useAuthStore();
  const { activePaper, fetchPaperDetails, loading } = usePaperStore();
  const router = useRouter();

  const [activeSet, setActiveSet] = useState<string>('A');
  const [docMode, setDocMode] = useState<'questions' | 'answers'>('questions');
  const [downloading, setDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Live editing states
  const [localPaperJson, setLocalPaperJson] = useState<any>(null);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [regeneratingQId, setRegeneratingQId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ sIdx: number, qIdx: number, question: any } | null>(null);

  useEffect(() => {
    if (!token && !localStorage.getItem('token')) {
      router.push('/login');
    } else {
      fetchPaperDetails(id);
    }
  }, [token, id, router, fetchPaperDetails]);

  // Set default active set when paper loads, and copy JSON for local edits
  useEffect(() => {
    if (activePaper?.paper_json) {
      setLocalPaperJson(JSON.parse(JSON.stringify(activePaper.paper_json)));
      
      const sets = Object.keys(activePaper.paper_json.sets || {});
      if (sets.length > 0 && !sets.includes(activeSet)) {
        setActiveSet(sets[0]);
      }
    }
  }, [activePaper, activeSet]);

  if (loading || !activePaper || !localPaperJson) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-slate-400 text-xs font-semibold">Loading paper configuration...</p>
      </div>
    );
  }

  const paperJson = localPaperJson;
  const setsList = Object.keys(paperJson.sets || {});
  const activeSetData = paperJson.sets?.[activeSet] || {};
  const activeSections = activeSetData.sections || [];
  
  // Model Answers map
  const answersList = paperJson.answer_key?.[activeSet] || [];
  const answersMap = new Map(answersList.map((ans: any) => [ans.id, ans]));

  // Live editing handlers
  const updateMetadata = (key: string, value: any) => {
    const updated = { ...localPaperJson, [key]: value };
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleInstructionChange = (idx: number, val: string) => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    updated.instructions[idx] = val;
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleAddInstruction = () => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    if (!updated.instructions) updated.instructions = [];
    updated.instructions.push("New candidate instruction.");
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleDeleteInstruction = (idx: number) => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    updated.instructions.splice(idx, 1);
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleConstantChange = (idx: number, val: string) => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    if (!updated.constants) updated.constants = [];
    updated.constants[idx] = val;
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleAddConstant = () => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    if (!updated.constants) updated.constants = [];
    updated.constants.push("Constant = Value");
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleDeleteConstant = (idx: number) => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    updated.constants.splice(idx, 1);
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleQuestionTextChange = (sIdx: number, qIdx: number, val: string) => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    updated.sets[activeSet].sections[sIdx].questions[qIdx].question_text = val;
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleOptionChange = (sIdx: number, qIdx: number, optIdx: number, val: string) => {
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    updated.sets[activeSet].sections[sIdx].questions[qIdx].options[optIdx] = val;
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleQuestionDelete = (sIdx: number, qIdx: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    const deletedQ = updated.sets[activeSet].sections[sIdx].questions.splice(qIdx, 1)[0];
    
    // remove from answer key too
    const ansKey = updated.answer_key?.[activeSet] || [];
    if (updated.answer_key) {
      updated.answer_key[activeSet] = ansKey.filter((ans: any) => ans.id !== deletedQ.id);
    }
    setLocalPaperJson(updated);
    setIsModified(true);
  };

  const handleRegenerateQuestion = async (sIdx: number, qId: string) => {
    setRegeneratingQId(qId);
    try {
      const res = await api.post(`/papers/${id}/regenerate-question`, {
        set_char: activeSet,
        section_idx: sIdx,
        question_id: qId
      });
      const updatedPaper = res.data;
      setLocalPaperJson(updatedPaper.paper_json);
      // sync with store
      usePaperStore.getState().activePaper = updatedPaper;
      alert("Question replaced with fresh AI generation!");
    } catch (err) {
      console.error(err);
      alert("Failed to regenerate question. Please try again.");
    } finally {
      setRegeneratingQId(null);
    }
  };

  const handleRegenerateInModal = async () => {
    if (!editingQuestion) return;
    setRegeneratingQId(editingQuestion.question.id);
    try {
      const res = await api.post(`/papers/${id}/regenerate-question`, {
        set_char: activeSet,
        section_idx: editingQuestion.sIdx,
        question_id: editingQuestion.question.id
      });
      const updatedPaper = res.data;
      setLocalPaperJson(updatedPaper.paper_json);
      usePaperStore.getState().activePaper = updatedPaper;
      
      const newQ = updatedPaper.paper_json.sets[activeSet].sections[editingQuestion.sIdx].questions.find((q: any) => q.id === editingQuestion.question.id);
      if (newQ) {
        setEditingQuestion({
          ...editingQuestion,
          question: JSON.parse(JSON.stringify(newQ))
        });
      }
      alert("Question replaced with fresh AI generation!");
    } catch (err) {
      console.error(err);
      alert("Failed to regenerate question. Please try again.");
    } finally {
      setRegeneratingQId(null);
    }
  };

  const handleSaveFromModal = () => {
    if (!editingQuestion) return;
    const updated = JSON.parse(JSON.stringify(localPaperJson));
    updated.sets[activeSet].sections[editingQuestion.sIdx].questions[editingQuestion.qIdx] = editingQuestion.question;
    setLocalPaperJson(updated);
    setIsModified(true);
    setEditingQuestion(null);
  };

  const handleSavePaper = async () => {
    try {
      const res = await api.put(`/papers/${id}`, localPaperJson);
      usePaperStore.getState().activePaper = res.data;
      setIsModified(false);
      alert("Paper saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Auto-save changes first if there are any pending edits
      if (isModified) {
        const saveRes = await api.put(`/papers/${id}`, localPaperJson);
        usePaperStore.getState().activePaper = saveRes.data;
        setIsModified(false);
      }

      const res = await api.get(`/papers/${id}/pdf`, {
        params: {
          set_char: activeSet,
          include_answers: docMode === 'answers',
        },
        responseType: 'blob',
      });
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from disposition header
      const disposition = res.headers['content-disposition'];
      let filename = `${paperJson.class_name}_${paperJson.subject}_Set_${activeSet}.pdf`;
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/['"]/g, '').trim();
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate and download PDF. Make sure your local node backend is running.');
    } finally {
      setDownloading(false);
    }
  };

  // Format Time Limit Helper
  const formatTime = (mins: number) => {
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return rem === 0 ? `${hrs}:00 hr` : `${hrs}:${rem.toString().padStart(2, '0')} hr`;
    }
    return `${mins} Mins`;
  };

  // Clean Class name Helper
  const cleanClass = (name: string) => {
    if (name.includes('10')) return '10th';
    if (name.includes('9')) return '9th';
    if (name.includes('8')) return '8th';
    if (name.includes('11')) return '11th';
    if (name.includes('12')) return '12th';
    return name;
  };

  // Clean leading numbers from instructions
  const cleanInstructionText = (text: string) => {
    return text.replace(/^\s*\d+[\.\)]\s*/, '');
  };

  return (
    <div className="space-y-8">
      {/* Top action controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">{activePaper.paper_name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">Toggle sets, edit questions, regenerate layout, and export PDF.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Zoom controls */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/10 p-1">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(80, prev - 10))}
              className="p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-slate-300 w-12 text-center">{zoomLevel}%</span>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              className="p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Edit Mode Toggle Button */}
          <button
            onClick={() => setIsEditMode(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isEditMode 
                ? 'bg-amber-600/10 border-amber-500/30 text-amber-400 hover:bg-amber-600/20' 
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            <Settings className="w-4 h-4" /> {isEditMode ? 'Exit Edit Mode' : 'Edit Paper'}
          </button>

          {/* Save Paper changes button */}
          {isModified && (
            <button
              onClick={handleSavePaper}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" /> Save Paper
            </button>
          )}

          {/* Set selector buttons */}
          {setsList.length > 1 && (
            <div className="flex rounded-xl border border-slate-800 bg-slate-900/10 p-1">
              {setsList.map(set_char => (
                <button
                  key={set_char}
                  onClick={() => setActiveSet(set_char)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeSet === set_char 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Set {set_char}
                </button>
              ))}
            </div>
          )}

          {/* Mode Selector (Questions vs Answer Key) */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/10 p-1">
            <button
              onClick={() => setDocMode('questions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docMode === 'questions' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Question Paper
            </button>
            <button
              onClick={() => setDocMode('answers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docMode === 'answers' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Answer Key
            </button>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-55"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Rendering PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download Printable PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Preview Paper Layout (A4 styled layout container) */}
      <div className="flex justify-center overflow-x-auto p-4 bg-slate-950/40 border border-slate-900 rounded-3xl">
        <div 
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', width: '800px' }}
          className="bg-white text-black p-12 shadow-2xl min-h-[1130px] border border-slate-300 rounded-lg flex flex-col justify-between shrink-0 font-[Times_New_Roman]"
        >
          <div className="relative">
            {/* Watermark element */}
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[50px] font-bold text-slate-300/15 uppercase tracking-widest pointer-events-none select-none z-0">
              {activeSet} - {docMode === 'answers' ? 'ANSWERS' : 'CONFIDENTIAL'}
            </div>

            {/* Header Box */}
            <div className="border-[1.5px] border-black p-3 mb-6 relative z-10">
              {isEditMode ? (
                <input
                  type="text"
                  value={paperJson.school_name || ''}
                  onChange={(e) => updateMetadata('school_name', e.target.value)}
                  className="w-full text-center border border-slate-300 focus:outline-none focus:border-indigo-500 font-bold uppercase text-base text-black bg-slate-50 p-1 rounded font-serif mb-2"
                  placeholder="COACHING INSTITUTE / SCHOOL NAME"
                />
              ) : (
                <h1 className="text-base font-extrabold uppercase tracking-tight text-center m-0 mb-2 font-serif">
                  {paperJson.school_name} {docMode === 'answers' && '(Answer Key)'}
                </h1>
              )}

              {/* Metadata rows */}
              <div className="grid grid-cols-2 gap-x-6 text-xs space-y-1 font-serif text-black mt-2">
                <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-1">
                  <span><strong>Sub:-</strong></span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={paperJson.subject || ''}
                      onChange={(e) => updateMetadata('subject', e.target.value)}
                      className="border-b border-indigo-400 focus:border-indigo-600 focus:outline-none px-1 text-xs text-black bg-slate-50/70 font-serif text-right w-36"
                    />
                  ) : (
                    <span>{paperJson.subject}</span>
                  )}
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-1">
                  <span><strong>Class:-</strong></span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={paperJson.class_name || ''}
                      onChange={(e) => updateMetadata('class_name', e.target.value)}
                      className="border-b border-indigo-400 focus:border-indigo-600 focus:outline-none px-1 text-xs text-black bg-slate-50/70 font-serif text-right w-24"
                    />
                  ) : (
                    <span>{cleanClass(paperJson.class_name)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-1 mt-1">
                  <span><strong>Date:-</strong></span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={paperJson.date || '29/12/24'}
                      onChange={(e) => updateMetadata('date', e.target.value)}
                      className="border-b border-indigo-400 focus:border-indigo-600 focus:outline-none px-1 text-xs text-black bg-slate-50/70 font-serif text-right w-24"
                    />
                  ) : (
                    <span>{paperJson.date || '29/12/24'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-1 mt-1">
                  <span><strong>Marks:-</strong></span>
                  {isEditMode ? (
                    <input
                      type="number"
                      value={paperJson.total_marks || 20}
                      onChange={(e) => updateMetadata('total_marks', Number(e.target.value))}
                      className="border-b border-indigo-400 focus:border-indigo-600 focus:outline-none px-1 text-xs text-black bg-slate-50/70 font-serif text-right w-16"
                    />
                  ) : (
                    <span>{paperJson.total_marks}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1 pt-1 col-span-2 sm:col-span-1 border-b border-dashed border-slate-300 sm:border-0 pb-1 sm:pb-0 font-serif">
                  <span><strong>Topic:-</strong></span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={paperJson.topic || paperJson.paper_name || ''}
                      onChange={(e) => updateMetadata('topic', e.target.value)}
                      className="border-b border-indigo-400 focus:border-indigo-600 focus:outline-none px-1 text-xs text-black bg-slate-50/70 font-serif text-right w-48"
                    />
                  ) : (
                    <span>{paperJson.topic || (paperJson.paper_name.includes('(') ? paperJson.paper_name.split('(')[1].replace(')', '') : paperJson.subject)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1 pt-1 col-span-2 sm:col-span-1 font-serif">
                  <span><strong>Time:-</strong></span>
                  {isEditMode ? (
                    <input
                      type="number"
                      value={paperJson.time_allowed_minutes || 60}
                      onChange={(e) => updateMetadata('time_allowed_minutes', Number(e.target.value))}
                      className="border-b border-indigo-400 focus:border-indigo-600 focus:outline-none px-1 text-xs text-black bg-slate-50/70 font-serif text-right w-16"
                    />
                  ) : (
                    <span>{formatTime(paperJson.time_allowed_minutes)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Candidate Instructions & Constants Box */}
            {(isEditMode || (paperJson.instructions && paperJson.instructions.length > 0) || (paperJson.constants && paperJson.constants.length > 0)) && (
              <div className="border border-black p-4 text-xs mb-6 font-serif relative z-10 bg-white shadow-sm rounded-md">
                {/* Instructions list */}
                {(isEditMode || (paperJson.instructions && paperJson.instructions.length > 0)) && (
                  <div className="mb-4">
                    <div className="font-bold mb-2 flex justify-between items-center text-black border-b border-black/10 pb-1">
                      <span className="uppercase tracking-wider text-[11px]">Instructions to the Candidates:</span>
                      {isEditMode && (
                        <button 
                          onClick={handleAddInstruction}
                          className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 font-sans transition-colors border border-indigo-200"
                        >
                          <Plus className="w-3 h-3" /> Add Instruction
                        </button>
                      )}
                    </div>
                    
                    {isEditMode ? (
                      <div className="space-y-2 font-serif">
                        {(paperJson.instructions || []).map((inst: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50/70 border border-slate-200/60 p-1.5 rounded-lg">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold font-sans shrink-0">
                              {idx + 1}
                            </span>
                            <input 
                              type="text" 
                              value={cleanInstructionText(inst)} 
                              onChange={(e) => handleInstructionChange(idx, e.target.value)}
                              className="w-full border-b border-slate-200 focus:border-indigo-500 focus:outline-none px-1.5 py-0.5 text-[11px] text-black bg-transparent font-serif transition-colors"
                            />
                            <button 
                              onClick={() => handleDeleteInstruction(idx)} 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer shrink-0"
                              title="Delete instruction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ol className="list-decimal pl-5 space-y-1.5 text-black font-serif">
                        {(paperJson.instructions || []).map((inst: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {cleanInstructionText(inst)}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* Constants list */}
                {(isEditMode || (paperJson.constants && paperJson.constants.length > 0)) && (
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
                    <div className="font-bold mb-2 flex justify-between items-center text-black border-b border-black/10 pb-1">
                      <span className="uppercase tracking-wider text-[11px]">Important Constants / Formulae:</span>
                      {isEditMode && (
                        <button 
                          onClick={handleAddConstant}
                          className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 font-sans transition-colors border border-indigo-200"
                        >
                          <Plus className="w-3 h-3" /> Add Constant
                        </button>
                      )}
                    </div>
                    
                    {isEditMode ? (
                      <div className="space-y-2 font-serif">
                        {(paperJson.constants || []).map((constItem: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50/70 border border-slate-200/60 p-1.5 rounded-lg">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-200 shrink-0" />
                            <input 
                              type="text" 
                              value={constItem} 
                              onChange={(e) => handleConstantChange(idx, e.target.value)}
                              className="w-full border-b border-slate-200 focus:border-indigo-500 focus:outline-none px-1.5 py-0.5 text-[11px] text-black bg-transparent font-serif transition-colors"
                            />
                            <button 
                              onClick={() => handleDeleteConstant(idx)} 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer shrink-0"
                              title="Delete constant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="list-disc pl-5 space-y-1.5 text-black font-serif">
                        {(paperJson.constants || []).map((constItem: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {constItem}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Questions list */}
            {activeSections.map((section: any, sIdx: number) => {
              const mainQNum = sIdx + 1;
              const subLabels = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
              const secQuestions = section.questions || [];
              const firstQ = secQuestions[0];
              const qMarks = firstQ?.marks || 1;
              const secTotalMarks = secQuestions.length * qMarks;
              
              // Calculate section choice string
              let choiceText = "";
              let solveMarks = secTotalMarks;
              if (qMarks === 2 && secQuestions.length >= 3) {
                choiceText = " (Any Two)";
                solveMarks = 4;
              } else if (qMarks === 3 && secQuestions.length >= 3) {
                choiceText = " (Any Two)";
                solveMarks = 6;
              } else if (qMarks === 4 && secQuestions.length >= 2) {
                choiceText = " (Any One)";
                solveMarks = 4;
              } else if (qMarks === 5 && secQuestions.length >= 2) {
                choiceText = " (Any One)";
                solveMarks = 5;
              }

              // Mapping custom descriptive labels
              let sectionTitle = "Answer the following:-";
              if (qMarks === 1) sectionTitle = "Answer in One words:-";
              else if (qMarks === 2) sectionTitle = "Answer in very short :-";
              else if (qMarks === 3) sectionTitle = "Answer in short:-";
              else if (qMarks >= 4) sectionTitle = "Answer in long:-";

              return (
                <div key={sIdx} className="mb-6 relative z-10 font-serif">
                  <div className="flex justify-between items-center font-bold text-xs border-b border-black pb-1 uppercase tracking-wide mb-3 text-black font-serif">
                    <span>Q.{mainQNum}. {sectionTitle}{choiceText}</span>
                    <span>[{solveMarks}]</span>
                  </div>

                  <div className="space-y-4">
                    {secQuestions.map((q: any, qIdx: number) => {
                      const ans = answersMap.get(q.id) as any;
                      const subLabel = subLabels[qIdx % subLabels.length];
                      
                      return (
                        <div key={q.id} className="text-xs flex justify-between items-start gap-4 font-serif text-black border-b border-dashed border-transparent hover:border-slate-100 p-1.5 rounded-lg transition-colors">
                          <div className="w-full space-y-1">
                            <p className="m-0 leading-relaxed text-black font-serif">
                              <strong>{subLabel})</strong> {q.question_text}
                            </p>
                            
                            {/* MCQ Choices grid */}
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 pl-4 pt-1 text-[11px] text-black/90 font-serif">
                                {q.options.map((opt: string, optIdx: number) => (
                                  <div key={optIdx}>{opt}</div>
                                ))}
                              </div>
                            )}

                            {/* Selective Actions under each question when Edit Mode is active */}
                            {isEditMode && (
                              <div className="flex gap-2.5 mt-2 pt-1.5 border-t border-dashed border-slate-200 print:hidden">
                                <button
                                  onClick={() => setEditingQuestion({ sIdx, qIdx, question: JSON.parse(JSON.stringify(q)) })}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-sans font-semibold rounded-md border border-indigo-200 cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Question
                                </button>
                                <button
                                  onClick={() => handleRegenerateQuestion(sIdx, q.id)}
                                  disabled={regeneratingQId !== null}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-sans font-semibold rounded-md border border-amber-200 cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  {regeneratingQId === q.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                  Regenerate
                                </button>
                                <button
                                  onClick={() => handleQuestionDelete(sIdx, qIdx)}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-sans font-semibold rounded-md border border-red-200 cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  × Delete
                                </button>
                              </div>
                            )}
                            
                            {/* Model Answers under question */}
                            {docMode === 'answers' && ans && (
                              <div className="bg-slate-50 border-l-2 border-slate-500 pl-4 py-2 mt-2 text-[10px] space-y-1 z-10 relative font-serif">
                                <p className="font-bold text-slate-700 m-0">Model Answer:</p>
                                <p className="m-0 text-slate-900 leading-normal">{ans.model_answer}</p>
                                {ans.key_points && ans.key_points.length > 0 && (
                                  <div className="mt-1">
                                    <span className="font-bold text-slate-600">Evaluation Rubric:</span>
                                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-slate-600">
                                      {ans.key_points.map((pt: string, ptIdx: number) => (
                                        <li key={ptIdx}>{pt}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-300 pt-3 flex justify-between text-[10px] text-slate-500 font-sans z-10 relative mt-8">
            <span>{paperJson.school_name} - Exam Set {activeSet}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      {/* Question Editor Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-6 text-white font-sans">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" /> Edit Question Text & Choices
              </h3>
              <button 
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Question Statement</label>
                <textarea
                  value={editingQuestion.question.question_text || ''}
                  onChange={(e) => {
                    const updated = { ...editingQuestion };
                    updated.question.question_text = e.target.value;
                    setEditingQuestion(updated);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-serif"
                  rows={4}
                />
              </div>

              {/* MCQ Options */}
              {editingQuestion.question.options && editingQuestion.question.options.length > 0 && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-slate-400">MCQ Choices</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {editingQuestion.question.options.map((opt: string, optIdx: number) => {
                      const cleanedOpt = opt.replace(/^[a-d]\)\s*/, '');
                      const optLetter = ["a", "b", "c", "d"][optIdx];
                      return (
                        <div key={optIdx} className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-3 py-2 rounded-xl">
                          <span className="font-bold text-indigo-400 uppercase text-xs font-sans shrink-0">{optLetter})</span>
                          <input
                            type="text"
                            value={cleanedOpt}
                            onChange={(e) => {
                              const updated = { ...editingQuestion };
                              updated.question.options[optIdx] = `${optLetter}) ${e.target.value}`;
                              setEditingQuestion(updated);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none text-xs text-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center border-t border-slate-850 pt-4">
              <button
                onClick={handleRegenerateInModal}
                disabled={regeneratingQId !== null}
                className="px-3.5 py-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {regeneratingQId === editingQuestion.question.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                AI Regenerate
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFromModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
