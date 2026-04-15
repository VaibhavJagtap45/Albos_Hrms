'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CheckCircle2,
  Fingerprint,
  IdCard,
  MailOpen,
  Send,
} from 'lucide-react';
import { authAPI } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  // Dev-only: backend returns the reset URL when SMTP is not configured
  const [devUrl, setDevUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) {
      toast.error('Please enter your email or employee ID.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await authAPI.forgotPassword(id);
      setSent(true);
      // Surface the dev reset URL when SMTP is not configured
      if (data._dev_resetUrl) {
        setDevUrl(data._dev_resetUrl);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

            {sent ? (
              /* ── Success state ─────────────────────────────── */
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/25">
                  {devUrl ? (
                    <MailOpen className="h-8 w-8 text-green-400" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  )}
                </div>
                <h2 className="font-display text-2xl font-bold text-white">
                  {devUrl ? 'Dev Mode — No Email Sent' : 'Check your inbox'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  {devUrl
                    ? 'SMTP is not configured. Use the link below to reset the password directly.'
                    : `If an account with that email or employee ID exists, we've sent a reset link. Check your inbox and spam folder.`}
                </p>

                {/* Dev-only reset link */}
                {devUrl && (
                  <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-left">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Dev Reset Link
                    </p>
                    <Link
                      href={devUrl}
                      className="break-all text-xs text-amber-300 underline underline-offset-2 hover:text-amber-200"
                    >
                      {devUrl}
                    </Link>
                  </div>
                )}

                <p className="mt-5 text-xs text-white/35">
                  The link expires in <span className="font-semibold text-white/55">1 hour</span>.
                </p>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => { setSent(false); setIdentifier(''); setDevUrl(null); }}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 text-sm text-white/70 transition hover:bg-white/10"
                  >
                    Try a different account
                  </button>
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-500"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              /* ── Request form ──────────────────────────────── */
              <>
                <div className="mb-7">
                  <p className="text-sm uppercase tracking-[0.22em] text-white/45">Account Recovery</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-white">Forgot password?</h2>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Enter the email address or employee ID linked to your account. We'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">
                      Email or Employee ID
                    </label>
                    <div className="relative">
                      <IdCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="hr@albostech.com or ALB001"
                        autoComplete="username"
                        autoFocus
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-11 py-3.5 text-sm text-white placeholder:text-white/25 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Reset Link
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-sm text-white/45 transition hover:text-white/75"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
