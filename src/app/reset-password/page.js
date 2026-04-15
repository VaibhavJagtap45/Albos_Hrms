'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  XCircle,
} from 'lucide-react';
import { authAPI } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Validate password strength live
  const strength = (() => {
    if (password.length === 0) return null;
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'fair';
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 'strong';
    return 'good';
  })();

  const strengthConfig = {
    weak:   { label: 'Too short', color: 'bg-red-500',    width: 'w-1/4',  text: 'text-red-400' },
    fair:   { label: 'Fair',      color: 'bg-amber-500',  width: 'w-2/4',  text: 'text-amber-400' },
    good:   { label: 'Good',      color: 'bg-blue-500',   width: 'w-3/4',  text: 'text-blue-400' },
    strong: { label: 'Strong',    color: 'bg-green-500',  width: 'w-full', text: 'text-green-400' },
  };

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Reset token is missing. Please request a new link.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Invalid / missing token ─────────────────────────── */
  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/25">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">Invalid Link</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">
          This reset link is invalid or has already been used. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  /* ── Success state ───────────────────────────────────── */
  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/25">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">Password Reset!</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Your password has been updated. Redirecting you to the sign-in page…
        </p>
        <div className="mt-2 flex justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-brand-400" />
        </div>
        <Link
          href="/login"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Sign In Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  /* ── Reset form ──────────────────────────────────────── */
  return (
    <>
      <div className="mb-7">
        <p className="text-sm uppercase tracking-[0.22em] text-white/45">Account Recovery</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-white">Set new password</h2>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Choose a strong password you haven't used before. It must be at least 6 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New password */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">
            New Password
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              autoFocus
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-11 py-3.5 pr-12 text-sm text-white placeholder:text-white/25 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strength meter */}
          {strength && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${strengthConfig[strength].color} ${strengthConfig[strength].width}`}
                />
              </div>
              <p className={`text-xs ${strengthConfig[strength].text}`}>
                {strengthConfig[strength].label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">
            Confirm Password
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              required
              className={`w-full rounded-2xl border bg-white/[0.05] px-11 py-3.5 pr-12 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-400/15 ${
                confirm && confirm !== password
                  ? 'border-red-500/50 focus:border-red-500/70'
                  : 'border-white/10 focus:border-brand-400/60'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || strength === 'weak'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              Reset Password
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-white/45 transition hover:text-white/75"
          >
            Back to Sign In
          </Link>
        </div>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-gradient)' }}>
      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur">
              <Fingerprint className="h-5 w-5 text-brand-300" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-white">HRMS</p>
              <p className="text-xs text-white/45">Albos Technology</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
            <Suspense fallback={
              <div className="flex justify-center py-12">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
