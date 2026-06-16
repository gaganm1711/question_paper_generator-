'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, BookOpen, Layers, Settings, User, FileText, BookMarked } from 'lucide-react';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const { user, token, logout, initialize } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Check if we are on landing, login or register
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/register';

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#03040c] text-white">
      {/* Sticky Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              MS
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">MSB Generator</h1>
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">AI Platform</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname === '/dashboard'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.1)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Layers className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            href="/generate"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname === '/generate'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.1)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Generate Paper
          </Link>
          <Link
            href="/question-bank"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname === '/question-bank'
                ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_-3px_rgba(168,85,247,0.1)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BookMarked className="w-5 h-5" />
            Question Bank
          </Link>
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname === '/admin'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.1)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            Admin Panel
          </Link>
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-white/[0.01]">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-slate-200">{user?.name || 'Teacher'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-slate-400 text-xs font-medium transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 overflow-y-auto px-10 py-8">
        {children}
      </main>
    </div>
  );
}
