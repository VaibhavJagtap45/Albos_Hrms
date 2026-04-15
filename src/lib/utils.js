import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';

export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, pattern);
}

export function formatDateTime(value, pattern = 'dd MMM yyyy, hh:mm a') {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, pattern);
}

export function formatTime(value, pattern = 'hh:mm a') {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, pattern);
}

export function formatDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) return '-';
  const from = formatDate(fromDate, 'dd MMM yyyy');
  const to = formatDate(toDate, 'dd MMM yyyy');
  return from === to ? from : `${from} to ${to}`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getMonthLabel(year, month) {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export function getMonthOptions() {
  const refYear = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: format(new Date(refYear, index, 1), 'MMMM'),
  }));
}

export function getYearOptions(range = 4) {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: range * 2 + 1 }, (_, index) => currentYear - range + index);
}

export function buildCalendarDays(year, month) {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const leadingDays = monthStart.getDay();
  const cells = [];

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push(null);
  }

  days.forEach((day) => cells.push(day));

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd');
}

export function parseApiDate(value) {
  if (!value) return null;

  try {
    return parseISO(value);
  } catch {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}

export function getNoticeTypeLabel(type) {
  return type === 'individual' ? 'Personal' : 'Global';
}

export function getLeaveTypeLabel(type) {
  const labels = {
    full: 'Full Day',
    half: 'Half Day',
    sick: 'Sick Leave',
    casual: 'Casual Leave',
  };

  return labels[type] || type || '-';
}

export function getHolidayTypeLabel(type) {
  return type === 'company' ? 'Company Holiday' : 'National Holiday';
}

export function getRoleLabel(role) {
  return role === 'hr' ? 'HR Admin' : 'Employee';
}

export function getStatusTone(status) {
  const tones = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    draft: 'bg-surface-100 text-surface-500',
    finalised: 'bg-brand-100 text-brand-700',
    present: 'bg-green-100 text-green-700',
    late: 'bg-amber-100 text-amber-700',
    leave: 'bg-blue-100 text-blue-700',
    'half-day': 'bg-purple-100 text-purple-700',
    holiday: 'bg-surface-100 text-surface-500',
    absent: 'bg-red-100 text-red-700',
    success: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-red-100 text-red-700',
  };

  return tones[status] || 'bg-surface-100 text-surface-500';
}

export function isPastDay(day) {
  if (!day) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return isBefore(day, now) || isSameDay(day, now);
}

export function isFutureDay(day) {
  if (!day) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return isAfter(day, now) && !isSameDay(day, now);
}

export function shiftMonth({ year, month }, direction) {
  const date = new Date(year, month - 1, 1);
  const shifted = direction > 0 ? addMonths(date, 1) : subMonths(date, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 };
}

export function getAttendanceSummary(records = []) {
  return records.reduce(
    (summary, record) => {
      const status = record.status || 'absent';
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    },
    { present: 0, late: 0, leave: 0, absent: 0, 'half-day': 0, holiday: 0 },
  );
}

export function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function dayLabel(day) {
  if (!day) return '';
  return format(day, 'EEE');
}

export function isCurrentMonthDate(day, year, month) {
  if (!day) return false;
  return day.getFullYear() === year && day.getMonth() === month - 1;
}

export function isTodayDate(day) {
  return day ? isToday(day) : false;
}
