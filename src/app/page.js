'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50">
      <div className="glass-card flex flex-col items-center gap-4 px-10 py-12">
        <div className="h-10 w-10 rounded-full border-[3px] border-brand-600 border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="font-display text-lg font-bold text-gray-900">Launching HRMS</p>
          <p className="mt-1 text-sm text-surface-400">Preparing your workspace</p>
        </div>
      </div>
    </div>
  );
}
