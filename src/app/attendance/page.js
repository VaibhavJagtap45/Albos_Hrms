"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import AppShell from "@/components/AppShell";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/lib/auth";
import { attendanceAPI, employeeAPI } from "@/lib/api";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  FileText,
  History,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  formatDate,
  getMonthLabel,
  getMonthOptions,
  getStatusTone,
  getYearOptions,
  shiftMonth,
} from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────
const PUNCH_STATUS_OPTIONS = [
  "check-in",
  "check-out",
  "break-out",
  "break-in",
  "overtime-in",
  "overtime-out",
];
const PUNCH_STATUS_COLORS = {
  "check-in": "bg-green-100 text-green-700",
  "check-out": "bg-blue-100 text-blue-700",
  "break-out": "bg-amber-100 text-amber-700",
  "break-in": "bg-amber-100 text-amber-700",
  "overtime-in": "bg-purple-100 text-purple-700",
  "overtime-out": "bg-purple-100 text-purple-700",
};
const SOURCE_BADGE = {
  manual: "bg-brand-100 text-brand-700",
  "csv-import": "bg-surface-100 text-surface-500",
  "excel-upload": "bg-surface-100 text-surface-500",
};

const toDateStr = (d) => d.toISOString().split("T")[0];
const toTimeStr = (d) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const fmtDT = (ts) =>
  new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const EMPTY_PUNCH = {
  employeeId: "",
  date: toDateStr(new Date()),
  time: toTimeStr(new Date()),
  status: "check-in",
  note: "",
};

const STATUS_TONE = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
  "half-day": "bg-purple-100 text-purple-700",
  holiday: "bg-surface-100 text-surface-500",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const EMPTY_CORRECTION = {
  requestedCheckIn: "",
  requestedCheckOut: "",
  reason: "",
};

// ── Reusable UI Components ────────────────────────────────────────────────────
function GradientStatCard({ icon: Icon, label, value, subtext, gradient }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white purple-glow`}
    >
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

function ModalHeader({
  title,
  description,
  onClose,
  gradient = "from-violet-600 to-purple-700",
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-t-[28px] bg-gradient-to-br ${gradient} px-6 py-5`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-white">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-white/70">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Employee monthly calendar view ───────────────────────────────────────────
function EmployeeAttendanceView() {
  const now = new Date();
  const [monthState, setMonthState] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(now);
  const [loading, setLoading] = useState(true);

  // Correction requests state
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [quota, setQuota] = useState({ used: 0, limit: 10 });
  const [dayDetailRecord, setDayDetailRecord] = useState(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionForm, setCorrectionForm] = useState(EMPTY_CORRECTION);
  const [submitting, setSubmitting] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const [attendanceRes, requestsRes] = await Promise.all([
        attendanceAPI.getMyMonth(monthState.month, monthState.year),
        attendanceAPI.getMyCorrectionRequests({
          month: monthState.month,
          year: monthState.year,
        }),
      ]);
      setRecords(attendanceRes.data.records || []);
      setHolidays(attendanceRes.data.holidays || []);
      setCorrectionRequests(requestsRes.data.requests || []);
      setQuota({
        used: requestsRes.data.used || 0,
        limit: requestsRes.data.limit || 10,
      });
      const now = new Date();
      const isCurrentMonth =
        monthState.month === now.getMonth() + 1 &&
        monthState.year === now.getFullYear();
      setSelectedDate(
        isCurrentMonth
          ? now
          : new Date(monthState.year, monthState.month - 1, 1),
      );
    } catch {
      toast.error("Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [monthState.month, monthState.year]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const openDayDetail = (record) => {
    setDayDetailRecord(record);
    setCorrectionForm(EMPTY_CORRECTION);
    setShowCorrectionForm(false);
  };

  const closeDayDetail = () => {
    setDayDetailRecord(null);
    setShowCorrectionForm(false);
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionForm.reason.trim()) {
      toast.error("Please provide a reason for the correction.");
      return;
    }
    if (!correctionForm.requestedCheckIn && !correctionForm.requestedCheckOut) {
      toast.error("Enter at least one corrected time.");
      return;
    }
    setSubmitting(true);
    try {
      await attendanceAPI.submitCorrectionRequest({
        attendanceId: dayDetailRecord._id,
        requestedCheckIn: correctionForm.requestedCheckIn || undefined,
        requestedCheckOut: correctionForm.requestedCheckOut || undefined,
        reason: correctionForm.reason.trim(),
      });
      toast.success("Correction request submitted. HR will review it shortly.");
      setShowCorrectionForm(false);
      setCorrectionForm(EMPTY_CORRECTION);
      await loadAttendance();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to submit correction request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRequestForRecord = (recordId) =>
    correctionRequests.find(
      (r) => r.attendanceId?._id === recordId || r.attendanceId === recordId,
    );

  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const onLeave = records.filter((r) =>
    ["leave", "half-day"].includes(r.status),
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Purple hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-medium text-purple-300">
                Attendance
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              My Attendance
            </h1>
            <p className="mt-1 text-sm text-purple-200">
              Review your monthly attendance calendar and daily records.
            </p>
          </div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-purple-50 bg-gradient-to-r from-purple-50/60 to-white px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
            Select Period
          </p>
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
            onChange={(e) =>
              setMonthState((cur) => ({
                ...cur,
                month: Number(e.target.value),
              }))
            }
            className="input-field min-w-[160px]"
          >
            {getMonthOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={monthState.year}
            onChange={(e) =>
              setMonthState((cur) => ({ ...cur, year: Number(e.target.value) }))
            }
            className="input-field min-w-[120px]"
          >
            {getYearOptions(4).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GradientStatCard
          icon={CalendarCheck}
          label="Present"
          value={present}
          gradient="from-emerald-500 to-teal-600"
          subtext="Days present this month"
        />
        <GradientStatCard
          icon={CalendarCheck}
          label="Late"
          value={late}
          gradient="from-amber-500 to-orange-600"
          subtext="Late arrivals this month"
        />
        <GradientStatCard
          icon={CalendarCheck}
          label="On Leave"
          value={onLeave}
          gradient="from-blue-500 to-cyan-600"
          subtext="Leave and half-day records"
        />
        <GradientStatCard
          icon={CalendarCheck}
          label="Holidays"
          value={holidays.length}
          gradient="from-violet-600 to-purple-700"
          subtext="Published holidays this month"
        />
      </div>

      {/* Calendar */}
      <div className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="p-5">
          <h3 className="mb-5 font-display text-lg font-bold text-gray-900">
            Monthly Calendar
          </h3>
          {loading ? (
            <p className="py-10 text-center text-sm text-surface-400">
              Loading attendance calendar…
            </p>
          ) : (
            <AttendanceCalendar
              year={monthState.year}
              month={monthState.month}
              records={records}
              holidays={holidays}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>
      </div>

      {/* Records table */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-purple-100 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-lg font-bold text-gray-900">
              Attendance Records
            </h3>
            <p className="mt-0.5 text-sm text-surface-400">
              Detailed daily records for{" "}
              {getMonthLabel(monthState.year, monthState.month)}
            </p>
          </div>
          {/* Monthly quota badge */}
          <div className="flex items-center gap-2 rounded-2xl bg-purple-100 px-4 py-2">
            <Clock className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-purple-700">
              Correction requests:{" "}
              <span
                className={`font-semibold ${quota.used >= quota.limit ? "text-red-600" : "text-purple-900"}`}
              >
                {quota.used}/{quota.limit}
              </span>{" "}
              this month
            </span>
          </div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-surface-400">
            Loading records…
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No records found"
            description="Attendance records will appear here once they are available for the selected month."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                  {[
                    "Date",
                    "Status",
                    "Check In",
                    "Check Out",
                    "Working Hours",
                    "Correction",
                    "Details",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-purple-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50/80">
                {[...records]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((record) => {
                    const req = getRequestForRecord(record._id);
                    return (
                      <tr
                        key={record._id}
                        className="hover:bg-purple-50/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`status-badge ${getStatusTone(record.status)}`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {record.checkIn || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {record.checkOut || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {record.workingHours
                            ? `${record.workingHours} hrs`
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          {req ? (
                            <span
                              className={`status-badge ${STATUS_TONE[req.status] || ""}`}
                            >
                              {req.status}
                            </span>
                          ) : (
                            <span className="text-xs text-surface-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => openDayDetail(record)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-600 transition hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Day Details Modal ─────────────────────────────────────────────── */}
      {dayDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            <ModalHeader
              title="Day Details"
              description={formatDate(dayDetailRecord.date)}
              onClose={closeDayDetail}
              gradient="from-violet-600 to-indigo-700"
            />

            <div className="space-y-5 px-6 py-5 max-h-[80vh] overflow-y-auto">
              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-purple-50/60 border border-purple-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
                    Status
                  </p>
                  <span
                    className={`mt-1 status-badge ${getStatusTone(dayDetailRecord.status)}`}
                  >
                    {dayDetailRecord.status}
                  </span>
                </div>
                <div className="rounded-2xl bg-purple-50/60 border border-purple-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
                    Working Hours
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {dayDetailRecord.workingHours
                      ? `${dayDetailRecord.workingHours} hrs`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-purple-50/60 border border-purple-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
                    Check In
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {dayDetailRecord.checkIn || "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-purple-50/60 border border-purple-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
                    Check Out
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {dayDetailRecord.checkOut || "—"}
                  </p>
                </div>
              </div>

              {dayDetailRecord.note && (
                <p className="text-sm text-surface-400">
                  <span className="font-medium text-gray-700">Note:</span>{" "}
                  {dayDetailRecord.note}
                </p>
              )}

              {/* Show existing request */}
              {(() => {
                const req = getRequestForRecord(dayDetailRecord._id);
                if (!req) return null;
                return (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
                        Correction Request
                      </p>
                      <span
                        className={`status-badge ${STATUS_TONE[req.status] || ""}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    {req.requestedCheckIn && (
                      <p className="text-sm text-gray-700">
                        Requested In:{" "}
                        <span className="font-medium">
                          {req.requestedCheckIn}
                        </span>
                      </p>
                    )}
                    {req.requestedCheckOut && (
                      <p className="text-sm text-gray-700">
                        Requested Out:{" "}
                        <span className="font-medium">
                          {req.requestedCheckOut}
                        </span>
                      </p>
                    )}
                    <p className="text-sm text-surface-400">
                      Reason: {req.reason}
                    </p>
                    {req.hrComment && (
                      <p className="text-sm text-surface-400">
                        HR: {req.hrComment}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Request correction button / inline form */}
              {!getRequestForRecord(dayDetailRecord._id) && (
                <>
                  {!showCorrectionForm ? (
                    <button
                      type="button"
                      disabled={quota.used >= quota.limit}
                      onClick={() => setShowCorrectionForm(true)}
                      className="w-full btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Clock className="h-4 w-4" />
                      {quota.used >= quota.limit
                        ? `No requests left this month (${quota.limit}/${quota.limit} used)`
                        : `Request Time Correction (${quota.limit - quota.used} left this month)`}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSubmitCorrection}
                      className="space-y-4 border-t border-purple-100 pt-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                        Request Time Correction
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-surface-500">
                            Correct Check In
                          </label>
                          <input
                            type="time"
                            value={correctionForm.requestedCheckIn}
                            onChange={(e) =>
                              setCorrectionForm((f) => ({
                                ...f,
                                requestedCheckIn: e.target.value,
                              }))
                            }
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-surface-500">
                            Correct Check Out
                          </label>
                          <input
                            type="time"
                            value={correctionForm.requestedCheckOut}
                            onChange={(e) =>
                              setCorrectionForm((f) => ({
                                ...f,
                                requestedCheckOut: e.target.value,
                              }))
                            }
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-surface-500">
                          Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Briefly explain why the time needs correction…"
                          value={correctionForm.reason}
                          onChange={(e) =>
                            setCorrectionForm((f) => ({
                              ...f,
                              reason: e.target.value,
                            }))
                          }
                          className="input-field resize-none"
                          maxLength={500}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCorrectionForm(false)}
                          className="btn-secondary text-sm flex-1"
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary text-sm flex-1"
                          disabled={submitting}
                        >
                          {submitting ? "Submitting…" : "Submit Request"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page: routes between HR punch-log view and employee calendar ────────
export default function AttendancePage() {
  const { user } = useAuth();
  const isHR = user?.role === "hr";

  // Employee path — monthly calendar view
  if (!isHR) {
    return (
      <AppShell>
        <EmployeeAttendanceView />
      </AppShell>
    );
  }

  // HR path — punch-log daily/import-history view
  return <HRAttendancePage />;
}

// ── HR punch-log page ─────────────────────────────────────────────────────────
function HRAttendancePage() {
  const fileRef = useRef(null);

  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(toDateStr(new Date()));
  const [filterDept, setFilterDept] = useState("");
  const [departments, setDepartments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  // Import history tab
  const [importLogs, setImportLogs] = useState([]);
  const [importLogsLoading, setImportLogsLoading] = useState(false);

  // Punch modal (add / edit)
  const [punchModal, setPunchModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [punchForm, setPunchForm] = useState(EMPTY_PUNCH);
  const [punchSubmitting, setPunchSubmitting] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  // CSV import modal (legacy column-based punch logs)
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Monthly attendance import modal
  const now = new Date();
  const [monthlyModal, setMonthlyModal] = useState(false);
  const [monthlyFile, setMonthlyFile] = useState(null);
  const [monthlyMonth, setMonthlyMonth] = useState(now.getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState(now.getFullYear());
  const [monthlyImporting, setMonthlyImporting] = useState(false);
  const [monthlyResult, setMonthlyResult] = useState(null);
  const monthlyFileRef = useRef(null);

  // Daily detailed XLS import (Secureye/ONtime "Date wise Daily Attendance Report")
  const [dailyModal, setDailyModal] = useState(false);
  const [dailyFile, setDailyFile] = useState(null);
  const [dailyImporting, setDailyImporting] = useState(false);
  const [dailyResult, setDailyResult] = useState(null);
  const [dailyDragOver, setDailyDragOver] = useState(false);
  const dailyFileRef = useRef(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);

  // Correction requests
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(null); // { req, action }
  const [hrComment, setHrComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  // ── Load daily punch logs ─────────────────────────────────────────────────
  const loadDaily = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date };
      if (filterDept) params.department = filterDept;
      const { data } = await attendanceAPI.daily(params);
      setLogs(data.logs || []);
      setPagination(data.pagination || {});
    } catch {
      toast.error("Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [date, filterDept]);

  useEffect(() => {
    if (tab === "daily") loadDaily();
  }, [tab, loadDaily]);

  useEffect(() => {
    employeeAPI
      .departments()
      .then((r) => setDepartments(r.data.departments))
      .catch(() => {});
    employeeAPI
      .list({ limit: 200 })
      .then((r) => setAllEmployees(r.data.employees))
      .catch(() => {});
  }, []);

  const loadImportLogs = async () => {
    setImportLogsLoading(true);
    try {
      const { data } = await attendanceAPI.importLogs();
      setImportLogs(data.logs || []);
    } catch {
      // silent
    } finally {
      setImportLogsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "history") loadImportLogs();
  }, [tab]);

  const loadCorrectionRequests = async () => {
    setCorrectionLoading(true);
    try {
      const { data } = await attendanceAPI.listCorrectionRequests();
      setCorrectionRequests(data.requests || []);
    } catch {
      // silent
    } finally {
      setCorrectionLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "requests") loadCorrectionRequests();
  }, [tab]);

  // Always load count for badge
  useEffect(() => {
    attendanceAPI
      .listCorrectionRequests({ status: "pending" })
      .then((r) => setCorrectionRequests(r.data.requests || []))
      .catch(() => {});
  }, []);

  // ── Date navigation ───────────────────────────────────────────────────────
  const shiftDate = (n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(toDateStr(d));
  };

  // ── Punch modal helpers ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditingLog(null);
    setPunchForm({ ...EMPTY_PUNCH, date });
    setEmpSearch("");
    setPunchModal(true);
  };

  const openEdit = (log) => {
    const ts = new Date(log.timestamp);
    setPunchForm({
      employeeId: log.employee?._id || "",
      date: toDateStr(ts),
      time: toTimeStr(ts),
      status: log.status,
      note: log.note || "",
    });
    setEditingLog(log);
    setEmpSearch(log.employee?.name || "");
    setPunchModal(true);
  };

  const handlePunchSubmit = async (e) => {
    e.preventDefault();
    setPunchSubmitting(true);
    try {
      if (editingLog) {
        await attendanceAPI.update(editingLog._id, {
          date: punchForm.date,
          time: punchForm.time,
          status: punchForm.status,
          note: punchForm.note,
        });
        toast.success("Attendance event updated.");
      } else {
        await attendanceAPI.addManual({
          employeeId: punchForm.employeeId,
          date: punchForm.date,
          time: punchForm.time,
          status: punchForm.status,
          note: punchForm.note,
        });
        toast.success("Punch entry added.");
      }
      setPunchModal(false);
      loadDaily();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save punch entry.");
    } finally {
      setPunchSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await attendanceAPI.delete(deleteId);
      toast.success("Punch record deleted.");
      setDeleteId(null);
      loadDaily();
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  // ── CSV import ────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await attendanceAPI.importCsv(importFile);
      setImportResult(data);
      if (data.inserted > 0) {
        toast.success(`${data.inserted} records imported.`);
        loadDaily();
      } else {
        toast("Import complete — check results below.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  // ── Monthly attendance import ─────────────────────────────────────────────
  const openMonthlyModal = () => {
    const n = new Date();
    setMonthlyFile(null);
    setMonthlyResult(null);
    setMonthlyMonth(n.getMonth() + 1);
    setMonthlyYear(n.getFullYear());
    setMonthlyModal(true);
  };

  const handleMonthlyImport = async () => {
    if (!monthlyFile) return;
    setMonthlyImporting(true);
    setMonthlyResult(null);
    try {
      const { data } = await attendanceAPI.monthlyUpload(
        monthlyFile,
        monthlyMonth,
        monthlyYear,
      );
      setMonthlyResult(data);
      if (data.inserted > 0) {
        toast.success(`${data.inserted} day-records imported.`);
        loadDaily();
      } else {
        toast("Import complete — check results below.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Monthly import failed.");
    } finally {
      setMonthlyImporting(false);
    }
  };

  // ── Daily detailed XLS import (Secureye / ONtime fingerprint device) ──────
  const MAX_DAILY_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
  const isAcceptedDailyFile = (file) => {
    if (!file) return false;
    const name = file.name?.toLowerCase() || "";
    return name.endsWith(".xls") || name.endsWith(".xlsx");
  };

  const openDailyModal = () => {
    setDailyFile(null);
    setDailyResult(null);
    setDailyDragOver(false);
    setDailyModal(true);
  };

  const acceptDailyFile = (file) => {
    if (!file) return;
    if (!isAcceptedDailyFile(file)) {
      toast.error("Please select an .xls or .xlsx file.");
      return;
    }
    if (file.size > MAX_DAILY_FILE_BYTES) {
      toast.error("File is larger than 10 MB.");
      return;
    }
    setDailyFile(file);
    setDailyResult(null);
  };

  const handleDailyImport = async () => {
    if (!dailyFile || dailyImporting) return;
    setDailyImporting(true);
    setDailyResult(null);
    try {
      const { data } = await attendanceAPI.dailyUpload(dailyFile);
      setDailyResult(data);
      if (data.inserted > 0) {
        toast.success(`${data.inserted} punch event(s) imported.`);
        loadDaily();
      } else {
        toast("Import finished — review the results below.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Daily import failed.");
    } finally {
      setDailyImporting(false);
    }
  };

  // ── Correction request review ─────────────────────────────────────────────
  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    setReviewSaving(true);
    try {
      const { req, action } = reviewModal;
      if (action === "approve") {
        await attendanceAPI.approveCorrectionRequest(req._id, hrComment);
        toast.success("Request approved and attendance updated.");
      } else {
        await attendanceAPI.rejectCorrectionRequest(req._id, hrComment);
        toast.success("Request rejected.");
      }
      setReviewModal(null);
      setHrComment("");
      loadCorrectionRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to review request.");
    } finally {
      setReviewSaving(false);
    }
  };

  const filteredEmps = allEmployees
    .filter(
      (e) =>
        e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.email.toLowerCase().includes(empSearch.toLowerCase()),
    )
    .slice(0, 8);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Purple hero banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-300">
                  HR Dashboard
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Attendance Management
              </h1>
              <p className="mt-1 text-sm text-purple-200">
                Manage and review punch-level attendance records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              <button
                onClick={() => {
                  setMonthlyModal(true);
                  setMonthlyFile(null);
                  setMonthlyResult(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
              >
                <FileText className="w-4 h-4" />
                Monthly Import
              </button>
              <button
                onClick={() => {
                  setImportModal(true);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
              >
                <Upload className="w-4 h-4" />
                Daily Import
              </button>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Add Punch
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-purple-100/60 p-1 w-fit">
          {[
            { key: "daily", label: "Daily Report", icon: CalendarCheck },
            { key: "requests", label: "Correction Requests", icon: Clock },
            { key: "history", label: "Import History", icon: History },
          ].map(({ key, label, icon: Icon }) => {
            const pendingCount =
              key === "requests"
                ? correctionRequests.filter((r) => r.status === "pending")
                    .length
                : 0;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === key
                    ? "bg-white text-purple-900 shadow-sm"
                    : "text-purple-500 hover:text-purple-700"
                }`}
              >
                <Icon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                {label}
                {pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── DAILY PUNCH REPORT ── */}
        {tab === "daily" && (
          <>
            {/* Date controls + department filter */}
            <div className="glass-card overflow-hidden">
              <div className="border-b border-purple-50 bg-gradient-to-r from-purple-50/60 to-white px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
                  Date Navigation
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 p-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 text-purple-500 transition hover:bg-purple-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field w-auto text-center font-mono"
                  />
                  <button
                    onClick={() => shiftDate(1)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200 text-purple-500 transition hover:bg-purple-50"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDate(toDateStr(new Date()))}
                    className="btn-secondary text-xs"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setDate(toDateStr(d));
                    }}
                    className="btn-secondary text-xs"
                  >
                    Yesterday
                  </button>
                </div>
                {departments.length > 0 && (
                  <div className="relative ml-auto">
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="input-field appearance-none pr-10 min-w-[180px]"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>

            {/* Summary bar */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs text-purple-500 font-medium">Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {fmtDate(date)}
                </p>
              </div>
              <div className="h-8 w-px bg-purple-100" />
              <div>
                <p className="text-xs text-purple-500 font-medium">
                  Total Punches
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {pagination.total ?? 0}
                </p>
              </div>
              {filterDept && (
                <>
                  <div className="h-8 w-px bg-purple-100" />
                  <div>
                    <p className="text-xs text-purple-500 font-medium">
                      Department Filter
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {filterDept}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Punch log table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                      {[
                        "Employee",
                        "Department",
                        "Time",
                        "Type",
                        "Source",
                        "Note",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-purple-700 ${h === "Actions" ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50/80">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-12 text-surface-400 text-sm"
                        >
                          Loading…
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-16 text-surface-400 text-sm"
                        >
                          <CalendarCheck className="w-10 h-10 mx-auto mb-3 text-surface-200" />
                          No punch records for {fmtDate(date)}
                          <div className="mt-3">
                            <button
                              onClick={openAdd}
                              className="btn-primary text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Punch
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr
                          key={log._id}
                          className="hover:bg-purple-50/30 transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-white">
                                  {log.employee?.name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {log.employee?.name || `ID: ${log.rawUserId}`}
                                </p>
                                <p className="text-xs text-surface-400">
                                  {log.employee?.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700">
                            {log.employee?.department || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-gray-900">
                            {fmtTime(log.timestamp)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`status-badge ${PUNCH_STATUS_COLORS[log.status] || "bg-surface-100 text-surface-500"}`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`status-badge text-[10px] ${SOURCE_BADGE[log.source] || "bg-surface-100 text-surface-400"}`}
                            >
                              {log.source === "csv-import" ||
                              log.source === "excel-upload"
                                ? "Import"
                                : "Manual"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-surface-400 max-w-[160px] truncate">
                            {log.note || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(log)}
                                className="p-1.5 hover:bg-purple-50 rounded-lg text-surface-400 hover:text-purple-700"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteId(log._id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── CORRECTION REQUESTS ── */}
        {tab === "requests" && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                    {[
                      "Employee",
                      "Date",
                      "Current Times",
                      "Requested Times",
                      "Reason",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`text-xs font-bold text-purple-700 uppercase tracking-wider px-5 py-3.5 ${h === "Actions" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/80">
                  {correctionLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-surface-400 text-sm"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : correctionRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-16 text-surface-400 text-sm"
                      >
                        <Clock className="w-10 h-10 mx-auto mb-3 text-surface-200" />
                        No correction requests yet.
                      </td>
                    </tr>
                  ) : (
                    correctionRequests.map((req) => {
                      const emp = req.employeeId || {};
                      const att = req.attendanceId || {};
                      const statusTone =
                        {
                          pending: "bg-amber-100 text-amber-700",
                          approved: "bg-green-100 text-green-700",
                          rejected: "bg-red-100 text-red-700",
                        }[req.status] || "";
                      return (
                        <tr
                          key={req._id}
                          className="hover:bg-purple-50/30 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-gray-900">
                              {emp.name || "—"}
                            </p>
                            <p className="text-xs text-surface-400">
                              {emp.employeeId} · {emp.department}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                            {fmtDate(req.date)}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700">
                            <span className="block">
                              In: {att.checkIn || "—"}
                            </span>
                            <span className="block">
                              Out: {att.checkOut || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm">
                            {req.requestedCheckIn && (
                              <span className="block font-medium text-purple-700">
                                In: {req.requestedCheckIn}
                              </span>
                            )}
                            {req.requestedCheckOut && (
                              <span className="block font-medium text-purple-700">
                                Out: {req.requestedCheckOut}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700 max-w-[200px]">
                            <span className="line-clamp-2">{req.reason}</span>
                            {req.hrComment && (
                              <span className="block text-xs text-surface-400 mt-0.5">
                                HR: {req.hrComment}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`status-badge ${statusTone}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {req.status === "pending" ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setReviewModal({ req, action: "approve" });
                                    setHrComment("");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setReviewModal({ req, action: "reject" });
                                    setHrComment("");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-surface-300">
                                {req.reviewedBy?.name
                                  ? `by ${req.reviewedBy.name}`
                                  : "reviewed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── IMPORT HISTORY ── */}
        {tab === "history" && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                    {[
                      "Imported At",
                      "File",
                      "Imported By",
                      "Status",
                      "Inserted",
                      "Skipped",
                      "Unmapped",
                      "Issues",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-bold text-purple-700 uppercase tracking-wider px-5 py-3.5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/80">
                  {importLogsLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-surface-400 text-sm"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : importLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-surface-400 text-sm"
                      >
                        No import records yet.
                      </td>
                    </tr>
                  ) : (
                    importLogs.map((il) => (
                      <tr
                        key={il._id}
                        className="hover:bg-purple-50/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm text-gray-900 whitespace-nowrap">
                          {fmtDT(il.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-surface-500 max-w-[180px] truncate">
                          {il.fileName || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {il.importedBy?.name || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`status-badge ${
                              il.status === "success"
                                ? "bg-green-100 text-green-700"
                                : il.status === "partial"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {il.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-mono text-green-700">
                          {il.recordsInserted}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-mono text-surface-400">
                          {il.recordsSkipped}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-mono text-amber-600">
                          {il.recordsUnmapped}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-red-600 max-w-[200px] truncate">
                          {il.errorMessage || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ ADD / EDIT PUNCH MODAL ═══════════════ */}
      {punchModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPunchModal(false)}
        >
          <div
            className="bg-white rounded-[28px] w-full max-w-md shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader
              title={editingLog ? "Edit Punch Entry" : "Add Punch Entry"}
              description={
                editingLog
                  ? `Editing record for ${editingLog.employee?.name}`
                  : "Add a manual attendance punch"
              }
              onClose={() => setPunchModal(false)}
              gradient="from-violet-600 to-purple-700"
            />

            <form onSubmit={handlePunchSubmit} className="p-6 space-y-4">
              {/* Employee — only in add mode */}
              {!editingLog ? (
                <div className="relative">
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                    Employee *
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={empSearch}
                    onFocus={() => setShowEmpDrop(true)}
                    onChange={(e) => {
                      setEmpSearch(e.target.value);
                      setPunchForm((f) => ({ ...f, employeeId: "" }));
                      setShowEmpDrop(true);
                    }}
                    className="input-field"
                    required={!punchForm.employeeId}
                    autoComplete="off"
                  />
                  {punchForm.employeeId && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-3 top-9" />
                  )}
                  {showEmpDrop && filteredEmps.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg overflow-hidden">
                      {filteredEmps.map((emp) => (
                        <button
                          key={emp._id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-purple-50 text-sm flex items-center gap-3"
                          onClick={() => {
                            setPunchForm((f) => ({
                              ...f,
                              employeeId: emp._id,
                            }));
                            setEmpSearch(emp.name);
                            setShowEmpDrop(false);
                          }}
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white">
                              {emp.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {emp.name}
                            </p>
                            <p className="text-xs text-surface-400">
                              {emp.department || emp.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                    Employee
                  </label>
                  <div className="input-field bg-surface-50 text-gray-500 cursor-not-allowed">
                    {editingLog.employee?.name}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={punchForm.date}
                    onChange={(e) =>
                      setPunchForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={punchForm.time}
                    onChange={(e) =>
                      setPunchForm((f) => ({ ...f, time: e.target.value }))
                    }
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                  Type *
                </label>
                <select
                  required
                  value={punchForm.status}
                  onChange={(e) =>
                    setPunchForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="input-field"
                >
                  {PUNCH_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                  Note{" "}
                  <span className="text-surface-300 normal-case font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={punchForm.note}
                  onChange={(e) =>
                    setPunchForm((f) => ({ ...f, note: e.target.value }))
                  }
                  className="input-field"
                  placeholder="e.g. Forgot to punch in"
                  maxLength={300}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPunchModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    punchSubmitting || (!editingLog && !punchForm.employeeId)
                  }
                  className="btn-primary"
                >
                  {punchSubmitting
                    ? "Saving…"
                    : editingLog
                      ? "Update"
                      : "Add Punch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ MONTHLY ATTENDANCE IMPORT MODAL ═══════════════ */}
      {monthlyModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setMonthlyModal(false)}
        >
          <div
            className="bg-white rounded-[28px] w-full max-w-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader
              title="Monthly Attendance Import"
              description="Upload the monthly In/Out report (Albos format)"
              onClose={() => setMonthlyModal(false)}
              gradient="from-indigo-600 to-violet-700"
            />

            <div className="p-6 space-y-4">
              {/* Info box */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-xs text-violet-700 space-y-1">
                <p className="font-semibold text-violet-800 mb-1">
                  Supported format:
                </p>
                <p>
                  • Header row:{" "}
                  <span className="font-mono">
                    Emp Code | Emp Name | 1 | 2 | … | 31
                  </span>
                </p>
                <p>
                  • Two rows per employee: check-in times row + check-out times
                  row
                </p>
                <p>
                  • Special values: <span className="font-mono">WO-I</span>{" "}
                  (Week Off) · <span className="font-mono">A</span> (Absent) are
                  skipped
                </p>
              </div>

              {/* Month + Year selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Month
                  </label>
                  <select
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                    className="input-field"
                  >
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Year
                  </label>
                  <select
                    value={monthlyYear}
                    onChange={(e) => setMonthlyYear(Number(e.target.value))}
                    className="input-field"
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - 2 + i,
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all"
                onClick={() => monthlyFileRef.current?.click()}
              >
                <input
                  ref={monthlyFileRef}
                  type="file"
                  accept=".xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    setMonthlyFile(e.target.files[0]);
                    setMonthlyResult(null);
                  }}
                />
                {monthlyFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-6 h-6 text-purple-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {monthlyFile.name}
                      </p>
                      <p className="text-xs text-surface-400">
                        {(monthlyFile.size / 1024).toFixed(1)} KB — click to
                        change
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-sm text-surface-400">
                      Click to select file
                    </p>
                    <p className="text-xs text-surface-300 mt-1">
                      XLS · XLSX · Max 10 MB
                    </p>
                  </>
                )}
              </div>

              {/* Result */}
              {monthlyResult && (
                <div
                  className={`rounded-xl p-4 border ${monthlyResult.inserted > 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
                >
                  <p className="font-semibold text-sm text-gray-900 mb-3">
                    {monthlyResult.message}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    {[
                      ["Inserted", monthlyResult.inserted, "text-green-700"],
                      ["Skipped", monthlyResult.skipped, "text-amber-700"],
                      ["Unmapped", monthlyResult.unmapped, "text-red-700"],
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <p className={`text-xl font-bold ${c}`}>{v}</p>
                        <p className="text-xs text-surface-500">{l}</p>
                      </div>
                    ))}
                  </div>
                  {monthlyResult.unmappedIds?.length > 0 && (
                    <p className="text-xs text-amber-700 flex gap-2 items-start">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        Unmapped Emp Codes:{" "}
                        <span className="font-mono">
                          {monthlyResult.unmappedIds.join(", ")}
                        </span>{" "}
                        — set Card No / Fingerprint ID in Employees
                      </span>
                    </p>
                  )}
                  {monthlyResult.errors?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer">
                        Show errors ({monthlyResult.errors.length})
                      </summary>
                      <ul className="mt-1 space-y-0.5">
                        {monthlyResult.errors.map((e, i) => (
                          <li
                            key={i}
                            className="text-xs text-red-600 font-mono"
                          >
                            {e}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setMonthlyModal(false)}
                  className="btn-secondary text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleMonthlyImport}
                  disabled={!monthlyFile || monthlyImporting}
                  className="btn-primary text-sm"
                >
                  <Upload className="w-4 h-4" />
                  {monthlyImporting ? "Importing…" : "Import Monthly"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ CSV IMPORT MODAL ═══════════════ */}
      {importModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setImportModal(false)}
        >
          <div
            className="bg-white rounded-[28px] w-full max-w-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader
              title="Import Attendance CSV"
              description="Export from Secureye and upload here"
              onClose={() => setImportModal(false)}
              gradient="from-cyan-600 to-blue-700"
            />

            <div className="p-6 space-y-4">
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-xs text-cyan-700 space-y-1">
                <p className="font-semibold text-cyan-800 mb-1">
                  Export steps from Secureye:
                </p>
                <p>1. Reports → Punch Report → set date range</p>
                <p>2. Export as CSV / Excel</p>
                <p>3. Upload the file below</p>
                <p className="text-cyan-600 mt-2">
                  Columns auto-detected: Emp Code · Date · Time · Direction
                </p>
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    setImportFile(e.target.files[0]);
                    setImportResult(null);
                  }}
                />
                {importFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {importFile.name}
                      </p>
                      <p className="text-xs text-surface-400">
                        {(importFile.size / 1024).toFixed(1)} KB — click to
                        change
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-sm text-surface-400">
                      Click to select file
                    </p>
                    <p className="text-xs text-surface-300 mt-1">
                      CSV · XLSX · Max 10 MB
                    </p>
                  </>
                )}
              </div>

              {/* Import result */}
              {importResult && (
                <div
                  className={`rounded-xl p-4 border ${importResult.inserted > 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
                >
                  <p className="font-semibold text-sm text-gray-900 mb-3">
                    {importResult.message}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    {[
                      ["Inserted", importResult.inserted, "text-green-700"],
                      ["Skipped", importResult.skipped, "text-amber-700"],
                      ["Unmapped", importResult.unmapped, "text-red-700"],
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <p className={`text-xl font-bold ${c}`}>{v}</p>
                        <p className="text-xs text-surface-500">{l}</p>
                      </div>
                    ))}
                  </div>
                  {importResult.unmappedIds?.length > 0 && (
                    <p className="text-xs text-amber-700 flex gap-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      Unmapped Emp Codes: {importResult.unmappedIds.join(", ")}{" "}
                      — set Fingerprint ID in Employees
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setImportModal(false)}
                  className="btn-secondary text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="btn-primary text-sm"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? "Importing…" : "Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ DELETE CONFIRM ═══════════════ */}
      {deleteId && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-white rounded-[28px] w-full max-w-sm shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-t-[28px] bg-gradient-to-br from-red-500 to-rose-600 px-6 py-5">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Delete this record?
                  </h3>
                  <p className="mt-1 text-sm text-white/70">
                    This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-surface-400 mb-6">
                This punch entry will be permanently removed and cannot be
                undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button onClick={handleDelete} className="btn-danger text-sm">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ REVIEW CORRECTION REQUEST MODAL ═══════════════ */}
      {reviewModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setReviewModal(null)}
        >
          <div
            className="bg-white rounded-[28px] w-full max-w-md shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader
              title={
                reviewModal.action === "approve"
                  ? "Approve Request"
                  : "Reject Request"
              }
              description={`${reviewModal.req.employeeId?.name} · ${fmtDate(reviewModal.req.date)}`}
              onClose={() => setReviewModal(null)}
              gradient={
                reviewModal.action === "approve"
                  ? "from-emerald-600 to-teal-700"
                  : "from-red-500 to-rose-600"
              }
            />

            <form onSubmit={handleReview} className="p-6 space-y-4">
              {/* Summary */}
              <div className="rounded-xl bg-purple-50/60 border border-purple-100 p-4 space-y-1.5 text-sm text-gray-700">
                {reviewModal.req.requestedCheckIn && (
                  <p>
                    Requested Check In:{" "}
                    <span className="font-semibold">
                      {reviewModal.req.requestedCheckIn}
                    </span>
                  </p>
                )}
                {reviewModal.req.requestedCheckOut && (
                  <p>
                    Requested Check Out:{" "}
                    <span className="font-semibold">
                      {reviewModal.req.requestedCheckOut}
                    </span>
                  </p>
                )}
                <p className="text-surface-400">
                  Reason: {reviewModal.req.reason}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                  Comment{" "}
                  <span className="text-surface-300 normal-case font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Add a comment for the employee…"
                  value={hrComment}
                  onChange={(e) => setHrComment(e.target.value)}
                  className="input-field resize-none"
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  disabled={reviewSaving}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSaving}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    reviewModal.action === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {reviewSaving
                    ? "Saving…"
                    : reviewModal.action === "approve"
                      ? "Confirm Approve"
                      : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
