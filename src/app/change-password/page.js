'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import PasswordStrength, { MIN_PASSWORD_LENGTH } from '@/components/PasswordStrength';

export default function ChangePasswordPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const isForced = user?.mustChangePassword;

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordsMatch = form.confirmPassword.length > 0 && form.newPassword === form.confirmPassword;
  const isSamePassword = form.newPassword.length > 0 && form.newPassword === form.currentPassword;
  const canSubmit =
    !saving &&
    form.currentPassword.length > 0 &&
    form.newPassword.length >= MIN_PASSWORD_LENGTH &&
    passwordsMatch &&
    !isSamePassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (isSamePassword) {
      toast.error('New password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await authAPI.changePassword(form.currentPassword, form.newPassword);
      updateUser(data.user, data.token);
      toast.success('Password changed successfully.');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-100 text-brand-700 mb-4">
              {isForced ? <ShieldCheck className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              {isForced ? 'Set a New Password' : 'Change Password'}
            </h1>
            {isForced && (
              <p className="mt-2 text-sm text-surface-500">
                For your security, you must change the temporary password before continuing.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={form.currentPassword}
                  onChange={handleChange('currentPassword')}
                  className="input-field pr-11"
                  placeholder="Enter current password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={handleChange('newPassword')}
                  className="input-field pr-11"
                  placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={form.newPassword} variant="light" />
              {isSamePassword && (
                <p className="mt-1 text-xs text-red-500">New password must differ from your current password.</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                Confirm New Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                className={`input-field ${form.confirmPassword && !passwordsMatch ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                placeholder="Re-enter new password"
                required
                autoComplete="new-password"
              />
              {form.confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
              {saving ? 'Saving...' : 'Change Password'}
            </button>

            {!isForced && (
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary w-full"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
