'use client';

export const MIN_PASSWORD_LENGTH = 6;

export function scorePassword(password) {
  if (!password) return 0;
  if (password.length < MIN_PASSWORD_LENGTH) return 1; // Too short
  let score = 2;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 5);
}

const LEVELS = [
  null,
  { label: 'Too short', bar: 'bg-red-500',    text: 'text-red-500',    bars: 1 },
  { label: 'Weak',      bar: 'bg-red-500',    text: 'text-red-500',    bars: 1 },
  { label: 'Fair',      bar: 'bg-amber-500',  text: 'text-amber-500',  bars: 2 },
  { label: 'Good',      bar: 'bg-blue-500',   text: 'text-blue-500',   bars: 3 },
  { label: 'Strong',    bar: 'bg-green-500',  text: 'text-green-500',  bars: 4 },
];

/**
 * Compact 4-bar strength meter. Renders nothing when password is empty.
 * @param {object} props
 * @param {string} props.password
 * @param {'dark'|'light'} [props.variant='dark']
 */
export default function PasswordStrength({ password, variant = 'dark' }) {
  if (!password) return null;

  const score = scorePassword(password);
  const level = LEVELS[score];
  if (!level) return null;

  const trackBg = variant === 'dark' ? 'bg-white/10' : 'bg-surface-200';

  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              n <= level.bars ? level.bar : trackBg
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${level.text}`}>{level.label}</p>
    </div>
  );
}
