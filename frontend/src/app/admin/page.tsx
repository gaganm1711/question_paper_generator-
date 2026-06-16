'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePaperStore } from '@/store/usePaperStore';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { 
  Loader2, Settings, Upload, Database, Plus, Check, Info,
  AlertCircle
} from 'lucide-react';

export default function AdminPanel() {
  const { token } = useAuthStore();
  const { 
    boards, classes, subjects, chapters,
    fetchBoards, fetchClasses, fetchSubjects, fetchChapters,
    triggerDatabaseSeed, uploadOCR, actionLoading 
  } = usePaperStore();
  
  const router = useRouter();

  // Seeding Alerts
  const [seedMessage, setSeedMessage] = useState('');
  const [seedError, setSeedError] = useState('');

  // OCR Upload States
  const [ocrBoard, setOcrBoard] = useState<number | ''>('');
  const [ocrClass, setOcrClass] = useState<number | ''>('');
  const [ocrSubject, setOcrSubject] = useState<number | ''>('');
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrError, setOcrError] = useState('');

  // Manual Question Creator States
  const [mqBoard, setMqBoard] = useState<number | ''>('');
  const [mqClass, setMqClass] = useState<number | ''>('');
  const [mqSubject, setMqSubject] = useState<number | ''>('');
  const [mqChapter, setMqChapter] = useState<number | ''>('');
  const [mqText, setMqText] = useState('');
  const [mqAnswer, setMqAnswer] = useState('');
  const [mqMarks, setMqMarks] = useState<number>(2);
  const [mqDifficulty, setMqDifficulty] = useState('medium');
  const [mqType, setMqType] = useState('Short Answer');
  const [mqMessage, setMqMessage] = useState('');
  const [mqError, setMqError] = useState('');

  useEffect(() => {
    if (!token && !localStorage.getItem('token')) {
      router.push('/login');
    } else {
      fetchBoards();
    }
  }, [token, router, fetchBoards]);

  // Seeder Action
  const handleSeed = async () => {
    setSeedMessage('');
    setSeedError('');
    const res = await triggerDatabaseSeed();
    if (res.success) {
      setSeedMessage(res.message);
      // Reload boards
      fetchBoards();
    } else {
      setSeedError(res.message);
    }
  };

  // OCR Upload Action
  const handleOcrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcrMessage('');
    setOcrError('');
    if (!ocrBoard || !ocrClass || !ocrSubject || !ocrFile) {
      setOcrError('Please fill out all academic metadata and select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('board_id', String(ocrBoard));
    formData.append('class_id', String(ocrClass));
    formData.append('subject_id', String(ocrSubject));
    formData.append('file', ocrFile);

    const res = await uploadOCR(formData);
    if (res.success) {
      setOcrMessage(`Successfully extracted and stored ${res.questions_count} questions from PDF!`);
      setOcrFile(null);
      // Clear file input
      const fileInput = document.getElementById('ocr-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      setOcrError(res.message);
    }
  };

  // Manual Question Creation
  const handleManualQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMqMessage('');
    setMqError('');
    
    if (!mqBoard || !mqClass || !mqSubject || !mqChapter || !mqText || !mqAnswer) {
      setMqError('Please complete all form fields.');
      return;
    }

    try {
      await api.post('/questions/', {
        question_text: mqText,
        answer_text: mqAnswer,
        marks: mqMarks,
        difficulty: mqDifficulty,
        question_type: mqType,
        board_id: Number(mqBoard),
        class_id: Number(mqClass),
        subject_id: Number(mqSubject),
        chapter_id: Number(mqChapter)
      });

      setMqMessage('Question added successfully to the database bank!');
      setMqText('');
      setMqAnswer('');
    } catch (err: any) {
      setMqError(err.response?.data?.detail || 'Failed to save question.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5.5 h-5.5 text-indigo-400" /> Admin Control Panel
        </h2>
        <p className="text-slate-400 text-xs mt-1">Manage boards, seed mock question datasets, and parse raw question banks using OCR.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Seeder & OCR */}
        <div className="space-y-8">
          
          {/* Seeder Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-indigo-400" /> Question Dataset Seeder
            </h3>
            <p className="text-slate-400 text-xs leading-normal">
              If your database is completely empty and you don&apos;t have any starting question paper datasets, click below to auto-seed Maharashtra Board Class 10 Science chapters and standard questions with pre-compiled 384-dimensional vector embeddings.
            </p>
            
            {seedMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center gap-2">
                <Check className="w-4 h-4" /> {seedMessage}
              </div>
            )}
            {seedError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {seedError}
              </div>
            )}

            <button
              onClick={handleSeed}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Seed Science Dataset
            </button>
          </div>

          {/* OCR Card */}
          <form onSubmit={handleOcrSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4.5 h-4.5 text-purple-400" /> OCR PDF Upload & Extraction
            </h3>
            <p className="text-slate-400 text-xs leading-normal">
              Upload a scanned PDF or question sheet. The system will perform text extraction, parse distinct questions with Gemini, categorize chapters, and save them.
            </p>

            {ocrMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                {ocrMessage}
              </div>
            )}
            {ocrError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
                {ocrError}
              </div>
            )}

            <div className="space-y-3">
              <select
                value={ocrBoard}
                onChange={(e) => {
                  setOcrBoard(Number(e.target.value));
                  fetchClasses(Number(e.target.value));
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
              >
                <option value="" disabled>Select Board</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.board_name}</option>)}
              </select>

              <select
                disabled={!ocrBoard}
                value={ocrClass}
                onChange={(e) => {
                  setOcrClass(Number(e.target.value));
                  fetchSubjects(Number(e.target.value));
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
              >
                <option value="" disabled>Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>

              <select
                disabled={!ocrClass}
                value={ocrSubject}
                onChange={(e) => setOcrSubject(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
              >
                <option value="" disabled>Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>

              <div className="border border-dashed border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-900/10 hover:bg-slate-900/20 transition-all relative">
                <Upload className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-[11px] text-slate-400 font-semibold mb-1">
                  {ocrFile ? ocrFile.name : 'Choose printable question PDF/Image'}
                </span>
                <span className="text-[9px] text-slate-500">Max size: 10MB</span>
                <input
                  id="ocr-file-input"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading || !ocrFile}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Run OCR Extraction
            </button>
          </form>

        </div>

        {/* Right Side: Manual Question Adder */}
        <form onSubmit={handleManualQuestionSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4.5 h-4.5 text-pink-400" /> Add Question Manually
          </h3>

          {mqMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              {mqMessage}
            </div>
          )}
          {mqError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
              {mqError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <select
              value={mqBoard}
              onChange={(e) => {
                setMqBoard(Number(e.target.value));
                fetchClasses(Number(e.target.value));
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
            >
              <option value="" disabled>Select Board</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.board_name}</option>)}
            </select>

            <select
              disabled={!mqBoard}
              value={mqClass}
              onChange={(e) => {
                setMqClass(Number(e.target.value));
                fetchSubjects(Number(e.target.value));
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
            >
              <option value="" disabled>Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>

            <select
              disabled={!mqClass}
              value={mqSubject}
              onChange={(e) => {
                setMqSubject(Number(e.target.value));
                fetchChapters(Number(e.target.value));
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white col-span-2"
            >
              <option value="" disabled>Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>

            <select
              disabled={!mqSubject}
              value={mqChapter}
              onChange={(e) => setMqChapter(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white col-span-2"
            >
              <option value="" disabled>Select Chapter</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.chapter_name}</option>)}
            </select>

            <div>
              <span className="text-[10px] text-slate-400 font-semibold mb-1 block">Marks</span>
              <input
                type="number"
                value={mqMarks}
                onChange={(e) => setMqMarks(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-semibold mb-1 block">Difficulty</span>
              <select
                value={mqDifficulty}
                onChange={(e) => setMqDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">Question Type</span>
            <input
              type="text"
              value={mqType}
              onChange={(e) => setMqType(e.target.value)}
              placeholder="e.g. MCQ, Short Answer, HOTS"
              className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">Question Text</span>
            <textarea
              required
              rows={3}
              value={mqText}
              onChange={(e) => setMqText(e.target.value)}
              placeholder="Enter question text here..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">Model Answer</span>
            <textarea
              required
              rows={3}
              value={mqAnswer}
              onChange={(e) => setMqAnswer(e.target.value)}
              placeholder="Enter model answer here..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Save to Question Bank
          </button>
        </form>

      </div>
    </div>
  );
}
