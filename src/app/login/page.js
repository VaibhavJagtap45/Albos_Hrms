'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authAPI, warmUpBackend } from '@/lib/api';
import StarField from '@/components/StarField';
import PasswordStrength, { MIN_PASSWORD_LENGTH } from '@/components/PasswordStrength';

// ── View states ───────────────────────────────────────────────────────────────
const VIEW = {
  LOGIN:      'login',
  SEND_OTP:   'send_otp',
  VERIFY_OTP: 'verify_otp',
  NEW_PASS:   'new_pass',
  SUCCESS:    'success',
};

const FEATURES = [
  { title: 'Attendance Calendar',  copy: 'Track monthly presence, late marks, holidays, and working hours in one view.',       gradient: 'from-violet-500/25 to-brand-700/10',   delay: '0.5s'  },
  { title: 'Leave Workflow',       copy: 'Submit, review, and action leave requests with real-time status tracking.',          gradient: 'from-fuchsia-500/20 to-violet-700/10', delay: '0.65s' },
  { title: 'Payroll Ready',        copy: 'Generate accurate salary slips from attendance and approved leave data.',            gradient: 'from-indigo-500/20 to-violet-700/10', delay: '0.8s'  },
];

// ── OTP input — 6 individual boxes ────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const refs = Array.from({ length: 6 }, () => useRef(null)); // eslint-disable-line react-hooks/rules-of-hooks
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = digits.map((d, idx) => idx === i ? '' : d).join('');
      onChange(next);
      if (i > 0) refs[i - 1].current?.focus();
      return;
    }
    if (e.key === 'ArrowLeft' && i > 0) { refs[i - 1].current?.focus(); return; }
    if (e.key === 'ArrowRight' && i < 5) { refs[i + 1].current?.focus(); return; }
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    // Handle paste of full OTP
    if (raw.length > 1) {
      const pasted = raw.slice(0, 6).padEnd(6, '').split('').slice(0, 6);
      onChange(pasted.join(''));
      refs[Math.min(5, raw.length - 1)].current?.focus();
      return;
    }
    const next = digits.map((d, idx) => idx === i ? raw : d).join('');
    onChange(next);
    if (i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (raw) {
      onChange(raw.padEnd(6, '').slice(0, 6));
      refs[Math.min(5, raw.length - 1)].current?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-10 rounded-xl border text-center text-lg font-bold text-white transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50
            ${d
              ? 'border-brand-400/60 bg-brand-600/20 focus:ring-brand-400/30'
              : 'border-white/[0.1] bg-white/[0.05] focus:border-brand-400/50 focus:ring-brand-400/15 focus:bg-white/[0.08]'
            }`}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [view, setView] = useState(VIEW.LOGIN);

  // Login
  const [identifier, setIdentifier]     = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [wakingServer, setWakingServer] = useState(false);

  // Forgot / OTP flow
  const [forgotId, setForgotId]               = useState('');
  const [sendingOtp, setSendingOtp]           = useState(false);
  const [otp, setOtp]                         = useState('');
  const [verifyingOtp, setVerifyingOtp]       = useState(false);
  const [verifiedToken, setVerifiedToken]     = useState('');
  const [newPass, setNewPass]                 = useState('');
  const [confirmPass, setConfirmPass]         = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [resettingPass, setResettingPass]     = useState(false);

  const { login, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, router, user]);

  // Wake the Render free-tier backend immediately so the first sign-in isn't
  // stuck behind a 30-50s cold start.
  useEffect(() => {
    warmUpBackend();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id || !password) { toast.error('Enter your email / employee ID and password.'); return; }
    setSubmitting(true);
    // If the request runs long, it's almost certainly the Render cold start —
    // reassure the user instead of letting the button spin silently.
    const wakeTimer = setTimeout(() => setWakingServer(true), 5000);
    try {
      const u = await login(id, password);
      toast.success(`Welcome back, ${u.name}`);
      router.push('/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response
          ? 'Unable to sign in. Check your credentials.'
          : 'Could not reach the server. It may be waking up — please try again in a moment.');
      toast.error(message);
    } finally {
      clearTimeout(wakeTimer);
      setWakingServer(false);
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const id = forgotId.trim();
    if (!id) { toast.error('Enter your email or employee ID.'); return; }
    setSendingOtp(true);
    try {
      const { data } = await authAPI.sendOtp(id);
      if (data._dev_otp) toast(`Dev OTP: ${data._dev_otp}`, { icon: '🔑', duration: 10000 });
      setOtp('');
      setView(VIEW.VERIFY_OTP);
      toast.success('OTP sent to your registered email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { toast.error('Enter the complete 6-digit OTP.'); return; }
    setVerifyingOtp(true);
    try {
      const { data } = await authAPI.verifyOtp(forgotId.trim(), otp);
      setVerifiedToken(data.verifiedToken);
      setNewPass('');
      setConfirmPass('');
      setView(VIEW.NEW_PASS);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResetPass = async (e) => {
    e.preventDefault();
    if (newPass.length < MIN_PASSWORD_LENGTH) { toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (newPass !== confirmPass) { toast.error('Passwords do not match.'); return; }
    setResettingPass(true);
    try {
      await authAPI.resetPasswordOtp(verifiedToken, newPass);
      setView(VIEW.SUCCESS);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Please start over.');
    } finally {
      setResettingPass(false);
    }
  };

  const goBack = () => {
    setOtp(''); setNewPass(''); setConfirmPass(''); setVerifiedToken('');
    setView(VIEW.LOGIN);
  };

  if (loading && !user) return null;

  return (
    <div className="galaxy-stage min-h-screen">

      {/* ── Star field ────────────────────────────────────────────────────── */}
      <StarField count={320} shooterCount={9} />

      {/* ── Ambient light orbs (depth atmosphere) ────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-[640px] w-[640px] rounded-full opacity-[0.18]"
          style={{ background: 'radial-gradient(circle,#8b5cf6 0%,transparent 68%)', animation: 'float 12s ease-in-out infinite' }} />
        <div className="absolute -bottom-52 -right-28 h-[540px] w-[540px] rounded-full opacity-[0.13]"
          style={{ background: 'radial-gradient(circle,#d946ef 0%,transparent 68%)', animation: 'float 16s ease-in-out 3s infinite' }} />
        <div className="absolute top-1/2 left-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10]"
          style={{ background: 'radial-gradient(circle,#818cf8 0%,transparent 70%)', animation: 'float 20s ease-in-out 7s infinite' }} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.18] via-transparent to-fuchsia-500/[0.12]" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            <div style={{ animation: 'slideInLeft 0.5s ease-out 0.1s both' }}>
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 ring-1 ring-brand-400/30 backdrop-blur">
                  <Fingerprint className="h-6 w-6 text-brand-300" />
                  <div className="absolute inset-0 rounded-2xl bg-brand-400/10 animate-pulse-soft" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold tracking-tight text-white">HRMS</p>
                  <p className="text-xs text-white/40">Albos Technology</p>
                </div>
              </div>
            </div>

            <div style={{ animation: 'slideUp 0.6s ease-out 0.25s both' }}>
              <span className="galaxy-badge">
                <Sparkles className="h-3.5 w-3.5" />
                Galaxy Workforce System
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
                Attendance, leave,{' '}
                <span className="bg-gradient-to-r from-violet-200 via-brand-300 to-fuchsia-300 bg-clip-text text-transparent">payroll,</span>{' '}
                and communication — all in one place.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/50">
                Sign in with your office email or employee ID to access dashboards crafted for HR teams and employees with the same polished experience.
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              {FEATURES.map((item) => (
                <div key={item.title}
                  className={`relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br ${item.gradient} p-5 backdrop-blur-sm transition-all hover:border-white/15 hover:bg-white/[0.07]`}
                  style={{ animation: `slideUp 0.5s ease-out ${item.delay} both` }}>
                  <p className="font-display text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-white/50">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-3 lg:hidden" style={{ animation: 'slideUp 0.4s ease-out 0.1s both' }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600/25 ring-1 ring-brand-400/30">
                <Fingerprint className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <p className="font-display text-lg font-bold tracking-tight text-white">HRMS</p>
                <p className="text-xs text-white/40">Albos Technology</p>
              </div>
            </div>

            {/* Card */}
            <div className="galaxy-card"
              style={{ animation: 'scaleIn 0.5s ease-out 0.15s both' }}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent" />
              <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />

              <div className="relative p-7 sm:p-8">

                {/* ══════════ LOGIN ══════════ */}
                {view === VIEW.LOGIN && (
                  <div key="login" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="mb-7" style={{ animation: 'slideUp 0.4s ease-out 0.2s both' }}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">Secure Sign In</p>
                      <h2 className="mt-2.5 font-display text-[1.75rem] font-bold leading-tight text-white">Welcome back</h2>
                      <p className="mt-1.5 text-sm leading-6 text-white/45">Use your registered email address or employee ID to continue.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div style={{ animation: 'slideUp 0.4s ease-out 0.3s both' }}>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Email or Employee ID</label>
                        <div className="group relative">
                          <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-brand-400" />
                          <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="hr@albostech.com or ALB001" autoComplete="username"
                            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-10 py-3.5 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-400/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-brand-400/15 hover:border-white/15" />
                        </div>
                      </div>

                      <div style={{ animation: 'slideUp 0.4s ease-out 0.38s both' }}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Password</label>
                          <button type="button" onClick={() => { setForgotId(''); setView(VIEW.SEND_OTP); }}
                            className="text-[11px] text-brand-400/80 transition-colors hover:text-brand-300">
                            Forgot password?
                          </button>
                        </div>
                        <div className="group relative">
                          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-brand-400" />
                          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password" autoComplete="current-password"
                            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-10 py-3.5 pr-11 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-400/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-brand-400/15 hover:border-white/15" />
                          <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-white/60">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div style={{ animation: 'slideUp 0.4s ease-out 0.46s both' }}>
                        <button type="submit" disabled={submitting}
                          className="group relative mt-1 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-brand-600/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]">
                          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                          {submitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            : <> Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> </>}
                        </button>
                      </div>

                      {wakingServer && submitting && (
                        <p className="flex items-center justify-center gap-2 text-center text-xs text-amber-300/80" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Waking the secure server… the first sign-in after idle can take up to a minute.
                        </p>
                      )}
                    </form>

                    <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4" style={{ animation: 'slideUp 0.4s ease-out 0.54s both' }}>
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                        <div>
                          <p className="text-sm font-semibold text-white/80">Access is role-based</p>
                          <p className="mt-0.5 text-xs leading-5 text-white/35">HR manages employees, payroll, holidays, and notices. Employees access attendance, leave, salary, and profile.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════ STEP 1 — ENTER EMAIL ══════════ */}
                {view === VIEW.SEND_OTP && (
                  <div key="send_otp" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <button type="button" onClick={goBack}
                      className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/70">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                    </button>

                    <div className="mb-6" style={{ animation: 'slideUp 0.35s ease-out 0.05s both' }}>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 ring-1 ring-brand-400/25">
                        <Mail className="h-5 w-5 text-brand-300" />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">Account Recovery</p>
                      <h2 className="mt-2.5 font-display text-[1.75rem] font-bold text-white">Forgot password?</h2>
                      <p className="mt-1.5 text-sm leading-6 text-white/45">
                        Enter your registered email or employee ID. We'll send a <span className="font-semibold text-white/70">6-digit OTP</span> to your email.
                      </p>
                    </div>

                    <form onSubmit={handleSendOtp} className="space-y-4" style={{ animation: 'slideUp 0.35s ease-out 0.15s both' }}>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Email or Employee ID</label>
                        <div className="group relative">
                          <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-brand-400" />
                          <input type="text" value={forgotId} onChange={(e) => setForgotId(e.target.value)} autoFocus
                            placeholder="hr@albostech.com or ALB001" autoComplete="username"
                            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-10 py-3.5 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-400/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-brand-400/15 hover:border-white/15" />
                        </div>
                      </div>
                      <button type="submit" disabled={sendingOtp}
                        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-brand-600/30 disabled:opacity-60 active:scale-[0.98]">
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                        {sendingOtp ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          : <> <Send className="h-4 w-4" /> Send OTP </>}
                      </button>
                    </form>
                  </div>
                )}

                {/* ══════════ STEP 2 — VERIFY OTP ══════════ */}
                {view === VIEW.VERIFY_OTP && (
                  <div key="verify_otp" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <button type="button" onClick={() => setView(VIEW.SEND_OTP)}
                      className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/70">
                      <ArrowLeft className="h-3.5 w-3.5" /> Change account
                    </button>

                    <div className="mb-6" style={{ animation: 'slideUp 0.35s ease-out 0.05s both' }}>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 ring-1 ring-amber-400/25">
                        <Mail className="h-5 w-5 text-amber-300" />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">Verify Identity</p>
                      <h2 className="mt-2.5 font-display text-[1.75rem] font-bold text-white">Enter OTP</h2>
                      <p className="mt-1.5 text-sm leading-6 text-white/45">
                        We sent a 6-digit code to the email registered with{' '}
                        <span className="font-semibold text-white/70">{forgotId}</span>.
                        Check your inbox and spam folder.
                      </p>
                    </div>

                    <form onSubmit={handleVerifyOtp} className="space-y-5" style={{ animation: 'slideUp 0.35s ease-out 0.15s both' }}>
                      <OtpInput value={otp} onChange={setOtp} disabled={verifyingOtp} />

                      <button type="submit" disabled={verifyingOtp || otp.length < 6}
                        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-brand-600/30 disabled:opacity-60 active:scale-[0.98]">
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                        {verifyingOtp ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          : <> Verify OTP <ArrowRight className="h-4 w-4" /> </>}
                      </button>

                      {/* Resend */}
                      <div className="text-center">
                        <button type="button" onClick={handleSendOtp} disabled={sendingOtp}
                          className="inline-flex items-center gap-1.5 text-xs text-brand-400/80 transition hover:text-brand-300 disabled:opacity-50">
                          <RefreshCw className={`h-3.5 w-3.5 ${sendingOtp ? 'animate-spin' : ''}`} />
                          Resend OTP
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ══════════ STEP 3 — NEW PASSWORD ══════════ */}
                {view === VIEW.NEW_PASS && (
                  <div key="new_pass" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="mb-6" style={{ animation: 'slideUp 0.35s ease-out 0.05s both' }}>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/20 ring-1 ring-green-400/25">
                        <KeyRound className="h-5 w-5 text-green-300" />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">Almost Done</p>
                      <h2 className="mt-2.5 font-display text-[1.75rem] font-bold text-white">Set new password</h2>
                      <p className="mt-1.5 text-sm leading-6 text-white/45">
                        Choose a strong password. At least 6 characters.
                      </p>
                    </div>

                    <form onSubmit={handleResetPass} className="space-y-4" style={{ animation: 'slideUp 0.35s ease-out 0.15s both' }}>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">New Password</label>
                        <div className="group relative">
                          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-brand-400" />
                          <input type={showNew ? 'text' : 'password'} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                            placeholder="Enter new password" autoComplete="new-password" autoFocus
                            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-10 py-3.5 pr-11 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-400/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-brand-400/15 hover:border-white/15" />
                          <button type="button" tabIndex={-1} onClick={() => setShowNew((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PasswordStrength password={newPass} variant="dark" />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Confirm Password</label>
                        <div className="group relative">
                          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-brand-400" />
                          <input type={showConfirm ? 'text' : 'password'} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                            placeholder="Re-enter new password" autoComplete="new-password"
                            className={`w-full rounded-2xl border bg-white/[0.05] px-10 py-3.5 pr-11 text-sm text-white placeholder:text-white/20 transition-all focus:outline-none focus:ring-2 hover:border-white/15 ${confirmPass && confirmPass !== newPass ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-400/15' : 'border-white/[0.08] focus:border-brand-400/50 focus:bg-white/[0.08] focus:ring-brand-400/15'}`} />
                          <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPass && confirmPass !== newPass && (
                          <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                        )}
                      </div>

                      <button type="submit" disabled={resettingPass || newPass.length < 6}
                        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-brand-600/30 disabled:opacity-60 active:scale-[0.98]">
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                        {resettingPass ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          : <> Reset Password <ArrowRight className="h-4 w-4" /> </>}
                      </button>
                    </form>
                  </div>
                )}

                {/* ══════════ SUCCESS ══════════ */}
                {view === VIEW.SUCCESS && (
                  <div key="success" className="py-2 text-center" style={{ animation: 'scaleIn 0.35s ease-out' }}>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/25">
                      <CheckCircle2 className="h-8 w-8 text-green-400" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-white">Password Reset!</h2>
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      Your password has been updated successfully. Sign in with your new password.
                    </p>
                    <button type="button" onClick={goBack}
                      className="group relative mt-6 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 py-3.5 text-sm font-semibold text-white transition-all hover:from-brand-500 hover:via-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-brand-600/30 active:scale-[0.98]">
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                      Sign In Now
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
