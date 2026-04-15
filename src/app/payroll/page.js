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
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white purple-glow`}>
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative z-10">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="font-display text-3xl font-bold text-white">{value}</p>
        <p className="mt-1 text-sm font-medium text-white/90">{label}</p>
        {subtext && <p className="mt-0.5 text-xs text-white/60">{subtext}</p>}
      </div>
    </div>
  );
}

function ModalHeader({ title, description, onClose, gradient = "from-violet-600 to-purple-700" }) {
  return (
    <div className={`relative overflow-hidden rounded-t-[28px] bg-gradient-to-br ${gradient} px-6 py-5`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-white">{title}</h3>
          {description && <p className="mt-1 text-sm text-white/70">{description}</p>}
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25">
          <X className="h-4 w-4" />
        </button>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl overflow-hidden">
        <ModalHeader
          title="Edit Payroll"
          description={`${emp.name} · ${salary.month}/${salary.year}`}
          onClose={onClose}
          gradient="from-violet-600 to-purple-700"
        />

        <div className="p-6 space-y-4">
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

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Live net payable preview */}
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-700 to-purple-800 px-4 py-3 text-white">
              <span className="text-sm text-white/70">Calculated Net Payable</span>
              <span className="text-lg font-bold">{formatCurrency(liveNet)}</span>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
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

  const totalGross = salaries.reduce((sum, s) => sum + (s.grossSalary || 0), 0);
  const totalNet = salaries.reduce((sum, s) => sum + (s.netPayable || 0), 0);
  const totalFinalised = salaries.filter((s) => s.status === 'finalised').length;

  if (!isHR) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Purple hero banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-purple-300" />
                  <span className="text-sm font-medium text-purple-300">Payroll</span>
                </div>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">My Salary Slip</h1>
                <p className="mt-1 text-sm text-purple-200">View your monthly salary slip once it has been published by HR.</p>
              </div>
            </div>
          </div>

          {/* Month navigation */}
          <div className="glass-card overflow-hidden">
            <div className="border-b border-purple-50 bg-gradient-to-r from-purple-50/60 to-white px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Select Period</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <button
                type="button"
                onClick={() => setMonthState((cur) => shiftMonth(cur, -1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 text-purple-500 transition hover:bg-purple-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-purple-100 px-4 py-3 text-sm font-bold text-purple-700">
                {getMonthLabel(monthState.year, monthState.month)}
              </div>
              <button
                type="button"
                onClick={() => setMonthState((cur) => shiftMonth(cur, 1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 text-purple-500 transition hover:bg-purple-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <select
                value={monthState.month}
                onChange={(e) => setMonthState((cur) => ({ ...cur, month: Number(e.target.value) }))}
                className="input-field min-w-[140px]"
              >
                {getMonthOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={monthState.year}
                onChange={(e) => setMonthState((cur) => ({ ...cur, year: Number(e.target.value) }))}
                className="input-field min-w-[120px]"
              >
                {getYearOptions(3).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

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
        {/* Purple hero banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-300">HR Dashboard</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Payroll</h1>
              <p className="mt-1 text-sm text-purple-200">Generate, review, and finalise monthly salary records.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              <button
                key="gen"
                type="button"
                onClick={() => setShowGenPanel((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Generate Payroll
              </button>
            </div>
          </div>
        </div>

        {/* Month navigation */}
        <div className="glass-card overflow-hidden">
          <div className="border-b border-purple-50 bg-gradient-to-r from-purple-50/60 to-white px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Select Period</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <button
              type="button"
              onClick={() => setMonthState((cur) => shiftMonth(cur, -1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 text-purple-500 transition hover:bg-purple-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-purple-100 px-4 py-3 text-sm font-bold text-purple-700">
              {getMonthLabel(monthState.year, monthState.month)}
            </div>
            <button
              type="button"
              onClick={() => setMonthState((cur) => shiftMonth(cur, 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 text-purple-500 transition hover:bg-purple-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <select
              value={monthState.month}
              onChange={(e) => setMonthState((cur) => ({ ...cur, month: Number(e.target.value) }))}
              className="input-field min-w-[140px]"
            >
              {getMonthOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={monthState.year}
              onChange={(e) => setMonthState((cur) => ({ ...cur, year: Number(e.target.value) }))}
              className="input-field min-w-[120px]"
            >
              {getYearOptions(3).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Generate panel */}
        {showGenPanel && (
          <div className="glass-card overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
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
                <button type="button" onClick={() => { setShowGenPanel(false); setAttCheck(null); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 text-surface-400 hover:text-surface-600 hover:bg-purple-50 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Step 1 — Attendance health check */}
              <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">1</div>
                  <span className="text-sm font-semibold text-gray-800">Verify Attendance Data</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-surface-400 italic">
                    Check attendance records before generating payroll.
                  </p>
                  <button
                    type="button"
                    onClick={checkAttendance}
                    disabled={attChecking}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${attChecking ? 'animate-spin' : ''}`} />
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
              <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">2</div>
                  <span className="text-sm font-semibold text-gray-800">Run Payroll Generation</span>
                </div>
                <form onSubmit={handleGenerate} className="grid gap-4 sm:grid-cols-[1fr_200px_auto]">
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
                    <button type="submit" disabled={generating} className="btn-primary whitespace-nowrap">
                      {generating ? 'Generating…' : 'Run Generation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <GradientStatCard icon={ReceiptText} label="Total Gross" value={formatCurrency(totalGross)} gradient="from-violet-600 to-purple-700" subtext={`${salaries.length} records`} />
          <GradientStatCard icon={ReceiptText} label="Total Net Payable" value={formatCurrency(totalNet)} gradient="from-emerald-500 to-teal-600" subtext="After all deductions" />
          <GradientStatCard icon={Lock} label="Finalised" value={totalFinalised} gradient="from-cyan-500 to-blue-600" subtext={`of ${salaries.length} published`} />
        </div>

        <div className="glass-card overflow-hidden">
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
                  <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                    {['Employee', 'Gross', 'Absent Ded.', 'Late Ded.', 'Leave Ded.', 'Other Ded.', 'Net Payable', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-purple-700 ${h === 'Actions' ? 'text-right' : 'text-left'}`}
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
                        className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedSalary(salary)}
                      >
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                              <span className="text-xs font-bold text-white">{emp.name?.charAt(0)?.toUpperCase() || '?'}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{emp.name || '-'}</p>
                              <p className="text-xs text-surface-400">{emp.employeeId || '-'} · {emp.department || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">{formatCurrency(salary.grossSalary)}</td>
                        <td className="px-5 py-4 text-sm text-red-600">{formatCurrency(salary.absentDeduction)}</td>
                        <td className="px-5 py-4 text-sm text-red-600">{formatCurrency(salary.lateDeduction)}</td>
                        <td className="px-5 py-4 text-sm text-red-600">{formatCurrency(salary.leaveDeduction)}</td>
                        <td className="px-5 py-4 text-sm text-red-600">{formatCurrency(salary.otherDeductions)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">{formatCurrency(salary.netPayable)}</td>
                        <td className="px-5 py-4">
                          <span className={`status-badge ${getStatusTone(salary.status)}`}>{salary.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {salary.status !== 'finalised' && (
                              <button
                                type="button"
                                onClick={() => setEditSalary(salary)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 text-surface-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            {salary.status !== 'finalised' && (
                              <button
                                type="button"
                                onClick={() => handleFinalise(salary._id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
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
