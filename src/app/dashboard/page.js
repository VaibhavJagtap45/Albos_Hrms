'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Activity,
  Bell,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import {
  attendanceAPI,
  employeeAPI,
  holidayAPI,
  leaveAPI,
  noticeAPI,
  payrollAPI,
} from '@/lib/api';
import {
  formatDate,
  formatDateRange,
  getAttendanceSummary,
  getMonthLabel,
  getStatusTone,
  pluralize,
} from '@/lib/utils';

/* ─── Design tokens ──────────────────────────────────────────── */
const STAT_GRADIENTS = {
  purple: 'from-violet-600 to-purple-700',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  pink: 'from-pink-500 to-rose-600',
  blue: 'from-blue-500 to-indigo-600',
  cyan: 'from-cyan-500 to-blue-600',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── Premium stat card ──────────────────────────────────────── */
function GradientStatCard({ icon: Icon, label, value, subtext, gradient, badge }) {
  return (
    <div className={`stat-card-gradient bg-gradient-to-br ${gradient} purple-glow`}>
      {/* subtle mesh noise overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 70% 20%, white 1px, transparent 1px), radial-gradient(circle at 30% 70%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
          {badge != null && (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>
        <p className="font-display text-3xl font-bold text-white">{value}</p>
        <p className="mt-1 text-sm font-medium text-white/90">{label}</p>
        {subtext && <p className="mt-1 text-xs text-white/60">{subtext}</p>}
      </div>
    </div>
  );
}

/* ─── Section card wrapper ───────────────────────────────────── */
function Card({ title, description, children, action, accent }) {
  return (
    <div className="glass-card overflow-hidden">
      {accent && <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />}
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-gray-900">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-surface-400">{description}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Leave row ──────────────────────────────────────────────── */
function LeaveRow({ leave, showEmployee = false }) {
  const statusColors = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
  };
  const dot = statusColors[leave.status] ?? 'bg-surface-300';

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-purple-50 bg-gradient-to-r from-purple-50/60 to-white p-4 transition-all hover:border-purple-200 hover:shadow-sm">
      {showEmployee && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white shadow-sm">
          {getInitials(leave.employeeId?.name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {showEmployee && (
          <p className="truncate text-sm font-semibold text-gray-900">{leave.employeeId?.name}</p>
        )}
        {showEmployee && (
          <p className="text-xs text-surface-400">{leave.employeeId?.department || 'No department'}</p>
        )}
        <p className="mt-1 text-sm text-surface-600">{formatDateRange(leave.fromDate, leave.toDate)}</p>
        <p className="mt-1 line-clamp-1 text-xs text-surface-400">{leave.reason}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className={`status-badge ${getStatusTone(leave.status)}`}>{leave.status}</span>
        </div>
        <span className="text-xs text-surface-400">{pluralize(leave.days, 'day')}</span>
      </div>
    </div>
  );
}

/* ─── Attendance mini-bar ────────────────────────────────────── */
function AttendanceBar({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">{value} <span className="text-surface-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user, isHR } = useAuth();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [loading, setLoading] = useState(true);
  const [hrData, setHrData] = useState({
    employeeStats: null,
    attendanceStats: null,
    pendingLeaves: [],
    salaries: [],
    notices: [],
    holidays: [],
  });
  const [employeeData, setEmployeeData] = useState({
    profile: null,
    attendance: null,
    leaves: [],
    notices: [],
    holidays: [],
  });

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const [employeeStatsRes, attendanceStatsRes, pendingLeavesRes, payrollRes, noticesRes, holidaysRes] =
          await Promise.all([
            employeeAPI.stats(),
            attendanceAPI.stats(),
            leaveAPI.list({ status: 'pending' }),
            payrollAPI.list({ month: currentMonth, year: currentYear }),
            noticeAPI.list(),
            holidayAPI.list({ month: currentMonth, year: currentYear }),
          ]);

        setHrData({
          employeeStats: employeeStatsRes.data,
          attendanceStats: attendanceStatsRes.data,
          pendingLeaves: pendingLeavesRes.data.leaves,
          salaries: payrollRes.data.salaries,
          notices: noticesRes.data.notices,
          holidays: holidaysRes.data.holidays,
        });
        return;
      }

      const [profileRes, attendanceRes, leavesRes, noticesRes, holidaysRes] = await Promise.all([
        employeeAPI.getMe(),
        attendanceAPI.getMyMonth(currentMonth, currentYear),
        leaveAPI.my(),
        noticeAPI.my(),
        holidayAPI.list({ month: currentMonth, year: currentYear }),
      ]);

      setEmployeeData({
        profile: profileRes.data.employee,
        attendance: attendanceRes.data,
        leaves: leavesRes.data.leaves,
        notices: noticesRes.data.notices,
        holidays: holidaysRes.data.holidays,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = getMonthLabel(currentYear, currentMonth);
  const upcomingHolidays = (isHR ? hrData.holidays : employeeData.holidays)
    .filter((h) => new Date(h.date) >= new Date(today.toDateString()))
    .slice(0, 4);

  const employeeSummary = getAttendanceSummary(employeeData.attendance?.records || []);
  const unreadNotices = employeeData.notices.filter((n) => !n.isRead).length;
  const pendingLeaves = employeeData.leaves.filter((l) => l.status === 'pending').length;
  const finalisedPayrollCount = hrData.salaries.filter((s) => s.status === 'finalised').length;
  const totalAttendanceDays =
    employeeSummary.present +
    employeeSummary.late +
    employeeSummary['half-day'] +
    employeeSummary.absent +
    employeeSummary.leave;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Hero banner ──────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute bottom-4 right-8 h-16 w-16 rounded-full bg-purple-400/20" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-300">
                  {getGreeting()}, {user?.name?.split(' ')[0]}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {isHR ? 'HR Command Center' : 'My Dashboard'}
              </h1>
              <p className="mt-1 text-sm text-purple-200">
                {isHR
                  ? `People operations overview for ${monthLabel}.`
                  : `Your work snapshot for ${monthLabel}.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  <Clock className="h-3 w-3" />
                  {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-200">
                  <Activity className="h-3 w-3" />
                  Live data
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              {isHR ? (
                <>
                  <Link href="/employees" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]">
                    <Users className="h-4 w-4" /> Manage Employees
                  </Link>
                  <Link href="/payroll" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 active:scale-[0.98]">
                    <ReceiptText className="h-4 w-4" /> Run Payroll
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/attendance" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]">
                    <CalendarCheck className="h-4 w-4" /> View Attendance
                  </Link>
                  <Link href="/leaves" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 active:scale-[0.98]">
                    <CalendarRange className="h-4 w-4" /> Apply Leave
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── HR view ──────────────────────────────────────────── */}
        {isHR ? (
          <>
            {/* Stat grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <GradientStatCard
                icon={Users}
                gradient={STAT_GRADIENTS.purple}
                label="Total Employees"
                value={hrData.employeeStats?.totalEmployees ?? 0}
                subtext={`${hrData.employeeStats?.activeEmployees ?? 0} active`}
              />
              <GradientStatCard
                icon={CalendarCheck}
                gradient={STAT_GRADIENTS.emerald}
                label="Present Today"
                value={hrData.attendanceStats?.todayPresent ?? 0}
                subtext={`${hrData.attendanceStats?.todayPunches ?? 0} punch events`}
              />
              <GradientStatCard
                icon={CalendarRange}
                gradient={STAT_GRADIENTS.amber}
                label="Pending Leaves"
                value={hrData.pendingLeaves.length}
                subtext="Awaiting HR decision"
                badge={hrData.pendingLeaves.length > 0 ? '!' : null}
              />
              <GradientStatCard
                icon={ReceiptText}
                gradient={STAT_GRADIENTS.pink}
                label="Payroll Generated"
                value={hrData.salaries.length}
                subtext={`${finalisedPayrollCount} finalised this month`}
              />
            </div>

            {/* Main content row */}
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              {/* Pending leave queue */}
              <Card
                title="Pending Leave Queue"
                description="Requests that need your approval or rejection."
                accent="from-violet-500 to-purple-600"
                action={
                  <Link href="/leaves" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                    Open Leaves <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              >
                {hrData.pendingLeaves.length ? (
                  <div className="space-y-3">
                    {hrData.pendingLeaves.slice(0, 5).map((leave) => (
                      <LeaveRow key={leave._id} leave={leave} showEmployee />
                    ))}
                    {hrData.pendingLeaves.length > 5 && (
                      <p className="text-center text-xs text-surface-400">
                        +{hrData.pendingLeaves.length - 5} more pending requests
                      </p>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={CalendarRange}
                    title="No pending leave requests"
                    description="You are all caught up. New leave requests will appear here."
                  />
                )}
              </Card>

              {/* Right column */}
              <div className="space-y-6">
                {/* Payroll snapshot */}
                <Card
                  title="Payroll Snapshot"
                  description={`Salary slips for ${monthLabel}.`}
                  accent="from-pink-500 to-rose-600"
                  action={
                    <Link href="/payroll" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                      View Payroll <ChevronRight className="h-4 w-4" />
                    </Link>
                  }
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                        <FileText className="h-4 w-4 text-amber-700" />
                      </div>
                      <p className="font-display text-2xl font-bold text-gray-900">
                        {hrData.salaries.length - finalisedPayrollCount}
                      </p>
                      <p className="mt-0.5 text-xs text-surface-400 uppercase tracking-wider">Draft</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      </div>
                      <p className="font-display text-2xl font-bold text-gray-900">{finalisedPayrollCount}</p>
                      <p className="mt-0.5 text-xs text-surface-400 uppercase tracking-wider">Finalised</p>
                    </div>
                  </div>
                </Card>

                {/* Upcoming holidays */}
                <Card
                  title="Upcoming Holidays"
                  description="This month's planned holidays."
                  accent="from-cyan-500 to-blue-600"
                  action={
                    <Link href="/holidays" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                      All Holidays <ChevronRight className="h-4 w-4" />
                    </Link>
                  }
                >
                  {upcomingHolidays.length ? (
                    <div className="space-y-2">
                      {upcomingHolidays.map((holiday) => (
                        <div key={holiday._id} className="flex items-center justify-between rounded-xl bg-gradient-to-r from-purple-50/50 to-white px-4 py-3 border border-purple-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{holiday.name}</p>
                            <p className="text-xs capitalize text-surface-400">{holiday.type}</p>
                          </div>
                          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
                            {formatDate(holiday.date, 'dd MMM')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-surface-50 p-4 text-sm text-surface-400 text-center">
                      No more holidays this month.
                    </p>
                  )}
                </Card>
              </div>
            </div>

            {/* Recent notices */}
            <Card
              title="Recent Notices"
              description="Latest company and employee communication."
              accent="from-violet-500 via-purple-500 to-indigo-500"
              action={
                <Link href="/notices" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                  Notice Board <ChevronRight className="h-4 w-4" />
                </Link>
              }
            >
              {hrData.notices.length ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  {hrData.notices.slice(0, 3).map((notice, i) => {
                    const gradients = ['from-violet-600 to-purple-700', 'from-indigo-600 to-blue-700', 'from-purple-600 to-pink-700'];
                    return (
                      <div key={notice._id} className="group flex flex-col rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-4 transition-all hover:border-purple-300 hover:shadow-md hover:shadow-purple-100">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className={`h-1.5 w-8 rounded-full bg-gradient-to-r ${gradients[i % 3]}`} />
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-700">
                            {notice.type}
                          </span>
                        </div>
                        <p className="font-display text-base font-bold text-gray-900 line-clamp-1">{notice.title}</p>
                        <p className="mt-2 flex-1 line-clamp-3 text-sm leading-6 text-surface-500">{notice.body}</p>
                        <div className="mt-4 flex items-center justify-between text-xs text-surface-400 border-t border-purple-50 pt-3">
                          <span>{formatDate(notice.createdAt)}</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {notice.readCount ?? 0} reads
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Bell}
                  title="No notices published yet"
                  description="Publish your first announcement to communicate with the team."
                />
              )}
            </Card>
          </>
        ) : (
          /* ── Employee view ───────────────────────────────────── */
          <>
            {/* Stat grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <GradientStatCard
                icon={CalendarCheck}
                gradient={STAT_GRADIENTS.emerald}
                label="Days Present"
                value={employeeSummary.present + employeeSummary.late + employeeSummary['half-day']}
                subtext={`Attendance for ${monthLabel}`}
              />
              <GradientStatCard
                icon={CalendarRange}
                gradient={STAT_GRADIENTS.blue}
                label="Leave Balance"
                value={employeeData.profile?.leaveBalance ?? user?.leaveBalance ?? 0}
                subtext={`${pendingLeaves} request(s) pending`}
              />
              <GradientStatCard
                icon={Bell}
                gradient={STAT_GRADIENTS.amber}
                label="Unread Notices"
                value={unreadNotices}
                subtext={`${employeeData.notices.length} notice(s) total`}
                badge={unreadNotices > 0 ? unreadNotices : null}
              />
            </div>

            {/* Attendance overview */}
            <Card
              title="Attendance Overview"
              description={`Your attendance breakdown for ${monthLabel}.`}
              accent="from-emerald-500 to-teal-600"
              action={
                <Link href="/attendance" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                  Open Calendar <ChevronRight className="h-4 w-4" />
                </Link>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Number pills */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Present', value: employeeSummary.present, bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-100', text: 'text-emerald-700', icon: '✓' },
                    { label: 'Late', value: employeeSummary.late, bg: 'from-amber-50 to-orange-50', border: 'border-amber-100', text: 'text-amber-700', icon: '⏰' },
                    { label: 'Leave', value: employeeSummary.leave + employeeSummary['half-day'], bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100', text: 'text-blue-700', icon: '🗓' },
                    { label: 'Absent', value: employeeSummary.absent, bg: 'from-red-50 to-rose-50', border: 'border-red-100', text: 'text-red-700', icon: '✗' },
                  ].map(({ label, value, bg, border, text, icon }) => (
                    <div key={label} className={`rounded-xl bg-gradient-to-br ${bg} border ${border} p-4`}>
                      <p className="text-lg">{icon}</p>
                      <p className={`mt-1 font-display text-2xl font-bold ${text}`}>{value}</p>
                      <p className="text-xs text-surface-400">{label}</p>
                    </div>
                  ))}
                </div>
                {/* Progress bars */}
                <div className="flex flex-col justify-center gap-3 rounded-xl bg-gradient-to-br from-purple-50/50 to-white border border-purple-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Breakdown</p>
                  <AttendanceBar label="Present" value={employeeSummary.present} total={totalAttendanceDays} color="bg-gradient-to-r from-emerald-400 to-teal-500" />
                  <AttendanceBar label="Late" value={employeeSummary.late} total={totalAttendanceDays} color="bg-gradient-to-r from-amber-400 to-orange-500" />
                  <AttendanceBar label="Leave" value={employeeSummary.leave + employeeSummary['half-day']} total={totalAttendanceDays} color="bg-gradient-to-r from-blue-400 to-indigo-500" />
                  <AttendanceBar label="Absent" value={employeeSummary.absent} total={totalAttendanceDays} color="bg-gradient-to-r from-red-400 to-rose-500" />
                </div>
              </div>
            </Card>

            {/* Bottom row */}
            <div className="grid gap-6 xl:grid-cols-3">
              {/* Leave requests */}
              <Card
                title="Recent Leave Requests"
                description="Track approval progress on your requests."
                accent="from-blue-500 to-indigo-600"
                action={
                  <Link href="/leaves" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                    Manage <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              >
                {employeeData.leaves.length ? (
                  <div className="space-y-3">
                    {employeeData.leaves.slice(0, 4).map((leave) => (
                      <LeaveRow key={leave._id} leave={leave} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CalendarRange}
                    title="No leave history yet"
                    description="Your leave requests will appear here once you submit one."
                  />
                )}
              </Card>

              {/* Notices */}
              <Card
                title="Unread Notices"
                description="Important communication from HR and leadership."
                accent="from-violet-500 to-purple-600"
                action={
                  <Link href="/notices" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                    Open <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              >
                {employeeData.notices.length ? (
                  <div className="space-y-3">
                    {employeeData.notices.slice(0, 4).map((notice) => (
                      <div key={notice._id} className="rounded-xl border border-purple-50 bg-gradient-to-r from-purple-50/40 to-white p-4 transition hover:border-purple-200">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{notice.title}</p>
                          <span className={`shrink-0 status-badge ${notice.isRead ? 'bg-surface-100 text-surface-500' : 'bg-violet-100 text-violet-700'}`}>
                            {notice.isRead ? 'Read' : 'New'}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-surface-500">{notice.body}</p>
                        <p className="mt-2 text-xs text-surface-400">{formatDate(notice.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bell}
                    title="No notices available"
                    description="Published announcements will be visible here."
                  />
                )}
              </Card>

              {/* Holidays */}
              <Card
                title="Upcoming Holidays"
                description="Company and national holidays in view."
                accent="from-cyan-500 to-blue-600"
                action={
                  <Link href="/holidays" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                    All <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              >
                {upcomingHolidays.length ? (
                  <div className="space-y-2">
                    {upcomingHolidays.map((holiday) => (
                      <div key={holiday._id} className="flex items-center justify-between rounded-xl border border-purple-50 bg-gradient-to-r from-purple-50/40 to-white px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{holiday.name}</p>
                          <p className="text-xs capitalize text-surface-400">{holiday.type}</p>
                        </div>
                        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
                          {formatDate(holiday.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No upcoming holidays"
                    description="Any published holidays for the selected month will show up here."
                  />
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
