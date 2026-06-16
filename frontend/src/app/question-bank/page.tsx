'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePaperStore } from '@/store/usePaperStore';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  Loader2, Upload, BookOpen, Search, Filter, FileText,
  CheckCircle2, AlertCircle, Trash2, ChevronDown, X, BookMarked
} from 'lucide-react';

interface Question {
  id: number;
  question_text: string;
  answer_text: string;
  marks: number;
  difficulty: string;
  question_type: string;
  chapter_name?: string;
  created_at?: string;
}

export default function QuestionBankPage() {
  const { token } = useAuthStore();
  const {
    boards, classes, subjects, chapters,
    fetchBoards, fetchClasses, fetchSubjects, fetchChapters,
    uploadOCR, actionLoading
  } = usePaperStore();
  const router = useRouter();

  // Upload state
  const [uploadBoard, setUploadBoard] = useState<number | ''>('');
  const [uploadClass, setUploadClass] = useState<number | ''>('');
  const [uploadSubject, setUploadSubject] = useState<number | ''>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Question Bank viewer state
  const [filterBoard, setFilterBoard] = useState<number | ''>('');
  const [filterClass, setFilterClass] = useState<number | ''>('');
  const [filterSubject, setFilterSubject] = useState<number | ''>('');
  const [filterChapter, setFilterChapter] = useState<number | ''>('');
  const [searchText, setSearchText] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Separate class/subject/chapter lists for filter panel
  const [filterClasses, setFilterClasses] = useState<any[]>([]);
  const [filterSubjects, setFilterSubjects] = useState<any[]>([]);
  const [filterChapters, setFilterChapters] = useState<any[]>([]);

  useEffect(() => {
    if (!token && !localStorage.getItem('token')) {
      router.push('/login');
    } else {
      fetchBoards();
    }
  }, [token, router, fetchBoards]);

  // Load questions when filter changes
  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const params: Record<string, any> = {};
      if (filterSubject) params.subject_id = filterSubject;
      if (filterChapter) params.chapter_id = filterChapter;
      const res = await api.get('/questions/', { params });
      let qs: Question[] = res.data;
      // Client-side text search
      if (searchText.trim()) {
        const lower = searchText.toLowerCase();
        qs = qs.filter(q => q.question_text.toLowerCase().includes(lower));
      }
      setQuestions(qs);
      setTotalCount(qs.length);
    } catch (e) {
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [filterSubject, filterChapter, searchText]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Upload handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setUploadFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadMessage('');
    setUploadError('');
    if (!uploadBoard || !uploadClass || !uploadSubject || !uploadFile) {
      setUploadError('Please select Board, Class, Subject and a file.');
      return;
    }
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('board_id', String(uploadBoard));
    formData.append('class_id', String(uploadClass));
    formData.append('subject_id', String(uploadSubject));
    formData.append('file', uploadFile);
    try {
      const res = await uploadOCR(formData);
      if (res.success) {
        setUploadMessage(`✅ ${res.questions_count} questions extracted and saved to question bank!`);
        setUploadFile(null);
        loadQuestions();
      } else {
        setUploadError(res.message || 'Upload failed.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (d === 'hard') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <BookMarked className="w-6 h-6 text-purple-400" /> Question Bank
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Upload any PDF question paper or question sheet — Gemini AI will extract and save all questions automatically.
        </p>
      </div>

      {/* Upload Section */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-purple-400" /> Upload Question Paper / Question Bank PDF
        </h3>
        <p className="text-slate-400 text-xs">
          Supports any format: printed question papers, handwritten (scanned), chapter-wise question banks, previous year papers. Gemini will extract all questions automatically.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Board / Class / Subject selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={uploadBoard}
              onChange={e => {
                setUploadBoard(Number(e.target.value));
                fetchClasses(Number(e.target.value));
                setUploadClass(''); setUploadSubject('');
              }}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-xs text-white"
            >
              <option value="" disabled>Select Board</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.board_name}</option>)}
            </select>

            <select
              disabled={!uploadBoard}
              value={uploadClass}
              onChange={e => {
                setUploadClass(Number(e.target.value));
                fetchSubjects(Number(e.target.value));
                setUploadSubject('');
              }}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-xs text-white disabled:opacity-40"
            >
              <option value="" disabled>Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>

            <select
              disabled={!uploadClass}
              value={uploadSubject}
              onChange={e => setUploadSubject(Number(e.target.value))}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-xs text-white disabled:opacity-40"
            >
              <option value="" disabled>Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
              ${dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 bg-slate-900/20 hover:border-purple-500/50 hover:bg-purple-500/5'}`}
          >
            <input
              id="qb-file-input"
              type="file"
              accept="application/pdf,image/*"
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {uploadFile ? (
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-sm font-semibold text-white">{uploadFile.name}</p>
                  <p className="text-xs text-slate-400">{(uploadFile.size / 1024).toFixed(1)} KB — ready to upload</p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setUploadFile(null); }}
                  className="ml-2 p-1 rounded-full hover:bg-slate-700 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-white">Drag & drop your PDF here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse — PDF, JPG, PNG accepted</p>
                <p className="text-[11px] text-slate-500 mt-2">Any question paper format works. Gemini AI will parse everything.</p>
              </>
            )}
          </div>

          {/* Alerts */}
          {uploadMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {uploadMessage}
            </div>
          )}
          {uploadError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
            </div>
          )}

          <button
            type="submit"
            disabled={uploadLoading || !uploadFile || !uploadSubject}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
          >
            {uploadLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting questions with Gemini AI...</>
              : <><Upload className="w-4 h-4" /> Extract & Save to Question Bank</>}
          </button>
        </form>
      </div>

      {/* Question Bank Viewer */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" /> Saved Question Bank
            <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
              {totalCount} questions
            </span>
          </h3>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={filterSubject}
            onChange={async e => {
              const val = Number(e.target.value) || '';
              setFilterSubject(val as number | '');
              setFilterChapter('');
              if (val) {
                const res = await api.get(`/academic/chapters?subject_id=${val}`);
                setFilterChapters(res.data);
              }
            }}
            className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-xs text-white"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>

          <select
            disabled={!filterSubject}
            value={filterChapter}
            onChange={e => setFilterChapter(Number(e.target.value) || '')}
            className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-xs text-white disabled:opacity-40"
          >
            <option value="">All Chapters</option>
            {filterChapters.map((ch: any) => <option key={ch.id} value={ch.id}>{ch.chapter_name}</option>)}
          </select>
        </div>

        {/* Questions List */}
        {loadingQuestions ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No questions found.</p>
            <p className="text-xs mt-1">Upload a PDF above to populate the question bank.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden"
              >
                {/* Question Row */}
                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-800/30 transition-colors"
                >
                  <span className="text-[10px] font-bold text-slate-500 mt-0.5 w-5 shrink-0">Q{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium leading-relaxed line-clamp-2">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {q.chapter_name && (
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                          {q.chapter_name}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${difficultyColor(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        {q.marks} mark{q.marks !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-slate-500">{q.question_type}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded Answer */}
                {expandedId === q.id && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/60">
                    <p className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Model Answer</p>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{q.answer_text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
