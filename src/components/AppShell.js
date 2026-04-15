'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function AppShell({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    if (!loading && user && user.mustChangePassword && pathname !== '/change-password') {
      router.replace('/change-password');
    }
    if (!loading && user && requiredRole && user.role !== requiredRole) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, requiredRole, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-surface-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f5f3ff]">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="sticky top-0 z-30 border-b border-surface-200 bg-white/80 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-200 text-surface-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-[11px] uppercase tracking-wider text-surface-400">{user.role}</p>
          </div>
        </div>
      </div>
      <main className="px-4 py-5 lg:ml-[280px] lg:p-8">
        {children}
      </main>
    </div>
  );
}
