"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Fingerprint,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  UserCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import { employeeAPI } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getInitials,
  getStatusTone,
  toIsoDate,
} from "@/lib/utils";

/* ─── form default ───────────────────────────────────────────── */
const EMPTY_FORM = {
  employeeId: "",
  name: "",
  email: "",
  password: "",
  role: "employee",
  department: "",
  designation: "",
  salary: "",
  phone: "",
  doj: toIsoDate(new Date()),
  fingerprintId: "",
  leaveBalance: "12",
  profilePic: "",
  isActive: true,
  bankName: "",
  bankAccountNo: "",
  confirmAccountNo: "",
  ifscCode: "",
  branchName: "",
};

/* ─── Excel helpers (unchanged logic) ───────────────────────── */
async function parseExcelPreview(file) {
  const XLSX = await import("xlsx");
  const lib = XLSX.default || XLSX;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = lib.read(new Uint8Array(e.target.result), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = lib.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
        let headerIdx = -1, headers = [];
        for (let i = 0; i < rawRows.length; i++) {
          const joined = rawRows[i].map((c) => String(c || "").toLowerCase().trim()).join("|");
          if (joined.includes("name") && (joined.includes("employee code") || joined.includes("card no") || joined.includes("department"))) {
            headerIdx = i;
            headers = rawRows[i].map((c) => String(c || "").toLowerCase().trim());
            break;
          }
        }
        if (headerIdx === -1) return reject(new Error("Header row not found. Expected columns: Employee Code, Card No, Name, Department, Designation, Joining Date."));
        const col = (aliases) => { const i = headers.findIndex((h) => aliases.includes(h)); return i >= 0 ? i : null; };
        const m = {
          empCode: col(["employee code", "emp code", "empcode"]),
          cardNo: col(["card no", "card number", "cardno"]),
          name: col(["name", "emp name", "employee name"]),
          loc: col(["branch/location", "location", "branch"]),
          dept: col(["department", "dept"]),
          desig: col(["designation", "position"]),
          doj: col(["joining date", "date of joining", "doj"]),
          empType: col(["employment type", "emp type", "type"]),
        };
        const get = (row, idx) => idx !== null ? String(row[idx] || "").trim() : "";
        const rows = rawRows.slice(headerIdx + 1).map((r) => ({
          empCode: get(r, m.empCode), cardNo: get(r, m.cardNo), name: get(r, m.name),
          location: get(r, m.loc) || get(r, m.dept), department: get(r, m.dept),
          designation: get(r, m.desig), doj: get(r, m.doj), empType: get(r, m.empType),
        })).filter((r) => r.name);
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  import("xlsx").then((mod) => {
    const lib = mod.default || mod;
    const header = ["Employee Information", ...Array(15).fill("")];
    const colsRow = ["Employee Code","Card No","Name","Father's Name","Branch/Location","Department","Designation","Group","Birth Date","Joining Date","Gender","Employment Type","Aadhar No","PAN No","DL No","Address"];
    const sample = [
      ["1","1","Aditya Kore","","Delhi","Human Resource","HR","Emp Group","01/01/1995","13/03/2026","Male","Permanent","","","",""],
      ["2","2","Nihal Wasnik","","Delhi","Business Development","BDE","Emp Group","15/06/1998","13/03/2026","Male","Permanent","","","",""],
    ];
    const ws = lib.utils.aoa_to_sheet([header, colsRow, ...sample]);
    const wb = lib.utils.book_new();
    lib.utils.book_append_sheet(wb, ws, "Sheet1");
    lib.writeFile(wb, "employee_import_template.xlsx");
  });
}

/* ─── Design primitives ──────────────────────────────────────── */
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

function FormLabel({ children }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
      {children}
    </label>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function EmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deactivateId, setDeactivateId] = useState("");

  const [visiblePwIds, setVisiblePwIds] = useState({});
  const [resetPwTarget, setResetPwTarget] = useState(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [resetPwShow, setResetPwShow] = useState(false);
  const [resetPwSaving, setResetPwSaving] = useState(false);

  const [viewEmployee, setViewEmployee] = useState(null);
  const [showViewPw, setShowViewPw] = useState(false);

  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState(null);
  const [importParseErr, setImportParseErr] = useState("");
  const [importParsing, setImportParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => loadEmployees(), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, department, role, status]);

  useEffect(() => { loadMeta(); }, []);

  const loadMeta = async () => {
    try {
      const [dr, sr] = await Promise.all([employeeAPI.departments(), employeeAPI.stats()]);
      setDepartments(dr.data.departments);
      setStats(sr.data);
    } catch { toast.error("Failed to load metadata."); }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (department) params.department = department;
      if (role) params.role = role;
      if (status) params.isActive = status === "active";
      const { data } = await employeeAPI.list(params);
      setEmployees(data.employees);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees.");
    } finally { setLoading(false); }
  };

  const openCreate = () => { setEditEmployee(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (emp) => {
    setEditEmployee(emp);
    setForm({
      employeeId: emp.employeeId || "", name: emp.name || "", email: emp.email || "",
      password: "", role: emp.role || "employee", department: emp.department || "",
      designation: emp.designation || emp.position || "", salary: String(emp.salary ?? ""),
      phone: emp.phone || "", doj: emp.doj ? toIsoDate(emp.doj) : toIsoDate(new Date()),
      fingerprintId: emp.fingerprintId ?? "", leaveBalance: String(emp.leaveBalance ?? 12),
      profilePic: emp.profilePic || emp.avatar || "", isActive: emp.isActive !== false,
      bankName: emp.bankName || "", bankAccountNo: emp.bankAccountNo || "",
      confirmAccountNo: emp.bankAccountNo || "", ifscCode: emp.ifscCode || "", branchName: emp.branchName || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editEmployee && form.bankAccountNo !== form.confirmAccountNo) {
        toast.error("Bank account numbers do not match.");
        setSaving(false);
        return;
      }
      const p = {
        employeeId: form.employeeId || undefined, name: form.name.trim(), email: form.email.trim(),
        password: form.password || undefined, role: form.role, department: form.department.trim(),
        designation: form.designation.trim(), position: form.designation.trim(),
        salary: Number(form.salary || 0), phone: form.phone.trim(), doj: form.doj || undefined,
        fingerprintId: form.fingerprintId === "" ? "" : Number(form.fingerprintId),
        leaveBalance: Number(form.leaveBalance || 0), profilePic: form.profilePic.trim(),
        avatar: form.profilePic.trim(), isActive: Boolean(form.isActive),
        bankName: form.bankName.trim(), bankAccountNo: form.bankAccountNo.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(), branchName: form.branchName.trim(),
      };
      if (editEmployee) {
        await employeeAPI.update(editEmployee._id, p);
        toast.success("Employee updated.");
      } else {
        await employeeAPI.create(p);
        toast.success("Employee created.");
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      await Promise.all([loadEmployees(), loadMeta()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    try {
      await employeeAPI.delete(deactivateId);
      toast.success("Employee deactivated.");
      setDeactivateId("");
      await Promise.all([loadEmployees(), loadMeta()]);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to deactivate."); }
  };

  const openResetPw = (emp) => { setResetPwTarget(emp); setResetPwValue(""); setResetPwConfirm(""); setResetPwShow(false); };
  const openView = (emp) => { setViewEmployee(emp); setShowViewPw(false); };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPwValue.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (resetPwValue !== resetPwConfirm) { toast.error("Passwords do not match."); return; }
    setResetPwSaving(true);
    try {
      await employeeAPI.resetPassword(resetPwTarget._id, resetPwValue);
      toast.success(`Password reset for ${resetPwTarget.name}.`);
      setEmployees((prev) => prev.map((emp) => emp._id === resetPwTarget._id ? { ...emp, tempPassword: resetPwValue } : emp));
      setResetPwTarget(null);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to reset password."); }
    finally { setResetPwSaving(false); }
  };

  const openImport = () => { setImportFile(null); setImportRows(null); setImportParseErr(""); setImportResult(null); setImportModal(true); };
  const handleFileChange = async (file) => {
    if (!file) return;
    setImportFile(file); setImportRows(null); setImportParseErr(""); setImportResult(null); setImportParsing(true);
    try { const rows = await parseExcelPreview(file); setImportRows(rows); }
    catch (err) { setImportParseErr(err.message); }
    finally { setImportParsing(false); }
  };
  const handleBulkImport = async () => {
    if (!importFile || !importRows) return;
    setImporting(true); setImportResult(null);
    try {
      const { data } = await employeeAPI.bulkUpload(importFile);
      setImportResult(data);
      if (data.created > 0) { toast.success(`${data.created} employees imported.`); await Promise.all([loadEmployees(), loadMeta()]); }
      else { toast("No new employees created — all rows were already in the system.", { icon: "ℹ️" }); }
    } catch (err) { toast.error(err.response?.data?.message || "Import failed."); }
    finally { setImporting(false); }
  };

  const hrCount = employees.filter((e) => e.role === "hr").length;

  /* ────────────────────────────────────────────────────────── */
  return (
    <AppShell requiredRole="hr">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Hero banner ──────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-300">People Management</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Employee Directory</h1>
              <p className="mt-1 text-sm text-purple-200">
                Create, update, and manage employee records across all departments.
              </p>
              {stats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {stats.activeEmployees ?? 0} active employees
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {stats.totalDepartments ?? 0} departments
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              <button
                type="button"
                onClick={openImport}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
              >
                <FileSpreadsheet className="h-4 w-4" /> Import Excel
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4" /> Add Employee
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat cards ───────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GradientStatCard icon={Users} gradient="from-violet-600 to-purple-700" label="Total Employees" value={stats?.totalEmployees ?? 0} subtext={`${stats?.activeEmployees ?? 0} active`} />
          <GradientStatCard icon={Shield} gradient="from-indigo-600 to-violet-700" label="HR Admins" value={hrCount} subtext="Visible in directory" />
          <GradientStatCard icon={Mail} gradient="from-cyan-500 to-blue-600" label="Departments" value={stats?.totalDepartments ?? 0} subtext="Across organization" />
          <GradientStatCard icon={Phone} gradient="from-rose-500 to-pink-600" label="Inactive Profiles" value={stats?.inactiveEmployees ?? 0} subtext="Re-activate via edit" />
        </div>

        {/* ── Search & Filter bar ───────────────────────────── */}
        <div className="glass-card overflow-hidden">
          <div className="border-b border-purple-50 bg-gradient-to-r from-purple-50/60 to-violet-50/40 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Filter & Search</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_180px_160px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, name, email, or department…"
                className="input-field pl-10"
              />
            </div>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input-field">
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
              <option value="">All Roles</option>
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* ── Employee table ────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-purple-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-11 w-11 animate-pulse rounded-2xl bg-purple-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 animate-pulse rounded-full bg-purple-100" />
                    <div className="h-2.5 w-28 animate-pulse rounded-full bg-purple-50" />
                  </div>
                  <div className="h-3 w-24 animate-pulse rounded-full bg-purple-50" />
                  <div className="h-3 w-20 animate-pulse rounded-full bg-purple-50" />
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description="Try adjusting your filters or create a new employee profile."
              action={
                <button type="button" onClick={openCreate} className="btn-primary text-sm">
                  <Plus className="h-4 w-4" /> Create Employee
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead>
                  <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                    {["Employee", "Department", "Designation", "Salary", "Leave", "Joined", "Password", "Status", "Actions"].map((h) => (
                      <th key={h} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-purple-700 ${h === "Actions" ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/80">
                  {employees.map((emp) => (
                    <tr key={emp._id} className="group transition-colors hover:bg-purple-50/30">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openView(emp)}
                          className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
                          title="View profile"
                        >
                          <div className="relative shrink-0">
                            {emp.avatar || emp.profilePic ? (
                              <img src={emp.avatar || emp.profilePic} alt={emp.name} className="h-11 w-11 rounded-2xl object-cover ring-2 ring-purple-100" />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                                <span className="text-sm font-bold text-white">{getInitials(emp.name)}</span>
                              </div>
                            )}
                            {emp.isActive && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                            <p className="text-xs text-surface-400">{emp.employeeId || "Auto ID"} · {emp.email}</p>
                            {emp.phone && <p className="text-xs text-surface-400">{emp.phone}</p>}
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {emp.department ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                            <Building2 className="h-3 w-3" /> {emp.department}
                          </span>
                        ) : <span className="text-sm text-surface-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{emp.designation || emp.position || "—"}</td>
                      <td className="px-5 py-4">
                        <span className="font-display text-sm font-bold text-gray-900">{formatCurrency(emp.salary)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {emp.leaveBalance ?? 0}d
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-surface-500">{formatDate(emp.doj)}</td>
                      <td className="px-5 py-4">
                        {emp.tempPassword ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm text-gray-900">
                              {visiblePwIds[emp._id] ? emp.tempPassword : "•".repeat(Math.min(emp.tempPassword.length, 10))}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVisiblePwIds((prev) => ({ ...prev, [emp._id]: !prev[emp._id] }))}
                              className="text-surface-400 hover:text-brand-700"
                              title={visiblePwIds[emp._id] ? "Hide" : "Show"}
                            >
                              {visiblePwIds[emp._id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs italic text-surface-400">Changed by user</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`status-badge ${emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                            {emp.isActive ? "Active" : "Inactive"}
                          </span>
                          <span className={`status-badge ${emp.role === "hr" ? "bg-violet-100 text-violet-700" : "bg-surface-100 text-surface-500"}`}>
                            {emp.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => openView(emp)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-surface-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title="View profile">
                            <UserCircle className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openEdit(emp)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-surface-400 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700" title="Edit employee">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openResetPw(emp)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-surface-400 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700" title="Reset password">
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {emp.isActive && (
                            <button type="button" onClick={() => setDeactivateId(emp._id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-surface-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="Deactivate employee">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-purple-50 bg-gradient-to-r from-purple-50/40 to-white px-5 py-3 text-xs text-surface-400">
                Showing {employees.length} employee{employees.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ CREATE / EDIT MODAL ═══════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <ModalHeader
              title={editEmployee ? "Edit Employee" : "Create Employee"}
              description="Keep the profile complete so payroll, attendance, and leave workflows stay accurate."
              onClose={() => setShowForm(false)}
            />
            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              {/* Personal & Account */}
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                  <Users className="h-3.5 w-3.5" /> Personal & Account
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Employee ID", field: "employeeId", type: "text", placeholder: "Leave blank to auto-generate", transform: (v) => v.toUpperCase() },
                    { label: "Full Name", field: "name", type: "text", required: true },
                    { label: "Email", field: "email", type: "email", required: true },
                    { label: editEmployee ? "Reset Password" : "Password", field: "password", type: "password", placeholder: editEmployee ? "Leave blank to keep current" : "Defaults to changeme123" },
                    { label: "Department", field: "department", type: "text", placeholder: "Engineering" },
                    { label: "Designation", field: "designation", type: "text", placeholder: "Software Engineer" },
                    { label: "Monthly Salary", field: "salary", type: "number", placeholder: "35000", min: 0 },
                    { label: "Phone", field: "phone", type: "text", placeholder: "+91 9876543210" },
                    { label: "Date of Joining", field: "doj", type: "date" },
                    { label: "Fingerprint / Card ID", field: "fingerprintId", type: "number", placeholder: "Matches biometric export", min: 0 },
                    { label: "Leave Balance", field: "leaveBalance", type: "number", min: 0, step: 0.5 },
                    { label: "Profile Image URL", field: "profilePic", type: "url", placeholder: "https://…" },
                  ].map(({ label, field, type, placeholder, required, min, step, transform }) => (
                    <div key={field}>
                      <FormLabel>{label}</FormLabel>
                      <input
                        type={type} value={form[field]} required={required} min={min} step={step} placeholder={placeholder}
                        onChange={(e) => setForm({ ...form, [field]: transform ? transform(e.target.value) : e.target.value })}
                        className="input-field"
                      />
                    </div>
                  ))}
                  <div>
                    <FormLabel>Role</FormLabel>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
                      <option value="employee">Employee</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  <div>
                    <FormLabel>Profile Status</FormLabel>
                    <select value={form.isActive ? "active" : "inactive"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })} className="input-field">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-white p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                  <CreditCard className="h-3.5 w-3.5" /> Bank Details
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FormLabel>Bank Name</FormLabel>
                    <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="input-field" placeholder="e.g. State Bank of India" />
                  </div>
                  <div>
                    <FormLabel>Branch Name</FormLabel>
                    <input type="text" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} className="input-field" placeholder="e.g. Andheri West" />
                  </div>
                  <div>
                    <FormLabel>Account Number</FormLabel>
                    <input type="text" value={form.bankAccountNo} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} className="input-field" placeholder="Enter account number" maxLength={20} />
                  </div>
                  <div>
                    <FormLabel>Confirm Account Number</FormLabel>
                    <input type="text" value={form.confirmAccountNo} onChange={(e) => setForm({ ...form, confirmAccountNo: e.target.value })} className="input-field" placeholder="Re-enter account number" maxLength={20} />
                  </div>
                  <div>
                    <FormLabel>IFSC Code</FormLabel>
                    <input type="text" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })} className="input-field font-mono" placeholder="e.g. SBIN0001234" maxLength={11} />
                  </div>
                </div>
              </div>

              {!editEmployee && (
                <div className="flex items-start gap-3 rounded-2xl bg-violet-50 p-4 text-sm text-violet-800">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                  If no password is entered, the account defaults to <span className="ml-1 font-mono font-semibold">changeme123</span>.
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-purple-50 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  {saving ? "Saving…" : editEmployee ? "Update Employee" : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ BULK IMPORT MODAL ═══════════ */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setImportModal(false)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <ModalHeader
              title="Import Employees from Excel"
              description="Card No maps to Fingerprint ID for attendance matching. Emails are auto-generated."
              onClose={() => setImportModal(false)}
              gradient="from-cyan-600 to-blue-700"
            />
            <div className="space-y-5 px-6 py-6">
              {/* Format guide */}
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50/40 p-4 text-sm">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Expected Column Headers
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  {[["Employee Code","Sequential #"],["Card No","→ Fingerprint ID"],["Name","Required"],["Department","Team name"],["Designation","Job title"],["Joining Date","DD/MM/YYYY"]].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-700">{k}:</span>
                      <span className="text-violet-600">{v}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-200">
                  <Download className="h-3.5 w-3.5" /> Download sample template
                </button>
              </div>

              {/* Drop zone */}
              <div
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${importFile ? "border-brand-400 bg-brand-50/40" : "border-purple-200 hover:border-brand-400 hover:bg-brand-50/20"}`}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(e) => handleFileChange(e.target.files[0])} />
                {importFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-7 w-7 text-brand-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">{importFile.name}</p>
                      <p className="text-xs text-surface-400">{(importFile.size / 1024).toFixed(1)} KB — click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 h-9 w-9 text-purple-300" />
                    <p className="text-sm font-medium text-surface-500">Click to select your Excel / CSV file</p>
                    <p className="mt-1 text-xs text-surface-400">.xls · .xlsx · .csv — Max 10 MB</p>
                  </>
                )}
              </div>

              {importParseErr && (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{importParseErr}</span>
                </div>
              )}
              {importParsing && <p className="text-center text-sm text-surface-400">Parsing file…</p>}

              {/* Preview */}
              {importRows && !importParsing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{importRows.length} employee{importRows.length !== 1 ? "s" : ""} detected</p>
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">Preview</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-purple-100">
                    <table className="w-full min-w-[540px] text-xs">
                      <thead>
                        <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                          {["#","Name","Card No","Department","Designation","Joining Date"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider text-purple-700">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50">
                        {importRows.slice(0, 10).map((r, i) => (
                          <tr key={i} className="hover:bg-purple-50/30">
                            <td className="px-3 py-2 text-surface-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{r.name || "—"}</td>
                            <td className="px-3 py-2 text-surface-500">{r.cardNo || r.empCode || "—"}</td>
                            <td className="px-3 py-2 text-surface-500">{r.department || r.location || "—"}</td>
                            <td className="px-3 py-2 text-surface-500">{r.designation || "—"}</td>
                            <td className="px-3 py-2 text-surface-500">{r.doj || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importRows.length > 10 && <p className="border-t border-purple-50 px-3 py-2 text-xs text-surface-400">…and {importRows.length - 10} more rows</p>}
                  </div>
                  <p className="text-xs text-surface-400">
                    Emails auto-generated as <code className="rounded bg-surface-100 px-1">name@albos.com</code>. Employees already in the system will be skipped.
                  </p>
                </div>
              )}

              {/* Result */}
              {importResult && (
                <div className={`rounded-2xl border p-5 ${importResult.created > 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="mb-4 flex items-center gap-2">
                    {importResult.created > 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}
                    <p className="text-sm font-semibold text-gray-900">{importResult.message}</p>
                  </div>
                  <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                    {[["Created", importResult.created, "text-emerald-700"],["Skipped", importResult.skipped, "text-amber-700"],["Total", importResult.total, "text-gray-700"]].map(([l, v, c]) => (
                      <div key={l} className="rounded-xl bg-white/70 py-3">
                        <p className={`text-2xl font-bold ${c}`}>{v}</p>
                        <p className="mt-0.5 text-xs text-surface-500">{l}</p>
                      </div>
                    ))}
                  </div>
                  {importResult.skippedList?.slice(0, 5).map((s, i) => <p key={i} className="text-xs text-amber-700">• {s.name} — {s.reason}</p>)}
                  {importResult.errors?.map((err, i) => <p key={i} className="mt-1 text-xs text-red-600">• {err}</p>)}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-purple-50 pt-2">
                <button type="button" onClick={() => setImportModal(false)} className="btn-secondary text-sm">{importResult ? "Close" : "Cancel"}</button>
                {!importResult && (
                  <button type="button" onClick={handleBulkImport} disabled={!importRows || importing || importParsing || !!importParseErr} className="btn-primary text-sm">
                    <Upload className="h-4 w-4" />
                    {importing ? `Importing ${importRows?.length ?? ""}…` : `Import ${importRows ? importRows.length + " Employees" : ""}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VIEW PROFILE MODAL ═══════════ */}
      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setViewEmployee(null)}>
          <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="Employee Profile" onClose={() => setViewEmployee(null)} gradient="from-violet-600 to-indigo-700" />

            <div className="px-6 py-6 space-y-5">
              {/* Avatar + identity */}
              <div className="flex items-center gap-4">
                {viewEmployee.avatar || viewEmployee.profilePic ? (
                  <img src={viewEmployee.avatar || viewEmployee.profilePic} alt={viewEmployee.name} className="h-16 w-16 rounded-2xl object-cover ring-4 ring-purple-100" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
                    <span className="text-2xl font-bold text-white">{getInitials(viewEmployee.name)}</span>
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-gray-900">{viewEmployee.name}</p>
                  <p className="text-sm text-surface-400">{viewEmployee.employeeId || "—"} · {viewEmployee.email}</p>
                  <div className="mt-1.5 flex gap-2">
                    <span className={`status-badge ${viewEmployee.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {viewEmployee.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className={`status-badge ${viewEmployee.role === "hr" ? "bg-violet-100 text-violet-700" : "bg-surface-100 text-surface-500"}`}>
                      {viewEmployee.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Building2, label: "Department", value: viewEmployee.department || "—" },
                  { icon: Briefcase, label: "Designation", value: viewEmployee.designation || viewEmployee.position || "—" },
                  { icon: Phone, label: "Phone", value: viewEmployee.phone || "—" },
                  { icon: CalendarDays, label: "Joined", value: viewEmployee.doj ? new Date(viewEmployee.doj).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                  { icon: Fingerprint, label: "Fingerprint ID", value: viewEmployee.fingerprintId ?? "—" },
                  { icon: CalendarDays, label: "Leave Balance", value: `${viewEmployee.leaveBalance ?? 0} days` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-3 transition hover:border-purple-200">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">{label}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Password section */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Password (HR-set)</span>
                </div>
                {viewEmployee.tempPassword ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-gray-900 break-all">
                      {showViewPw ? viewEmployee.tempPassword : "•".repeat(Math.min(viewEmployee.tempPassword.length, 14))}
                    </span>
                    <button type="button" onClick={() => setShowViewPw((v) => !v)} className="shrink-0 text-amber-600 hover:text-amber-800">
                      {showViewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm italic text-surface-400">Employee has changed their own password — not visible to HR.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-purple-50 pt-1">
                <button type="button" onClick={() => { const emp = viewEmployee; setViewEmployee(null); openResetPw(emp); }} className="btn-secondary text-sm">
                  <KeyRound className="h-4 w-4" /> Reset Password
                </button>
                <button type="button" onClick={() => { const emp = viewEmployee; setViewEmployee(null); openEdit(emp); }} className="btn-primary text-sm">
                  <Edit2 className="h-4 w-4" /> Edit Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ RESET PASSWORD MODAL ═══════════ */}
      {resetPwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setResetPwTarget(null)}>
          <div className="w-full max-w-md rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <ModalHeader
              title="Reset Password"
              description={`Setting a new password for ${resetPwTarget.name}`}
              onClose={() => setResetPwTarget(null)}
              gradient="from-amber-500 to-orange-600"
            />
            <form onSubmit={handleResetPassword} className="space-y-4 px-6 py-6">
              <div>
                <FormLabel>New Password</FormLabel>
                <div className="relative">
                  <input type={resetPwShow ? "text" : "password"} value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} placeholder="Min 6 characters" required className="input-field pr-10" />
                  <button type="button" onClick={() => setResetPwShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-brand-700">
                    {resetPwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <FormLabel>Confirm Password</FormLabel>
                <input type={resetPwShow ? "text" : "password"} value={resetPwConfirm} onChange={(e) => setResetPwConfirm(e.target.value)} placeholder="Re-enter new password" required className="input-field" />
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                The employee will be prompted to change this password on next login. It will also be visible in the employee list until they change it.
              </div>
              <div className="flex justify-end gap-3 border-t border-surface-100 pt-2">
                <button type="button" onClick={() => setResetPwTarget(null)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={resetPwSaving} className="btn-primary text-sm">
                  <KeyRound className="h-4 w-4" />
                  {resetPwSaving ? "Resetting…" : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ DEACTIVATE CONFIRM ═══════════ */}
      {deactivateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setDeactivateId("")}>
          <div className="w-full max-w-md rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-t-[28px] bg-gradient-to-br from-red-500 to-rose-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Deactivate Employee</h3>
                  <p className="text-sm text-red-100">This action can be reversed from the edit form.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-surface-500">
                This keeps attendance and payroll history intact while removing the employee from active operations.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setDeactivateId("")} className="btn-secondary text-sm">Cancel</button>
                <button type="button" onClick={handleDeactivate} className="btn-danger text-sm">Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
