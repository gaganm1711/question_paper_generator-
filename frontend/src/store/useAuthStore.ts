import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => void;
}

// Bypassed local authentication store - always returns pre-authenticated user
export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: 1,
    name: "Educator",
    email: "teacher@local.com",
    role: "admin"
  },
  token: "mock-token",
  loading: false,
  error: null,
  
  initialize: () => {
    // Session is pre-initialized
  },

  login: async () => {
    return true;
  },

  register: async () => {
    return true;
  },

  logout: () => {
    // No-op for local open platform
  },
}));
