'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Edit2, Info, Lock, Plus, ReceiptText, RefreshCw, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import EmptyState from '@/components/EmptyState';
import SalarySlip from '@/components/SalarySlip';
import { useAuth } from '@/lib/auth';
import { employeeAPI, payrollAPI } from '@/lib/api';
import {
  formatCurrency,
  getMonthLabel,
  getMonthOptions,
  getStatusTone,
  getYearOptions,
  shiftMonth,
} from '@/lib/utils';

// ── Reusable UI Components ────────────────────────────────────────────────────
function GradientStatCard({ icon: Icon, label, value, subtext, gradient }) {
  return (
    <div className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br ${gradient} p-5 text-white shadow-[0_22px_50px_rgba(76,29,149,0.22)]`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_30%)]" />
      <div className="pointer-events-none absolute -bottom-10 right-0 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">{label}</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">{value}</p>
          {subtext && <p className="mt-1 text-sm text-white/70">{subtext}</p>}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/12 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ title, description, onClose, gradient = "from-violet-600 to-purple-700" }) {
  return (
    <div className={`relative overflow-hidden rounded-t-[30px] bg-gradient-to-br ${gradient} px-6 py-5`}>
      <div className="pointer-events-none absolute -right-8 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-white">{title}</h3>
          {description && <p className="mt-1 text-sm text-white/72">{description}</p>}
        </div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/14 text-white transition hover:bg-white/22">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PageHero({ icon: Icon, eyebrow, title, description, action, stats }) {
  return (
    <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#23103f] via-[#5b21b6] to-[#312e81] px-6 py-7 text-white shadow-[0_34px_90px_rgba(76,29,149,0.26)] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-12 top-0 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-8 top-12 h-32 w-32 rounded-full bg-fuchsia-300/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-white/75">
            <Icon className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{description}</p>
          {action ? <div className="mt-5 flex flex-wrap gap-3">{action}</div> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">{stat.label}</p>
              <p className="mt-2 text-xl font-bold text-white">{stat.value}</p>
              {stat.hint ? <p className="mt-1 text-xs text-white/65">{stat.hint}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PeriodNavigator({ monthState, setMonthState, title, description, rightSlot }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-purple-100/80 bg-gradient-to-r from-white/80 via-purple-50/70 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-purple-600">{title}</p>
          {description ? <p className="mt-1 text-sm text-surface-400">{description}</p> : null}
        </div>
        {rightSlot}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-5">
        <button
          type="button"
          onClick={() => setMonthState((cur) => shiftMonth(cur, -1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 bg-white text-purple-600 transition hover:bg-purple-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="rounded-[22px] border border-purple-100 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 text-sm font-bold text-purple-700">
          {getMonthLabel(monthState.year, monthState.month)}
        </div>

        <button
          type="button"
          onClick={() => setMonthState((cur) => shiftMonth(cur, 1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 bg-white text-purple-600 transition hover:bg-purple-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <select
          value={monthState.month}
          onChange={(e) => setMonthState((cur) => ({ ...cur, month: Number(e.target.value) }))}
          className="input-field min-w-[150px]"
        >
          {getMonthOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={monthState.year}
          onChange={(e) => setMonthState((cur) => ({ ...cur, year: Number(e.target.value) }))}
          className="input-field min-w-[130px]"
        >
          {getYearOptions(3).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

function StepPanel({ step, title, description, action, children }) {
  return (
    <div className="glass-card-purple relative overflow-hidden p-5">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-purple-200/30 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-xs font-bold text-white shadow-[0_12px_24px_rgba(109,40,217,0.2)]">
              {step}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
              {description ? <p className="mt-1 text-sm text-surface-400">{description}</p> : null}
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

function calcSalaryBreakdown(salary) {
  const baseSalary = salary.employeeId?.salary ?? 0;
  const totalWorkingDays = salary.workingDays || 0;
  const actualPresentDays = salary.daysPresent ?? 0;
  const lateMarks = salary.lateMarks ?? 0;

  // Every 3 late marks = 1 full day deduction; remaining 2 late marks = 0.5 day deduction
  const lateFullDayDed = Math.floor(lateMarks / 3);
  const lateHalfDayDed = lateMarks % 3 >= 2 ? 0.5 : 0;
  const lateDayDeductions = lateFullDayDed + lateHalfDayDed;

  const adjustedDays = Math.max(0, actualPresentDays - lateDayDeductions);
  const calculated = totalWorkingDays > 0
    ? (adjustedDays / totalWorkingDays) * baseSalary - 200
    : 0;

  return {
    baseSalary,
    totalWorkingDays,
    actualPresentDays,
    lateMarks,
    lateFullDayDed,
    lateHalfDayDed,
    lateDayDeductions,
    adjustedDays,
    calculated: Math.max(0, calculated),
  };
}

function EditModal({ salary, onClose, onDone }) {
  const [form, setForm] = useState({
    pf:              salary.pf              ?? 0,
    pt:              salary.pt              ?? 0,
    pfi:             salary.pfi             ?? 0,
    tc:              salary.tc              ?? 0,
    otherDeductions: salary.otherDeductions ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const formId = 'edit-payroll-form';

  // ESC closes; lock body scroll while modal is open (single effect, single cleanup)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, saving]);

  const breakdown = calcSalaryBreakdown(salary);

  // Live-compute net payable as HR edits deductions
  const liveNet = Math.max(
    0,
    (salary.grossSalary ?? 0) -
    (salary.absentDeduction ?? 0) -
    (salary.lateDeduction ?? 0) -
    (salary.leaveDeduction ?? 0) -
    Number(form.pf || 0) -
    Number(form.pt || 0) -
    Number(form.pfi || 0) -
    Number(form.tc || 0) -
    Number(form.otherDeductions || 0),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await payrollAPI.update(salary._id, {
        pf:              Number(form.pf),
        pt:              Number(form.pt),
        pfi:             Number(form.pfi),
        tc:              Number(form.tc),
        otherDeductions: Number(form.otherDeductions),
        allowOverride: true,
        // backend recalculates netPayable automatically
      });
      toast.success('Payroll record updated.');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payroll.');
    } finally {
      setSaving(false);
    }
  };

  const emp = salary.employeeId || {};

  // Backdrop click closes (but only when click originates on the backdrop itself)
  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit payroll record"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        {/* Sticky header */}
        <div className="shrink-0">
          <ModalHeader
            title="Edit Payroll"
            description={`${emp.name} · ${salary.month}/${salary.year}`}
            onClose={onClose}
            gradient="from-violet-600 to-purple-700"
          />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-6">
          {/* Existing deduction summary */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gradient-to-br from-purple-50/40 to-white border border-purple-100 p-4 text-sm">
            <div>
              <p className="text-xs text-purple-500">Gross Salary</p>
              <p className="font-semibold text-gray-900">{formatCurrency(salary.grossSalary)}</p>
            </div>
            <div>
              <p className="text-xs text-purple-500">Absent Deduction</p>
              <p className="font-semibold text-gray-900">{formatCurrency(salary.absentDeduction)}</p>
            </div>
            <div>
              <p className="text-xs text-purple-500">Late Deduction</p>
              <p className="font-semibold text-gray-900">{formatCurrency(salary.lateDeduction)}</p>
            </div>
            <div>
              <p className="text-xs text-purple-500">Leave Deduction</p>
              <p className="font-semibold text-gray-900">{formatCurrency(salary.leaveDeduction)}</p>
            </div>
          </div>

          {/* Salary calculation breakdown */}
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-700">
              Salary Calculation
            </p>
            <div className="space-y-1.5 text-xs text-gray-700">
              <div className="flex justify-between">
                <span className="text-surface-500">Base Monthly Salary</span>
                <span className="font-medium">{formatCurrency(breakdown.baseSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Total Working Days</span>
                <span className="font-medium">{breakdown.totalWorkingDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Actual Present Days</span>
                <span className="font-medium">{breakdown.actualPresentDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">
                  Late Marks ({breakdown.lateMarks})
                  {breakdown.lateFullDayDed > 0 && ` → ${breakdown.lateFullDayDed} full day(s)`}
                  {breakdown.lateHalfDayDed > 0 && ` + 0.5 day`}
                </span>
                <span className="font-medium text-red-600">−{breakdown.lateDayDeductions} day(s)</span>
              </div>
              <div className="flex justify-between border-t border-violet-200 pt-1.5">
                <span className="font-semibold text-gray-800">Adjusted Days</span>
                <span className="font-semibold">{breakdown.adjustedDays}</span>
              </div>
              <div className="flex justify-between text-xs text-surface-400 italic">
                <span>({breakdown.adjustedDays} / {breakdown.totalWorkingDays}) × {formatCurrency(breakdown.baseSalary)} − ₹200</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-100 px-3 py-2">
              <span className="text-xs font-semibold text-violet-800">Calculated Net Salary</span>
              <span className="text-base font-bold text-violet-900">{formatCurrency(breakdown.calculated)}</span>
            </div>
          </div>

          <form id={formId} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'pf',  label: 'Provident Fund (PF)' },
                { key: 'pt',  label: 'Professional Tax (PT)' },
                { key: 'pfi', label: 'PF Insurance (PFI)' },
                { key: 'tc',  label: 'Transport Charges (TC)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                    {label} (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                Other Deductions (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.otherDeductions}
                onChange={(e) => setForm((prev) => ({ ...prev, otherDeductions: e.target.value }))}
                className="input-field"
                placeholder="0"
              />
            </div>
          </form>
        </div>

        {/* Sticky footer — always reachable */}
        <div className="shrink-0 border-t border-purple-100 bg-white">
          <div className="flex items-center justify-between gap-4 px-6 py-3 bg-gradient-to-r from-violet-700 to-purple-800 text-white">
            <span className="text-xs font-medium uppercase tracking-wider text-white/70">Net Payable</span>
            <span className="font-display text-lg font-bold">{formatCurrency(liveNet)}</span>
          </div>
          <div className="flex gap-3 px-6 py-4">
            <button type="submit" form={formId} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const { user, isHR } = useAuth();
  const today = new Date();
  const [monthState, setMonthState] = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editSalary, setEditSalary] = useState(null);
  const [selectedSalary, setSelectedSalary] = useState(null);

  // HR generate form
  const [genEmployeeId, setGenEmployeeId] = useState('');
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [showGenPanel, setShowGenPanel] = useState(false);

  // Attendance check state
  const [attCheck, setAttCheck] = useState(null);   // { withData, withoutData, employees[] }
  const [attChecking, setAttChecking] = useState(false);

  // Employee: selected month/year for own slip
  const [mySalary, setMySalary] = useState(null);
  const [myLoading, setMyLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isHR) {
      loadPayroll();
      loadEmployees();
    } else {
      loadMySalary();
    }
  }, [user, monthState.month, monthState.year]);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const { data } = await payrollAPI.list({ month: monthState.month, year: monthState.year });
      setSalaries(data.salaries);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payroll records.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await employeeAPI.list({ isActive: true, limit: 300 });
      setEmployees(data.employees);
    } catch { /* silent */ }
  };

  const loadMySalary = async () => {
    setMyLoading(true);
    setMySalary(null);
    try {
      const { data } = await payrollAPI.my(monthState.month, monthState.year);
      setMySalary(data.salary);
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error(err.response?.data?.message || 'Failed to load salary slip.');
      }
    } finally {
      setMyLoading(false);
    }
  };

  const checkAttendance = async () => {
    setAttChecking(true);
    setAttCheck(null);
    try {
      const { data } = await payrollAPI.attendanceCheck(monthState.month, monthState.year);
      setAttCheck(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check attendance data.');
    } finally {
      setAttChecking(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const payload = {
        month: monthState.month,
        year: monthState.year,
        otherDeductions: Number(otherDeductions),
      };
      if (genEmployeeId) payload.employeeId = genEmployeeId;
      const { data } = await payrollAPI.generate(payload);
      toast.success(data.message || 'Payroll generated.');
      setShowGenPanel(false);
      setGenEmployeeId('');
      setOtherDeductions(0);
      setAttCheck(null);
      await loadPayroll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalise = async (id) => {
    try {
      await payrollAPI.finalise(id);
      toast.success('Salary slip finalised and published to employee.');
      await loadPayroll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finalise payroll.');
    }
  };

  const currentPeriodLabel = getMonthLabel(monthState.year, monthState.month);
  const totalGross = salaries.reduce((sum, s) => sum + (s.grossSalary || 0), 0);
  const totalNet = salaries.reduce((sum, s) => sum + (s.netPayable || 0), 0);
  const totalFinalised = salaries.filter((s) => s.status === 'finalised').length;
  const averageNet = salaries.length ? totalNet / salaries.length : 0;
  const draftCount = salaries.filter((s) => s.status !== 'finalised').length;
  const missingAttendanceEmployees = attCheck?.employees?.filter((employee) => !employee.hasData) || [];

  if (!isHR) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-6">
          <PageHero
            icon={ReceiptText}
            eyebrow="Payroll Workspace"
            title="My Salary Slip"
            description="Review the current payroll cycle, switch between previous months, and open the published salary slip once HR has released it."
            stats={
              mySalary
                ? [
                    { label: 'Net payable', value: formatCurrency(mySalary.netPayable), hint: 'Selected salary slip' },
                    { label: 'Gross salary', value: formatCurrency(mySalary.grossSalary), hint: 'Before deductions' },
                    { label: 'Status', value: (mySalary.status || 'draft').toUpperCase(), hint: 'HR publication state' },
                    { label: 'Selected period', value: currentPeriodLabel, hint: 'Payroll preview window' },
                  ]
                : [
                    { label: 'Selected period', value: currentPeriodLabel, hint: 'Payroll preview window' },
                    { label: 'Slip status', value: 'PENDING', hint: 'Waiting for HR publish' },
                    { label: 'Workspace', value: 'PAYROLL', hint: 'Personal salary history' },
                    { label: 'Availability', value: myLoading ? 'LOADING' : 'CHECK BACK', hint: 'Published slips appear here' },
                  ]
            }
          />

          <PeriodNavigator
            monthState={monthState}
            setMonthState={setMonthState}
            title="Select period"
            description="Move across salary cycles without leaving the page."
            rightSlot={
              <div className="rounded-[22px] border border-purple-100 bg-white/80 px-4 py-3 text-right shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-purple-500">Previewing</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{currentPeriodLabel}</p>
              </div>
            }
          />

          {myLoading ? (
            <div className="glass-card p-10 text-center text-sm text-surface-400">Loading salary slip...</div>
          ) : mySalary ? (
            <SalarySlip salary={mySalary} />
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="Salary slip not yet published"
              description="Your salary slip for this month has not been published by HR yet. Check back later."
            />
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={ReceiptText}
          eyebrow="HR Payroll Suite"
          title="Payroll"
          description="Generate monthly payroll, verify attendance readiness, review every salary record, and publish final slips from one focused workflow."
          action={
            <button
              type="button"
              onClick={() => setShowGenPanel((v) => !v)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-purple-700 shadow-[0_16px_30px_rgba(255,255,255,0.16)] transition hover:bg-purple-50"
            >
              <Plus className="h-4 w-4" />
              {showGenPanel ? 'Hide Generator' : 'Generate Payroll'}
            </button>
          }
          stats={[
            { label: 'Current cycle', value: currentPeriodLabel, hint: 'Active payroll month' },
            { label: 'Records', value: String(salaries.length), hint: 'Generated salary rows' },
            { label: 'Published', value: String(totalFinalised), hint: 'Finalised salary slips' },
            { label: 'Average payout', value: formatCurrency(averageNet), hint: 'Average net payable' },
          ]}
        />

        <PeriodNavigator
          monthState={monthState}
          setMonthState={setMonthState}
          title="Select payroll cycle"
          description="Use the month selector to switch between payroll periods."
          rightSlot={
            <div className="hidden items-center gap-2 rounded-[22px] border border-purple-100 bg-white/80 px-4 py-3 text-sm text-surface-400 shadow-sm lg:flex">
              <Info className="h-4 w-4 text-purple-500" />
              Click a row to preview the salary slip before publishing it.
            </div>
          }
        />

        {/* Generate panel */}
        {showGenPanel && (
          <div className="glass-card overflow-hidden">
            {/* Top accent bar */}
            <div className="border-b border-purple-100/80 bg-gradient-to-r from-white/80 via-purple-50/70 to-white px-6 py-5">
            <div className="grid gap-5 p-6 xl:grid-cols-2">
              {/* Header */}
              <div className="xl:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">P</span>
                    <h3 className="font-display text-lg font-bold text-gray-900">
                      Generate Payroll — {getMonthLabel(monthState.year, monthState.month)}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-sm text-surface-400">
                    Step 1: Check attendance data &nbsp;→&nbsp; Step 2: Run generation
                  </p>
                </div>
                <button type="button" onClick={() => { setShowGenPanel(false); setAttCheck(null); }} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-100 bg-white text-surface-500 transition hover:bg-purple-50 hover:text-surface-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step 1 — Attendance health check */}
              <div className="glass-card-purple relative overflow-hidden p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-xs font-bold text-white shadow-[0_12px_24px_rgba(109,40,217,0.2)]">1</div>
                  <span className="text-base font-semibold text-gray-900">Verify Attendance Data</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-surface-400 italic">
                    Check attendance records before generating payroll.
                  </p>
                  <button
                    type="button"
                    onClick={checkAttendance}
                    disabled={attChecking}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-200 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${attChecking ? 'animate-spin' : ''}`} />
                    {attChecking ? 'Checking…' : 'Check Attendance'}
                  </button>
                </div>

                {!attCheck && !attChecking && (
                  <p className="text-xs text-surface-400 italic">
                    Click "Check Attendance" to verify how many employees have attendance records for {getMonthLabel(monthState.year, monthState.month)} before generating payroll.
                  </p>
                )}

                {attCheck && (
                  <div className="space-y-3">
                    {/* Summary chips */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-surface-50 p-3 text-center">
                        <p className="text-xs text-surface-400">Total Employees</p>
                        <p className="text-lg font-bold text-gray-900">{attCheck.totalEmployees}</p>
                      </div>
                      <div className="rounded-xl bg-green-50 p-3 text-center">
                        <p className="text-xs text-green-600">With Attendance</p>
                        <p className="text-lg font-bold text-green-700">{attCheck.withData}</p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${attCheck.withoutData > 0 ? 'bg-red-50' : 'bg-surface-50'}`}>
                        <p className={`text-xs ${attCheck.withoutData > 0 ? 'text-red-600' : 'text-surface-400'}`}>No Attendance</p>
                        <p className={`text-lg font-bold ${attCheck.withoutData > 0 ? 'text-red-700' : 'text-surface-400'}`}>{attCheck.withoutData}</p>
                      </div>
                    </div>

                    {/* Warning if some have no data */}
                    {attCheck.withoutData > 0 && (
                      <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
                        <div className="text-xs text-amber-800">
                          <p className="font-semibold mb-1">
                            {attCheck.withoutData} employee(s) have NO attendance records for this month.
                          </p>
                          <p className="mb-1.5">Their salary will be calculated as fully absent (₹0 net payable). If you already uploaded attendance, their names may not have matched — check fingerprint IDs or names in the import file.</p>
                          <div className="flex flex-wrap gap-1">
                            {attCheck.employees.filter(e => !e.hasData).map(e => (
                              <span key={e._id} className="inline-block rounded-lg bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                                {e.name} ({e.employeeId || '—'})
                              </span>
                            ))}
                          </div>
                          </div>
                        </div>
                      )}

                    {/* All good */}
                    {attCheck.withoutData === 0 && (
                      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                        <p className="text-xs font-semibold text-green-800">
                          All {attCheck.totalEmployees} employees have attendance data for this month. Ready to generate!
                        </p>
                      </div>
                    )}

                    {/* Per-employee detail table */}
                    <div className="overflow-hidden rounded-xl border border-purple-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                            <th className="px-3 py-2 text-left text-purple-700 font-bold uppercase tracking-wider">Employee</th>
                            <th className="px-3 py-2 text-center text-purple-700 font-bold uppercase tracking-wider">Days Recorded</th>
                            <th className="px-3 py-2 text-center text-purple-700 font-bold uppercase tracking-wider">Present</th>
                            <th className="px-3 py-2 text-center text-purple-700 font-bold uppercase tracking-wider">Late</th>
                            <th className="px-3 py-2 text-center text-purple-700 font-bold uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-50/80">
                          {attCheck.employees.map((emp) => (
                            <tr key={emp._id} className={emp.hasData ? 'hover:bg-purple-50/30 transition-colors' : 'bg-red-50/60'}>
                              <td className="px-3 py-2">
                                <p className="font-semibold text-gray-900">{emp.name}</p>
                                <p className="text-surface-400">{emp.employeeId || '—'} · {emp.department || '—'}</p>
                              </td>
                              <td className="px-3 py-2 text-center font-semibold text-gray-700">{emp.totalDays}</td>
                              <td className="px-3 py-2 text-center font-semibold text-green-700">{emp.presentDays}</td>
                              <td className="px-3 py-2 text-center font-semibold text-amber-700">{emp.lateDays}</td>
                              <td className="px-3 py-2 text-center">
                                {emp.hasData
                                  ? <span className="status-badge bg-green-100 text-green-700">Ready</span>
                                  : <span className="status-badge bg-red-100 text-red-700">No Data</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 — Generate */}
              <div className="glass-card-purple relative overflow-hidden p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-xs font-bold text-white shadow-[0_12px_24px_rgba(109,40,217,0.2)]">2</div>
                  <span className="text-base font-semibold text-gray-900">Run Payroll Generation</span>
                </div>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                      Employee (leave blank for all)
                    </label>
                    <select
                      value={genEmployeeId}
                      onChange={(e) => setGenEmployeeId(e.target.value)}
                      className="input-field"
                    >
                      <option value="">All Active Employees</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.employeeId} – {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                      Other Deductions (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(e.target.value)}
                      className="input-field"
                      disabled={!genEmployeeId}
                      title={genEmployeeId ? '' : 'Select a specific employee to set other deductions'}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" disabled={generating} className="btn-primary w-full">
                      {generating ? 'Generating…' : 'Run Generation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GradientStatCard icon={ReceiptText} label="Total Gross" value={formatCurrency(totalGross)} gradient="from-violet-700 via-purple-700 to-indigo-800" subtext={`${salaries.length} record(s) in this cycle`} />
          <GradientStatCard icon={ReceiptText} label="Total Net Payable" value={formatCurrency(totalNet)} gradient="from-fuchsia-600 via-purple-700 to-violet-800" subtext="After deductions and adjustments" />
          <GradientStatCard icon={Lock} label="Published" value={totalFinalised} gradient="from-emerald-500 to-teal-600" subtext={`${draftCount} draft record(s) remaining`} />
          <GradientStatCard icon={Info} label="Average Payout" value={formatCurrency(averageNet)} gradient="from-indigo-500 to-blue-600" subtext="Average net payable per record" />
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-purple-100/80 bg-gradient-to-r from-white/80 via-purple-50/70 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-purple-600">Payroll ledger</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">Salary records for {currentPeriodLabel}</h2>
              <p className="mt-1 text-sm text-surface-400">Review each record, open the salary slip preview, edit draft deductions, and publish final slips.</p>
            </div>
            <div className="rounded-[22px] border border-purple-100 bg-white/80 px-4 py-3 text-right shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-purple-500">Loaded</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{salaries.length} payroll record(s)</p>
            </div>
          </div>
          {loading ? (
            <div className="p-10 text-center text-sm text-surface-400">Loading payroll records...</div>
          ) : salaries.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No payroll records"
              description="Generate payroll for this month to create salary records."
              action={
                <button type="button" onClick={() => setShowGenPanel(true)} className="btn-primary text-sm">
                  <Plus className="h-4 w-4" />
                  Generate Payroll
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px]">
                <thead>
                  <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/70">
                    {['Employee', 'Gross', 'Absent Ded.', 'Late Ded.', 'Leave Ded.', 'Other Ded.', 'Net Payable', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-purple-700 ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/80">
                  {salaries.map((salary) => {
                    const emp = salary.employeeId || {};
                    return (
                      <tr
                        key={salary._id}
                        className="cursor-pointer bg-white transition-colors hover:bg-purple-50/60"
                        onClick={() => setSelectedSalary(salary)}
                      >
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-[0_12px_24px_rgba(109,40,217,0.18)]">
                              <span className="text-sm font-bold text-white">{emp.name?.charAt(0)?.toUpperCase() || '?'}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{emp.name || '-'}</p>
                              <p className="text-xs text-surface-400">{emp.employeeId || '-'} · {emp.department || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(salary.grossSalary)}</td>
                        <td className="px-5 py-4 text-sm text-rose-600">{formatCurrency(salary.absentDeduction)}</td>
                        <td className="px-5 py-4 text-sm text-rose-600">{formatCurrency(salary.lateDeduction)}</td>
                        <td className="px-5 py-4 text-sm text-rose-600">{formatCurrency(salary.leaveDeduction)}</td>
                        <td className="px-5 py-4 text-sm text-rose-600">{formatCurrency(salary.otherDeductions)}</td>
                        <td className="px-5 py-4 text-sm font-display font-bold text-slate-900">{formatCurrency(salary.netPayable)}</td>
                        <td className="px-5 py-4">
                          <span className={`status-badge ${getStatusTone(salary.status)}`}>{salary.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {salary.status !== 'finalised' && (
                              <button
                                type="button"
                                onClick={() => setEditSalary(salary)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-100 bg-white text-surface-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            {salary.status !== 'finalised' && (
                              <button
                                type="button"
                                onClick={() => handleFinalise(salary._id)}
                                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                title="Finalise"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Finalise
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedSalary && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="my-8 w-full max-w-3xl">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSalary(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-surface-500 shadow hover:text-surface-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SalarySlip salary={selectedSalary} />
            </div>
          </div>
        )}

        {editSalary && (
          <EditModal
            salary={editSalary}
            onClose={() => setEditSalary(null)}
            onDone={() => { setEditSalary(null); loadPayroll(); }}
          />
        )}
      </div>
    </AppShell>
  );
}
