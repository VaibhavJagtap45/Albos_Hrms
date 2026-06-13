'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  IdCard,
  KeyRound,
  MailCheck,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { authAPI } from '@/lib/api';

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Wizard: 'request' -> 'otp' -> 'reset' -> 'done'
  const [step, setStep] = useState('request');

  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [verifiedToken, setVerifiedToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Dev only: shown when no mail provider is configured (backend returns the OTP)
  const [devOtp, setDevOtp] = useState(null);

  const otpRefs = useRef([]);
  const lastAutoSubmitted = useRef('');

  const code = otp.join('');
  const maskedTarget = useMemo(() => maskIdentifier(identifier), [identifier]);

  // ── Step 1: request OTP ─────────────────────────────────────────────────────
  const requestOtp = async ({ silent = false } = {}) => {
    const id = identifier.trim();
    if (!id) {
      toast.error('Please enter your email or employee ID.');
      return;
    }

    setSending(true);
    try {
      const { data } = await authAPI.sendOtp(id);

      if (data?._dev_otp) {
        // No mail provider configured — prefill the code so dev/testing can proceed.
        setDevOtp(data._dev_otp);
        setOtp(String(data._dev_otp).padEnd(OTP_LENGTH, '').slice(0, OTP_LENGTH).split(''));
      } else {
        setDevOtp(null);
      }

      setStep('otp');
      toast.success(
        silent ? 'A new code has been sent.' : 'We sent a verification code to your registered email.',
      );
      // Focus the first OTP box on the next paint
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the code. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
  const verifyOtp = async () => {
    if (code.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit code.`);
      return;
    }

    setVerifying(true);
    try {
      const { data } = await authAPI.verifyOtp(identifier.trim(), code);
      setVerifiedToken(data.verifiedToken);
      setStep('reset');
      toast.success('Code verified. Set your new password.');
    } catch (err) {
      lastAutoSubmitted.current = ''; // allow a retry for a corrected code
      setOtp(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
      toast.error(err.response?.data?.message || 'Incorrect or expired code.');
    } finally {
      setVerifying(false);
    }
  };

  // Auto-submit once all six digits are present
  useEffect(() => {
    if (
      step === 'otp' &&
      code.length === OTP_LENGTH &&
      !verifying &&
      lastAutoSubmitted.current !== code
    ) {
      lastAutoSubmitted.current = code;
      verifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  // ── Step 3: set new password ────────────────────────────────────────────────
  const submitNewPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setResetting(true);
    try {
      await authAPI.resetPasswordOtp(verifiedToken, password);
      setStep('done');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Please start over.');
    } finally {
      setResetting(false);
    }
  };

  // ── OTP input handlers ──────────────────────────────────────────────────────
  const handleOtpChange = (index, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    const next = Array(OTP_LENGTH).fill('');
    digits.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  // Password strength (matches the reset-password page)
  const strength = useMemo(() => {
    if (password.length === 0) return null;
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'fair';
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 'strong';
    return 'good';
  }, [password]);

  const strengthConfig = {
    weak: { label: 'Too short', color: 'bg-red-500', width: 'w-1/4', text: 'text-red-400' },
    fair: { label: 'Fair', color: 'bg-amber-500', width: 'w-2/4', text: 'text-amber-400' },
    good: { label: 'Good', color: 'bg-blue-500', width: 'w-3/4', text: 'text-blue-400' },
    strong: { label: 'Strong', color: 'bg-green-500', width: 'w-full', text: 'text-green-400' },
  };

  return (
    <div className="galaxy-stage min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-[-80px] h-80 w-80 rounded-full bg-fuchsia-500/[0.14] blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-indigo-500/[0.12] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600/25 ring-1 ring-brand-400/30 backdrop-blur">
              <Fingerprint className="h-5 w-5 text-brand-300" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-white">HRMS</p>
              <p className="text-xs text-white/40">Albos Technology</p>
            </div>
          </div>

          <div className="galaxy-card p-7 sm:p-8">
            {/* Step indicator */}
            {step !== 'done' && (
              <div className="relative z-10 mb-6 flex items-center gap-2">
                {['request', 'otp', 'reset'].map((s, i) => {
                  const order = ['request', 'otp', 'reset'];
                  const active = order.indexOf(step) >= i;
                  return (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        active ? 'bg-gradient-to-r from-brand-500 to-fuchsia-500' : 'bg-white/10'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* ── STEP 1: request ─────────────────────────────────────── */}
            {step === 'request' && (
              <>
                <div className="relative z-10 mb-7">
                  <span className="galaxy-badge">
                    <Sparkles className="h-3.5 w-3.5" />
                    Account Recovery
                  </span>
                  <h2 className="mt-3 font-display text-3xl font-bold text-white">Forgot password?</h2>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Enter the email address or employee ID linked to your account. We&apos;ll email you a
                    6-digit verification code.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    requestOtp();
                  }}
                  className="space-y-5"
                >
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
                    disabled={sending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Verification Code
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

                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
                      Recovery notes
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/55">
                      The code expires after 10 minutes and is only sent to the email already mapped to
                      your employee account.
                    </p>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 2: verify OTP ──────────────────────────────────── */}
            {step === 'otp' && (
              <>
                <div className="relative z-10 mb-7 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 ring-1 ring-brand-400/25">
                    <MailCheck className="h-8 w-8 text-brand-300" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">Enter verification code</h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    We sent a 6-digit code to{' '}
                    <span className="font-semibold text-white/80">{maskedTarget}</span>. Check your inbox
                    and spam folder.
                  </p>
                </div>

                {devOtp && (
                  <div className="relative z-10 mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                      Dev mode — email not configured
                    </p>
                    <p className="mt-1 text-sm text-amber-200">
                      Your code is{' '}
                      <span className="font-mono text-base font-bold tracking-widest">{devOtp}</span>
                    </p>
                  </div>
                )}

                <div className="relative z-10" onPaste={handleOtpPaste}>
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        disabled={verifying}
                        className="h-14 w-12 rounded-2xl border border-white/10 bg-white/[0.05] text-center text-xl font-bold text-white caret-brand-400 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:opacity-60 sm:h-16 sm:w-14"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={verifying || code.length !== OTP_LENGTH}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifying ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Verify Code
                      </>
                    )}
                  </button>

                  <div className="mt-5 flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('request');
                        setOtp(Array(OTP_LENGTH).fill(''));
                        lastAutoSubmitted.current = '';
                      }}
                      className="inline-flex items-center gap-1.5 text-white/45 transition hover:text-white/75"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change account
                    </button>

                    <button
                      type="button"
                      onClick={() => requestOtp({ silent: true })}
                      disabled={sending}
                      className="inline-flex items-center gap-1.5 text-brand-300 transition hover:text-brand-200 disabled:cursor-not-allowed disabled:text-white/30"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Resend code
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 3: set new password ────────────────────────────── */}
            {step === 'reset' && (
              <>
                <div className="relative z-10 mb-7">
                  <span className="galaxy-badge">
                    <Sparkles className="h-3.5 w-3.5" />
                    Account Recovery
                  </span>
                  <h2 className="mt-3 font-display text-3xl font-bold text-white">Set new password</h2>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Choose a strong password you haven&apos;t used before. It must be at least 6 characters.
                  </p>
                </div>

                <form onSubmit={submitNewPassword} className="space-y-5">
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
                    disabled={resetting || strength === 'weak'}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resetting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <Link href="/login" className="text-sm text-white/45 transition hover:text-white/75">
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </>
            )}

            {/* ── DONE ─────────────────────────────────────────────────── */}
            {step === 'done' && (
              <div className="relative z-10 text-center">
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
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 py-3.5 text-sm font-semibold text-white transition hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500"
                >
                  Sign In Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mask an email/employee id for display: j***e@gmail.com / AL***01
function maskIdentifier(value) {
  const id = String(value || '').trim();
  if (!id) return 'your account';

  if (id.includes('@')) {
    const [local, domain] = id.split('@');
    const head = local.slice(0, 1);
    const tail = local.length > 2 ? local.slice(-1) : '';
    return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}${tail}@${domain}`;
  }

  if (id.length <= 3) return id;
  return `${id.slice(0, 2)}${'*'.repeat(id.length - 3)}${id.slice(-1)}`;
}
