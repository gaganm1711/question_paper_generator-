import { create } from 'zustand';
import api from '@/services/api';

export interface Board {
  id: number;
  board_name: string;
}

export interface ClassRoom {
  id: number;
  class_name: string;
}

export interface Subject {
  id: number;
  subject_name: string;
}

export interface Chapter {
  id: number;
  chapter_name: string;
}

export interface GeneratedPaper {
  id: string;
  paper_name: string;
  paper_json: any;
  pdf_url?: string;
  created_at: string;
}

interface PaperState {
  boards: Board[];
  classes: ClassRoom[];
  subjects: Subject[];
  chapters: Chapter[];
  savedPapers: GeneratedPaper[];
  activePaper: GeneratedPaper | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;

  fetchBoards: () => Promise<void>;
  fetchClasses: (boardId: number) => Promise<void>;
  fetchSubjects: (classId: number) => Promise<void>;
  fetchChapters: (subjectId: number) => Promise<void>;
  generatePaper: (payload: {
    board_id: number;
    class_id: number;
    subject_id: number;
    chapter_ids: number[];
    total_marks?: number;
    question_breakdown?: Record<string, number>;
    easy_percent: number;
    medium_percent: number;
    hard_percent: number;
    language: string;
    num_sets: number;
    school_name: string;
    time_allowed_minutes: number;
  }) => Promise<GeneratedPaper | null>;
  fetchSavedPapers: () => Promise<void>;
  fetchPaperDetails: (paperId: string) => Promise<GeneratedPaper | null>;
  deletePaper: (paperId: string) => Promise<boolean>;
  triggerDatabaseSeed: () => Promise<{ success: boolean; message: string }>;
  uploadOCR: (formData: FormData) => Promise<{ success: boolean; questions_count?: number; message: string }>;
}

export const usePaperStore = create<PaperState>((set, get) => ({
  boards: [],
  classes: [],
  subjects: [],
  chapters: [],
  savedPapers: [],
  activePaper: null,
  loading: false,
  actionLoading: false,
  error: null,

  fetchBoards: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/academic/boards');
      set({ boards: res.data, loading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch boards.', loading: false });
    }
  },

  fetchClasses: async (boardId) => {
    set({ loading: true });
    try {
      const res = await api.get(`/academic/classes?board_id=${boardId}`);
      set({ classes: res.data, loading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch classes.', loading: false });
    }
  },

  fetchSubjects: async (classId) => {
    set({ loading: true });
    try {
      const res = await api.get(`/academic/subjects?class_id=${classId}`);
      set({ subjects: res.data, loading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch subjects.', loading: false });
    }
  },

  fetchChapters: async (subjectId) => {
    set({ loading: true });
    try {
      const res = await api.get(`/academic/chapters?subject_id=${subjectId}`);
      set({ chapters: res.data, loading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch chapters.', loading: false });
    }
  },

  generatePaper: async (payload) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await api.post('/papers/', payload);
      const newPaper = res.data;
      set((state) => ({
        savedPapers: [newPaper, ...state.savedPapers],
        activePaper: newPaper,
        actionLoading: false,
      }));
      return newPaper;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Generation failed. Make sure your Gemini API key is configured or RAG questions exist.';
      set({ error: msg, actionLoading: false });
      return null;
    }
  },

  fetchSavedPapers: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/papers/');
      set({ savedPapers: res.data, loading: false });
    } catch (err: any) {
      set({ error: 'Failed to retrieve saved papers.', loading: false });
    }
  },

  fetchPaperDetails: async (paperId) => {
    set({ loading: true });
    try {
      const res = await api.get(`/papers/${paperId}`);
      set({ activePaper: res.data, loading: false });
      return res.data;
    } catch (err: any) {
      set({ error: 'Failed to load paper details.', loading: false });
      return null;
    }
  },

  deletePaper: async (paperId) => {
    set({ actionLoading: true });
    try {
      await api.delete(`/papers/${paperId}`);
      set((state) => ({
        savedPapers: state.savedPapers.filter((p) => p.id !== paperId),
        activePaper: state.activePaper?.id === paperId ? null : state.activePaper,
        actionLoading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: 'Failed to delete paper.', actionLoading: false });
      return false;
    }
  },

  triggerDatabaseSeed: async () => {
    set({ actionLoading: true });
    try {
      const res = await api.post('/questions/seed');
      set({ actionLoading: false });
      return { success: true, message: res.data.message };
    } catch (err: any) {
      set({ actionLoading: false });
      return { success: false, message: err.response?.data?.detail || 'Seeding failed.' };
    }
  },

  uploadOCR: async (formData) => {
    set({ actionLoading: true });
    try {
      const res = await api.post('/questions/upload-ocr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      set({ actionLoading: false });
      return {
        success: true,
        questions_count: res.data.questions_count,
        message: 'Question bank parsed and imported successfully!',
      };
    } catch (err: any) {
      set({ actionLoading: false });
      return {
        success: false,
        message: err.response?.data?.detail || 'Failed to extract questions from document.',
      };
    }
  },
}));
