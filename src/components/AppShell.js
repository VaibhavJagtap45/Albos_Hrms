'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import StarField from './StarField';

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
      <div className="galaxy-stage flex min-h-screen items-center justify-center px-6">
        <StarField count={220} shooterCount={4} />
        <div className="galaxy-card relative z-10 w-full max-w-sm p-8 text-center">
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/10">
              <Sparkles className="h-6 w-6 text-violet-200" />
            </div>
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200/25 border-t-violet-200" />
            <div>
              <p className="text-sm font-semibold text-white">Loading workspace</p>
              <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/45">
                Galaxy theme initializing
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="galaxy-stage relative min-h-screen overflow-x-hidden">
      {/* ── Animated star field ──────────────────────────────────────────── */}
      <StarField count={300} shooterCount={8} />

      {/* ── Ambient light blobs (depth / atmosphere) ─────────────────────── */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 1 }}>
        <div
          className="absolute left-[6%] top-12 h-80 w-80 rounded-full blur-[120px]"
          style={{ background: 'rgba(139,92,246,0.14)', animation: 'float 12s ease-in-out infinite' }}
        />
        <div
          className="absolute right-[7%] top-20 h-96 w-96 rounded-full blur-[140px]"
          style={{ background: 'rgba(99,102,241,0.10)', animation: 'float 16s ease-in-out 3s infinite' }}
        />
        <div
          className="absolute bottom-16 left-1/3 h-64 w-64 rounded-full blur-[100px]"
          style={{ background: 'rgba(217,70,239,0.08)', animation: 'float 14s ease-in-out 6s infinite' }}
        />
        <div
          className="absolute bottom-1/3 right-[12%] h-56 w-56 rounded-full blur-[90px]"
          style={{ background: 'rgba(139,92,246,0.09)', animation: 'float 18s ease-in-out 2s infinite' }}
        />
      </div>

      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="sticky top-0 z-30 px-3 pt-3 lg:hidden">
        <div className="galaxy-topbar">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 via-violet-600 to-fuchsia-600 text-white shadow-[0_14px_30px_rgba(109,40,217,0.28)]"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-brand-500">
                Galaxy Workspace
              </p>
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-brand-200/70 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-surface-500">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                {user.role}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="relative px-4 pb-8 pt-5 lg:ml-[280px] lg:px-8 lg:pb-10 lg:pt-8" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
