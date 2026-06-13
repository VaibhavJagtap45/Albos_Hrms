"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FileUp,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/lib/auth";
import { attendanceAPI, employeeAPI, leaveAPI } from "@/lib/api";
import {
  formatDate,
  getMonthLabel,
  getMonthOptions,
  getRegularizationCategoryLabel,
  getRegularizationOutcomeLabel,
  getStatusTone,
  getYearOptions,
  REGULARIZATION_CATEGORIES,
  REGULARIZATION_WINDOW_DAYS,
  shiftMonth,
  toIsoDate,
} from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  "present",
  "late",
  "leave",
  "half-day",
  "wfh",
  "on-duty",
  "absent",
];

const EMPTY_FORM = {
  employeeId: "",
  date: toIsoDate(new Date()),
  status: "present",
  checkIn: "",
  checkOut: "",
  note: "",
};

// Import type descriptors – used to build the type-selector cards in the modal
const IMPORT_TYPES = [
  {
    id: "daily",
    label: "Daily Biometric XLS",
    icon: FileText,
    description:
      "Date-wise detailed report exported from fingerprint / ESSL devices. Contains EMP Code, Card No, In Time, Out Time and Status columns.",
    hint: "Upload the .xls file as downloaded from your biometric device.",
    needsMonth: false,
  },
  {
    id: "monthly",
    label: "Monthly Pivot Excel",
    icon: CalendarCheck,
    description:
      "Pivot-style monthly sheet where each row is an employee and each column is a day (1–31) with check-in / check-out times.",
    hint: "Select the correct month & year that this file covers.",
    needsMonth: true,
  },
  {
    id: "standard",
    label: "Standard CSV / Excel",
    icon: Upload,
    description:
      "Generic import with explicit columns: Employee ID, Date, Check In, Check Out (or Timestamp + Direction for punch logs).",
    hint: "Supports .csv, .xlsx and .xls files with flexible column names.",
    needsMonth: false,
  },
];

// ── Shared card wrapper ───────────────────────────────────────────────────────
function Card({ title, description, children, action }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-gray-900">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-sm text-surface-400">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user, isHR } = useAuth();
  const today = new Date();
  const fileInputRef = useRef(null);

  // ── Month navigation ──────────────────────────────────────────────────────
  const [monthState, setMonthState] = useState({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [importLogs, setImportLogs] = useState([]);

  // ── Filters & tabs ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("records");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── Record form modal ─────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── Import modal ──────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState("daily"); // 'daily' | 'monthly' | 'standard'
  const [importMonth, setImportMonth] = useState(today.getMonth() + 1);
  const [importYear, setImportYear] = useState(today.getFullYear());
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState("");

  // ── Correction requests (HR) ──────────────────────────────────────────────
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState("all"); // all|pending|approved|rejected
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [hrComment, setHrComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  // ── Requests (Employee) ───────────────────────────────────────────────────
  const [empTab, setEmpTab] = useState("calendar"); // 'calendar' | 'regularization'
  const [myRequests, setMyRequests] = useState([]);
  // { mode: 'present' | 'leave', dateEditable: bool }
  const [requestModal, setRequestModal] = useState(null);
  const [requestForm, setRequestForm] = useState({
    date: toIsoDate(new Date()),
    category: "missed-punch",
    checkIn: "",
    checkOut: "",
    leaveType: "full",
    reason: "",
  });
  const [requestSaving, setRequestSaving] = useState(false);

  // Window bounds for a regularization request (today back to N days ago).
  const regularizationMinDate = toIsoDate(
    new Date(Date.now() - REGULARIZATION_WINDOW_DAYS * 24 * 60 * 60 * 1000),
  );
  const todayIso = toIsoDate(new Date());

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadAttendance();
  }, [
    user,
    isHR,
    monthState.month,
    monthState.year,
    departmentFilter,
    employeeFilter,
    statusFilter,
    activeTab,
  ]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const recordPromise = attendanceAPI.list({
          month: monthState.month,
          year: monthState.year,
          department: departmentFilter || undefined,
          employeeId: employeeFilter || undefined,
          status: statusFilter || undefined,
          limit: 300,
        });

        const importPromise =
          activeTab === "imports"
            ? attendanceAPI.importLogs()
            : Promise.resolve({ data: { logs: [] } });

        const correctionPromise = attendanceAPI.listCorrectionRequests({
          month: monthState.month,
          year: monthState.year,
        });

        const [recordsRes, employeesRes, departmentsRes, importLogsRes, correctionRes] =
          await Promise.all([
            recordPromise,
            employeeAPI.list({ limit: 300, isActive: true }),
            employeeAPI.departments(),
            importPromise,
            correctionPromise,
          ]);

        setRecords(recordsRes.data.records);
        setEmployees(employeesRes.data.employees);
        setDepartments(departmentsRes.data.departments);
        setImportLogs(importLogsRes.data.logs);
        setCorrectionRequests(correctionRes.data.requests || []);
        setHolidays([]);
        return;
      }

      const [monthRes, myRequestsRes] = await Promise.all([
        attendanceAPI.getMyMonth(monthState.month, monthState.year),
        attendanceAPI.getMyCorrectionRequests({
          month: monthState.month,
          year: monthState.year,
        }),
      ]);
      const { data } = monthRes;
      setRecords(data.records);
      setHolidays(data.holidays);
      setMyRequests(myRequestsRes.data.requests || []);

      const defaultDate =
        monthState.month === today.getMonth() + 1 &&
        monthState.year === today.getFullYear()
          ? today
          : new Date(monthState.year, monthState.month - 1, 1);

      setSelectedDate(defaultDate);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load attendance data.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Record form handlers ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditRecord(null);
    setForm({
      ...EMPTY_FORM,
      date: toIsoDate(
        new Date(monthState.year, monthState.month - 1, today.getDate()),
      ),
    });
    setShowForm(true);
  };

  const openEdit = (record) => {
    const employee = record.employee || record.employeeId || {};
    setEditRecord(record);
    setForm({
      employeeId: employee._id || "",
      date: toIsoDate(record.date),
      status: record.status || "present",
      checkIn: record.checkIn || "",
      checkOut: record.checkOut || "",
      note: record.note || "",
    });
    setShowForm(true);
  };

  const handleSaveRecord = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        date: form.date,
        status: form.status,
        note: form.note.trim(),
      };
      if (form.checkIn) payload.checkIn = form.checkIn;
      if (form.checkOut) payload.checkOut = form.checkOut;

      if (editRecord) {
        await attendanceAPI.update(editRecord._id, payload);
        toast.success("Attendance record updated.");
      } else {
        await attendanceAPI.create(payload);
        toast.success("Attendance record created.");
      }

      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadAttendance();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save attendance record.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await attendanceAPI.delete(deleteId);
      toast.success("Attendance record deleted.");
      setDeleteId("");
      await loadAttendance();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete attendance record.",
      );
    }
  };

  // ── Import handlers ───────────────────────────────────────────────────────
  const openImport = () => {
    setImportType("daily");
    setImportMonth(monthState.month);
    setImportYear(monthState.year);
    setSelectedFile(null);
    setImportResult(null);
    setShowImport(true);
  };

  const closeImport = () => {
    if (importing) return; // prevent accidental close while uploading
    setShowImport(false);
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please choose a file before importing.");
      return;
    }

    const needsMonth = IMPORT_TYPES.find(
      (t) => t.id === importType,
    )?.needsMonth;
    if (needsMonth && (!importMonth || !importYear)) {
      toast.error("Please select the month and year for this import.");
      return;
    }

    setImporting(true);
    try {
      let res;
      if (importType === "daily") {
        res = await attendanceAPI.dailyUpload(selectedFile);
      } else if (importType === "monthly") {
        res = await attendanceAPI.monthlyUpload(
          selectedFile,
          importMonth,
          importYear,
        );
      } else {
        res = await attendanceAPI.bulkUpload(selectedFile);
      }

      setImportResult(res.data);
      toast.success(res.data.message || "Attendance imported successfully.");
      await loadAttendance();
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Import failed. Please check the file format.";
      toast.error(msg);
      setImportResult({
        error: true,
        message: msg,
        errors: error.response?.data?.errors || [],
      });
    } finally {
      setImporting(false);
    }
  };

  // ── Correction request review handlers ───────────────────────────────────
  const openReview = (req, action) => {
    setReviewingRequest({ req, action });
    setHrComment("");
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewingRequest) return;
    setReviewSaving(true);
    try {
      const { req, action } = reviewingRequest;
      if (action === "approve") {
        await attendanceAPI.approveCorrectionRequest(req._id, hrComment);
        toast.success("Request approved and attendance updated.");
      } else {
        await attendanceAPI.rejectCorrectionRequest(req._id, hrComment);
        toast.success("Request rejected.");
      }
      setReviewingRequest(null);
      setHrComment("");
      await loadAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to review request.");
    } finally {
      setReviewSaving(false);
    }
  };

  // ── Employee request handlers (regularization / leave) ────────────────────
  // `date` may be a Date (from the calendar) or null (raise from the tab, where
  // the employee picks the date). `dateEditable` controls whether the date field
  // is editable in the modal.
  const openRequest = (date, mode, dateEditable = false) => {
    setRequestModal({ mode, dateEditable });
    setRequestForm({
      date: date ? toIsoDate(date) : toIsoDate(new Date()),
      category: "missed-punch",
      checkIn: "",
      checkOut: "",
      leaveType: "full",
      reason: "",
    });
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!requestModal) return;
    if (!requestForm.date) {
      toast.error("Please choose a date.");
      return;
    }
    if (!requestForm.reason.trim()) {
      toast.error("Please add a reason for your request.");
      return;
    }

    setRequestSaving(true);
    try {
      const iso = requestForm.date;
      if (requestModal.mode === "present") {
        await attendanceAPI.submitCorrectionRequest({
          type: "present",
          date: iso,
          category: requestForm.category,
          requestedCheckIn: requestForm.checkIn || undefined,
          requestedCheckOut: requestForm.checkOut || undefined,
          reason: requestForm.reason.trim(),
        });
        toast.success("Regularization request sent to HR for approval.");
      } else {
        await leaveAPI.apply({
          leaveType: requestForm.leaveType,
          fromDate: iso,
          toDate: iso,
          reason: requestForm.reason.trim(),
        });
        toast.success("Leave request sent to HR for approval.");
      }
      setRequestModal(null);
      setEmpTab("regularization");
      await loadAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setRequestSaving(false);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const recordStats = {
    total: records.length,
    present: records.filter((r) =>
      ["present", "wfh", "on-duty"].includes(r.status),
    ).length,
    late: records.filter((r) => r.status === "late").length,
    leave: records.filter((r) => ["leave", "half-day"].includes(r.status))
      .length,
  };

  // HR Requests tab — honor the status chip + the existing employee/department
  // filters (filtered client-side from the month's already-loaded requests).
  const visibleRequests = correctionRequests.filter((req) => {
    if (requestStatusFilter !== "all" && req.status !== requestStatusFilter)
      return false;
    if (employeeFilter && String(req.employeeId?._id) !== String(employeeFilter))
      return false;
    if (departmentFilter && req.employeeId?.department !== departmentFilter)
      return false;
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <PageHeader
          title="Attendance"
          description={
            isHR
              ? "Manage monthly attendance records, corrections, and imports."
              : "Review your monthly attendance calendar with daily details."
          }
          actions={
            isHR
              ? [
                  <button
                    key="import"
                    type="button"
                    onClick={openImport}
                    className="btn-secondary text-sm"
                  >
                    <FileUp className="h-4 w-4" />
                    Import File
                  </button>,
                  <button
                    key="create"
                    type="button"
                    onClick={openCreate}
                    className="btn-primary text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    New Record
                  </button>,
                ]
              : undefined
          }
        />

        {/* ── Month navigation ─────────────────────────────────────────────── */}
        <div className="glass-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthState((cur) => shiftMonth(cur, -1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:bg-surface-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="rounded-2xl bg-surface-50 px-4 py-3 text-sm font-semibold text-gray-900">
                {getMonthLabel(monthState.year, monthState.month)}
              </div>
              <button
                type="button"
                onClick={() => setMonthState((cur) => shiftMonth(cur, 1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:bg-surface-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center">
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
                  setMonthState((cur) => ({
                    ...cur,
                    year: Number(e.target.value),
                  }))
                }
                className="input-field min-w-[140px]"
              >
                {getYearOptions(4).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── HR view ─────────────────────────────────────────────────────── */}
        {isHR ? (
          <>
            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={CalendarCheck}
                label="Records"
                value={recordStats.total}
                tone="bg-brand-100 text-brand-700"
                subtext="Attendance entries loaded"
              />
              <StatCard
                icon={CalendarCheck}
                label="Present"
                value={recordStats.present}
                tone="bg-green-100 text-green-700"
                subtext="Employees marked present"
              />
              <StatCard
                icon={CalendarCheck}
                label="Late"
                value={recordStats.late}
                tone="bg-amber-100 text-amber-700"
                subtext="Late arrivals this month"
              />
              <StatCard
                icon={CalendarCheck}
                label="Leave"
                value={recordStats.leave}
                tone="bg-blue-100 text-blue-700"
                subtext="Leave and half-day records"
              />
            </div>

            {/* Filter bar + tab switcher */}
            <div className="glass-card p-4">
              <div className="grid gap-3 lg:grid-cols-[180px_220px_180px_1fr]">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeId || "Auto"} – {emp.name}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentFilter("");
                      setEmployeeFilter("");
                      setStatusFilter("");
                    }}
                    className="btn-secondary text-sm"
                  >
                    Reset Filters
                  </button>
                  <div className="ml-auto flex rounded-2xl bg-surface-100 p-1">
                    {[
                      { id: "records", label: "Records" },
                      { id: "requests", label: "Requests", badge: correctionRequests.filter((r) => r.status === "pending").length },
                      { id: "imports", label: "Import Logs" },
                    ].map(({ id, label, badge }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        className={`relative rounded-xl px-3 py-2 text-sm font-medium transition ${
                          activeTab === id
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-surface-500 hover:text-gray-700"
                        }`}
                      >
                        {label}
                        {badge > 0 && (
                          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Records table */}
            {activeTab === "records" ? (
              <div className="glass-card overflow-hidden">
                {loading ? (
                  <div className="p-10 text-center text-sm text-surface-400">
                    Loading attendance records…
                  </div>
                ) : records.length === 0 ? (
                  <EmptyState
                    icon={CalendarCheck}
                    title="No attendance records found"
                    description="Create a new attendance record or import attendance data for this month."
                    action={
                      <button
                        type="button"
                        onClick={openCreate}
                        className="btn-primary text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        New Record
                      </button>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px]">
                      <thead>
                        <tr className="border-b border-surface-200 bg-surface-50">
                          {[
                            "Employee",
                            "Date",
                            "Status",
                            "Check In",
                            "Check Out",
                            "Hours",
                            "Source",
                            "Actions",
                          ].map((h) => (
                            <th
                              key={h}
                              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500 ${
                                h === "Actions" ? "text-right" : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {records.map((record) => {
                          const emp =
                            record.employee || record.employeeId || {};
                          return (
                            <tr
                              key={record._id}
                              className="hover:bg-surface-50/80"
                            >
                              <td className="px-5 py-4">
                                <p className="text-sm font-semibold text-gray-900">
                                  {emp.name || "Unknown Employee"}
                                </p>
                                <p className="text-xs text-surface-400">
                                  {emp.employeeId || "–"} ·{" "}
                                  {emp.department || "No dept"}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`status-badge ${getStatusTone(record.status)}`}
                                >
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700">
                                {record.checkIn || "–"}
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700">
                                {record.checkOut || "–"}
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700">
                                {record.workingHours
                                  ? `${record.workingHours} hrs`
                                  : "–"}
                              </td>
                              <td className="px-5 py-4 text-sm capitalize text-gray-700">
                                {record.source || "manual"}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(record)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                                    title="Edit record"
                                  >
                                    <Plus className="h-4 w-4 rotate-45" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteId(record._id)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                    title="Delete record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
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
            ) : activeTab === "requests" ? (
              /* ── Correction Requests tab ─────────────────────────────── */
              <Card
                title="Attendance Requests"
                description="Employee regularization & time-correction requests for this month."
              >
                {/* Status filter chips */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {["all", "pending", "approved", "rejected"].map((s) => {
                    const count =
                      s === "all"
                        ? correctionRequests.length
                        : correctionRequests.filter((r) => r.status === s)
                            .length;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRequestStatusFilter(s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                          requestStatusFilter === s
                            ? "bg-brand-600 text-white"
                            : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                        }`}
                      >
                        {s} ({count})
                      </button>
                    );
                  })}
                </div>
                {loading ? (
                  <p className="text-sm text-surface-400">
                    Loading requests…
                  </p>
                ) : visibleRequests.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-surface-200 bg-surface-50">
                          {[
                            "Employee",
                            "Date",
                            "Category",
                            "Current Times",
                            "Requested Times",
                            "Reason",
                            "Status",
                            "Actions",
                          ].map((h) => (
                            <th
                              key={h}
                              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500 ${h === "Actions" ? "text-right" : "text-left"}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {visibleRequests.map((req) => {
                          const emp = req.employeeId || {};
                          const att = req.attendanceId || {};
                          const statusTone = {
                            pending: "bg-amber-100 text-amber-700",
                            approved: "bg-green-100 text-green-700",
                            rejected: "bg-red-100 text-red-700",
                          }[req.status] || "";
                          return (
                            <tr key={req._id} className="hover:bg-surface-50/80">
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold text-gray-900">
                                  {emp.name || "—"}
                                </p>
                                <p className="text-xs text-surface-400">
                                  {emp.employeeId || ""} · {emp.department || ""}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {formatDate(req.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    req.type === "present"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-surface-100 text-surface-600"
                                  }`}
                                >
                                  {req.type === "present"
                                    ? getRegularizationCategoryLabel(
                                        req.category,
                                      )
                                    : "Time Correction"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="block">In: {att.checkIn || "—"}</span>
                                <span className="block">Out: {att.checkOut || "—"}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {req.requestedCheckIn && (
                                  <span className="block text-brand-700 font-medium">
                                    In: {req.requestedCheckIn}
                                  </span>
                                )}
                                {req.requestedCheckOut && (
                                  <span className="block text-brand-700 font-medium">
                                    Out: {req.requestedCheckOut}
                                  </span>
                                )}
                                {req.type === "present" &&
                                  !req.requestedCheckIn &&
                                  !req.requestedCheckOut && (
                                    <span className="block text-xs text-surface-400">
                                      Default office hours
                                    </span>
                                  )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px]">
                                <span className="line-clamp-2">{req.reason}</span>
                                {req.hrComment && (
                                  <span className="block text-xs text-surface-400 mt-0.5">
                                    HR: {req.hrComment}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`status-badge ${statusTone}`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {req.status === "pending" ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openReview(req, "approve")}
                                      className="inline-flex items-center gap-1 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openReview(req, "reject")}
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
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock}
                    title="No correction requests"
                    description="Employee time correction requests for this month will appear here."
                  />
                )}
              </Card>
            ) : (
              /* Import logs tab */
              <Card
                title="Import History"
                description="Recent attendance import runs with processing details."
              >
                {loading ? (
                  <p className="text-sm text-surface-400">
                    Loading import history…
                  </p>
                ) : importLogs.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-surface-200 bg-surface-50">
                          {[
                            "Imported At",
                            "File",
                            "Status",
                            "Inserted",
                            "Skipped",
                            "Unmapped",
                            "Imported By",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {importLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-surface-50/80">
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatDate(log.createdAt)}
                            </td>
                            <td
                              className="px-4 py-3 text-sm text-gray-700 max-w-[220px] truncate"
                              title={log.fileName}
                            >
                              {log.fileName || "–"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`status-badge ${getStatusTone(log.status)}`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {log.recordsInserted}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {log.recordsSkipped}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {log.recordsUnmapped}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {log.importedBy?.name || "–"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={Download}
                    title="No imports yet"
                    description="Imported attendance files will appear here with processing details."
                  />
                )}
              </Card>
            )}
          </>
        ) : (
          /* ── Employee view ──────────────────────────────────────────────── */
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={CalendarCheck}
                label="Present"
                value={
                  records.filter((r) =>
                    ["present", "wfh", "on-duty"].includes(r.status),
                  ).length
                }
                tone="bg-green-100 text-green-700"
                subtext="Present, WFH & on-duty days"
              />
              <StatCard
                icon={CalendarCheck}
                label="Late"
                value={records.filter((r) => r.status === "late").length}
                tone="bg-amber-100 text-amber-700"
                subtext="Late arrivals this month"
              />
              <StatCard
                icon={CalendarCheck}
                label="Leave"
                value={
                  records.filter((r) =>
                    ["leave", "half-day"].includes(r.status),
                  ).length
                }
                tone="bg-blue-100 text-blue-700"
                subtext="Leave and half-day records"
              />
              <StatCard
                icon={CalendarCheck}
                label="Holidays"
                value={holidays.length}
                tone="bg-surface-100 text-surface-500"
                subtext="Published holidays in month"
              />
            </div>

            {/* Tab switcher: Calendar | Regularization */}
            <div className="glass-card p-2">
              <div className="flex rounded-2xl bg-surface-100 p-1">
                {[
                  { id: "calendar", label: "Calendar" },
                  {
                    id: "regularization",
                    label: "Regularization",
                    badge: myRequests.filter((r) => r.status === "pending")
                      .length,
                  },
                ].map(({ id, label, badge }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEmpTab(id)}
                    className={`relative flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      empTab === id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-surface-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                    {badge > 0 && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {empTab === "calendar" ? (
              <>
            <Card
              title="Monthly Attendance Calendar"
              description="Select any date to view check-in, check-out, and holiday details."
            >
              {loading ? (
                <p className="text-sm text-surface-400">
                  Loading your attendance calendar…
                </p>
              ) : (
                <AttendanceCalendar
                  year={monthState.year}
                  month={monthState.month}
                  records={records}
                  holidays={holidays}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onRequest={openRequest}
                />
              )}
            </Card>

            <Card
              title="Attendance Highlights"
              description="Daily records for the selected month."
            >
              {records.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-surface-200 bg-surface-50">
                        {[
                          "Date",
                          "Status",
                          "Check In",
                          "Check Out",
                          "Working Hours",
                          "Note",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {records.map((record) => (
                        <tr key={record._id} className="hover:bg-surface-50/80">
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`status-badge ${getStatusTone(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {record.checkIn || "–"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {record.checkOut || "–"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {record.workingHours
                              ? `${record.workingHours} hrs`
                              : "–"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {record.note || "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={CalendarCheck}
                  title="No attendance records available"
                  description="Your attendance will appear here once records are available for the selected month."
                />
              )}
            </Card>
              </>
            ) : (
              <Card
                title="Attendance Regularization"
                description={`Raise a request to be marked present on a day you missed punching (within the last ${REGULARIZATION_WINDOW_DAYS} days). HR will review and approve it.`}
                action={
                  <button
                    type="button"
                    onClick={() => openRequest(null, "present", true)}
                    className="btn-primary text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    New Regularization
                  </button>
                }
              >
              {myRequests.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-surface-200 bg-surface-50">
                        {[
                          "Date",
                          "Category",
                          "Requested Times",
                          "Reason",
                          "Status",
                          "HR Comment",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {myRequests.map((req) => {
                        const statusTone =
                          {
                            pending: "bg-amber-100 text-amber-700",
                            approved: "bg-green-100 text-green-700",
                            rejected: "bg-red-100 text-red-700",
                          }[req.status] || "bg-surface-100 text-surface-500";
                        return (
                          <tr key={req._id} className="hover:bg-surface-50/80">
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {formatDate(req.date)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="status-badge bg-surface-100 text-surface-600">
                                {req.type === "present"
                                  ? getRegularizationCategoryLabel(req.category)
                                  : "Time Correction"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {req.requestedCheckIn || req.requestedCheckOut ? (
                                <>
                                  {req.requestedCheckIn && (
                                    <span className="block">
                                      In: {req.requestedCheckIn}
                                    </span>
                                  )}
                                  {req.requestedCheckOut && (
                                    <span className="block">
                                      Out: {req.requestedCheckOut}
                                    </span>
                                  )}
                                </>
                              ) : (
                                "–"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 max-w-[220px]">
                              <span className="line-clamp-2">{req.reason}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`status-badge ${statusTone}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-surface-500 max-w-[180px]">
                              <span className="line-clamp-2">
                                {req.hrComment || "–"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={Clock}
                  title="No requests yet"
                  description="Raise a regularization request for a day you missed, or use Request Present on the calendar."
                  action={
                    <button
                      type="button"
                      onClick={() => openRequest(null, "present", true)}
                      className="btn-primary text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      New Regularization
                    </button>
                  }
                />
              )}
            </Card>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          IMPORT MODAL
          Three modes: Daily Biometric XLS | Monthly Pivot Excel | Standard CSV/Excel
      ════════════════════════════════════════════════════════════════════════ */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-surface-200 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  Import Attendance
                </h2>
                <p className="mt-0.5 text-sm text-surface-400">
                  Choose the file type that matches your export.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImport}
                disabled={importing}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:bg-surface-50 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* ── Type selector cards ─────────────────────────────────────── */}
              {!importResult && (
                <div className="grid gap-3">
                  {IMPORT_TYPES.map(
                    ({ id, label, icon: Icon, description }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setImportType(id);
                          setSelectedFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        className={`flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
                          importType === id
                            ? "border-brand-500 bg-brand-50"
                            : "border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            importType === id
                              ? "bg-brand-100 text-brand-700"
                              : "bg-surface-100 text-surface-500"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold ${importType === id ? "text-brand-700" : "text-gray-900"}`}
                          >
                            {label}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-surface-400">
                            {description}
                          </p>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              )}

              {/* ── Month / year picker (monthly import only) ──────────────── */}
              {!importResult && importType === "monthly" && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-800">
                    Select the month &amp; year this file covers
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={importMonth}
                      onChange={(e) => setImportMonth(Number(e.target.value))}
                      className="input-field"
                    >
                      {getMonthOptions().map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={importYear}
                      onChange={(e) => setImportYear(Number(e.target.value))}
                      className="input-field"
                    >
                      {getYearOptions(4).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── File picker ─────────────────────────────────────────────── */}
              {!importResult && (
                <>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-surface-500 uppercase tracking-wider">
                      {IMPORT_TYPES.find((t) => t.id === importType)?.hint}
                    </p>
                    <label
                      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
                        selectedFile
                          ? "border-brand-300 bg-brand-50"
                          : "border-surface-300 hover:border-brand-300 hover:bg-brand-50/40"
                      }`}
                    >
                      <FileUp
                        className={`h-8 w-8 ${selectedFile ? "text-brand-500" : "text-surface-400"}`}
                      />
                      {selectedFile ? (
                        <>
                          <span className="text-sm font-semibold text-brand-700">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-surface-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB · Click
                            to change file
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-gray-700">
                            Click to choose a file
                          </span>
                          <span className="text-xs text-surface-400">
                            {importType === "standard"
                              ? ".csv, .xlsx, .xls accepted"
                              : ".xls, .xlsx accepted"}
                          </span>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        accept={
                          importType === "standard"
                            ? ".csv,.xlsx,.xls"
                            : ".xls,.xlsx"
                        }
                        onChange={handleFileChange}
                        disabled={importing}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || !selectedFile}
                    className="btn-primary w-full justify-center text-sm disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Importing…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import{" "}
                        {IMPORT_TYPES.find((t) => t.id === importType)?.label}
                      </>
                    )}
                  </button>
                </>
              )}

              {/* ── Import result ───────────────────────────────────────────── */}
              {importResult && (
                <div className="space-y-4">
                  {importResult.error ? (
                    <div className="flex gap-3 rounded-2xl bg-red-50 border border-red-200 p-4">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">
                          Import failed
                        </p>
                        <p className="mt-0.5 text-sm text-red-600">
                          {importResult.message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 rounded-2xl bg-green-50 border border-green-200 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-700">
                          Import complete
                        </p>
                        <p className="mt-0.5 text-sm text-green-600">
                          {importResult.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Result breakdown */}
                  {!importResult.error && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Inserted",
                          value: importResult.inserted ?? 0,
                          color: "text-green-700 bg-green-50",
                        },
                        {
                          label: "Skipped",
                          value: importResult.skipped ?? 0,
                          color: "text-amber-700 bg-amber-50",
                        },
                        {
                          label: "Unmapped",
                          value: importResult.unmapped ?? 0,
                          color: "text-red-700 bg-red-50",
                        },
                      ].map(({ label, value, color }) => (
                        <div
                          key={label}
                          className={`rounded-2xl p-3 text-center ${color}`}
                        >
                          <p className="text-xl font-bold">{value}</p>
                          <p className="text-xs font-medium">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unmapped IDs */}
                  {importResult.unmappedIds?.length > 0 && (
                    <div className="rounded-2xl bg-surface-50 p-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-500">
                        Unmapped employee codes
                      </p>
                      <p className="text-xs text-gray-700 break-words">
                        {importResult.unmappedIds.slice(0, 20).join(", ")}
                        {importResult.unmappedIds.length > 20 &&
                          ` …and ${importResult.unmappedIds.length - 20} more`}
                      </p>
                    </div>
                  )}

                  {/* Row-level errors */}
                  {importResult.errors?.length > 0 && (
                    <div className="rounded-2xl bg-surface-50 p-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-500">
                        Row errors (first{" "}
                        {Math.min(importResult.errors.length, 10)})
                      </p>
                      <ul className="space-y-1">
                        {importResult.errors.slice(0, 10).map((e, i) => (
                          <li key={i} className="text-xs text-red-600">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setImportResult(null);
                        setSelectedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="btn-secondary flex-1 justify-center text-sm"
                    >
                      Import Another File
                    </button>
                    <button
                      type="button"
                      onClick={closeImport}
                      className="btn-primary flex-1 justify-center text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          RECORD FORM MODAL  (Create / Edit)
      ════════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-200 px-6 py-5">
              <h2 className="font-display text-xl font-bold text-gray-900">
                {editRecord
                  ? "Edit Attendance Record"
                  : "New Attendance Record"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:bg-surface-50 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 px-6 py-5">
              {/* Employee select */}
              <div>
                <label className="label-text">Employee</label>
                <select
                  value={form.employeeId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, employeeId: e.target.value }))
                  }
                  required
                  className="input-field"
                  disabled={!!editRecord}
                >
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeId || "Auto"} – {emp.name} (
                      {emp.department || "No dept"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="label-text">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  required
                  className="input-field"
                />
              </div>

              {/* Status */}
              <div>
                <label className="label-text">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="input-field"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Check-in / Check-out */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Check In</label>
                  <input
                    type="time"
                    value={form.checkIn}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, checkIn: e.target.value }))
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text">Check Out</label>
                  <input
                    type="time"
                    value={form.checkOut}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, checkOut: e.target.value }))
                    }
                    className="input-field"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="label-text">
                  Note <span className="text-surface-400">(optional)</span>
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  rows={2}
                  maxLength={500}
                  placeholder="Reason, correction note, etc."
                  className="input-field resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1 justify-center text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 justify-center text-sm"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving…
                    </>
                  ) : editRecord ? (
                    "Save Changes"
                  ) : (
                    "Create Record"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          DELETE CONFIRM MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900">
              Delete Record?
            </h3>
            <p className="mt-1 text-sm text-surface-400">
              This attendance record will be permanently removed. This action
              cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId("")}
                className="btn-secondary flex-1 justify-center text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── HR Review Modal ─────────────────────────────────────────────── */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-200 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  {reviewingRequest.action === "approve"
                    ? "Approve Request"
                    : "Reject Request"}
                </h2>
                <p className="mt-0.5 text-sm text-surface-400">
                  {reviewingRequest.req.employeeId?.name} ·{" "}
                  {formatDate(reviewingRequest.req.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                disabled={reviewSaving}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:bg-surface-50 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleReview} className="space-y-4 px-6 py-5">
              {/* Request summary */}
              <div className="rounded-2xl bg-surface-50 p-4 space-y-1 text-sm text-gray-700">
                {reviewingRequest.req.requestedCheckIn && (
                  <p>
                    Requested Check In:{" "}
                    <span className="font-semibold">
                      {reviewingRequest.req.requestedCheckIn}
                    </span>
                  </p>
                )}
                {reviewingRequest.req.requestedCheckOut && (
                  <p>
                    Requested Check Out:{" "}
                    <span className="font-semibold">
                      {reviewingRequest.req.requestedCheckOut}
                    </span>
                  </p>
                )}
                <p className="text-surface-400">
                  Reason: {reviewingRequest.req.reason}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-surface-500">
                  Comment (optional)
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
                  onClick={() => setReviewingRequest(null)}
                  disabled={reviewSaving}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSaving}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    reviewingRequest.action === "approve"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  }`}
                >
                  {reviewSaving
                    ? "Saving…"
                    : reviewingRequest.action === "approve"
                      ? "Confirm Approve"
                      : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          EMPLOYEE REQUEST MODAL  (Request Present / Apply Leave)
      ════════════════════════════════════════════════════════════════════════ */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-200 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  {requestModal.mode === "present"
                    ? "Regularize Attendance"
                    : "Apply for Leave"}
                </h2>
                <p className="mt-0.5 text-sm text-surface-400">
                  {requestForm.date
                    ? formatDate(requestForm.date)
                    : "Choose a date below"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestModal(null)}
                disabled={requestSaving}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 transition hover:bg-surface-50 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitRequest} className="space-y-4 px-6 py-5">
              {requestModal.mode === "present" ? (
                <>
                  <p className="rounded-2xl bg-green-50 border border-green-100 p-3 text-xs text-green-700">
                    Ask HR to mark you present on this date (within the last{" "}
                    {REGULARIZATION_WINDOW_DAYS} days). Pick a reason and,
                    optionally, the times you worked.
                  </p>
                  {requestModal.dateEditable && (
                    <div>
                      <label className="label-text">Date</label>
                      <input
                        type="date"
                        value={requestForm.date}
                        min={regularizationMinDate}
                        max={todayIso}
                        onChange={(e) =>
                          setRequestForm((f) => ({ ...f, date: e.target.value }))
                        }
                        required
                        className="input-field"
                      />
                    </div>
                  )}
                  <div>
                    <label className="label-text">Reason Type</label>
                    <select
                      value={requestForm.category}
                      onChange={(e) =>
                        setRequestForm((f) => ({
                          ...f,
                          category: e.target.value,
                        }))
                      }
                      className="input-field"
                    >
                      {REGULARIZATION_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-surface-400">
                      If approved, this day will be marked as{" "}
                      <span className="font-semibold text-gray-700">
                        {getRegularizationOutcomeLabel(requestForm.category)}
                      </span>
                      .
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">
                        Check In{" "}
                        <span className="text-surface-400">(optional)</span>
                      </label>
                      <input
                        type="time"
                        value={requestForm.checkIn}
                        onChange={(e) =>
                          setRequestForm((f) => ({
                            ...f,
                            checkIn: e.target.value,
                          }))
                        }
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label-text">
                        Check Out{" "}
                        <span className="text-surface-400">(optional)</span>
                      </label>
                      <input
                        type="time"
                        value={requestForm.checkOut}
                        onChange={(e) =>
                          setRequestForm((f) => ({
                            ...f,
                            checkOut: e.target.value,
                          }))
                        }
                        className="input-field"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
                    This applies for leave on this date. HR will review and
                    approve it against your leave balance.
                  </p>
                  <div>
                    <label className="label-text">Leave Type</label>
                    <select
                      value={requestForm.leaveType}
                      onChange={(e) =>
                        setRequestForm((f) => ({
                          ...f,
                          leaveType: e.target.value,
                        }))
                      }
                      className="input-field"
                    >
                      <option value="full">Full Day</option>
                      <option value="half">Half Day</option>
                      <option value="sick">Sick Leave</option>
                      <option value="casual">Casual Leave</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="label-text">Reason</label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) =>
                    setRequestForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  rows={3}
                  maxLength={500}
                  required
                  placeholder="Briefly explain your request…"
                  className="input-field resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRequestModal(null)}
                  disabled={requestSaving}
                  className="btn-secondary flex-1 justify-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSaving}
                  className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
                >
                  {requestSaving ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
