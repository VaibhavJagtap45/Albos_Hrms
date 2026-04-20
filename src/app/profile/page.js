"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { authAPI, attendanceAPI } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Briefcase,
  Building2,
  CalendarCheck,
  Camera,
  CreditCard,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  Save,
  Shield,
  UserCircle,
} from "lucide-react";
import { formatDate, getStatusTone } from "@/lib/utils";
import PasswordStrength, { MIN_PASSWORD_LENGTH } from "@/components/PasswordStrength";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  // Profile fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Bank detail fields
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [confirmAccountNo, setConfirmAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  // Profile photo
  const avatarRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password section toggle
  const [showChangePw, setShowChangePw] = useState(false);

  // Password change fields
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // HR-set password visibility
  const [showTempPw, setShowTempPw] = useState(false);

  // Recent attendance
  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setBankName(user.bankName || "");
      setBankAccountNo(user.bankAccountNo || "");
      setConfirmAccountNo(user.bankAccountNo || "");
      setIfscCode(user.ifscCode || "");
      setBranchName(user.branchName || "");
      setAvatarPreview(null); // reset preview when user updates
      loadRecentAttendance();
    }
  }, [user]);

  const loadRecentAttendance = async () => {
    if (!user) return;
    const today = new Date();
    try {
      const { data } = await attendanceAPI.getMyMonth(
        today.getMonth() + 1,
        today.getFullYear(),
      );
      const sorted = [...(data.records || [])].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
      setRecentAttendance(sorted.slice(0, 8));
    } catch {
      /* silent */
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Image must be smaller than 1.5 MB.");
      return;
    }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setAvatarPreview(dataUrl);
      try {
        const { data } = await authAPI.updateMe({
          avatar: dataUrl,
          profilePic: dataUrl,
        });
        updateUser(data.user, null);
        toast.success("Profile photo updated.");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to update photo.");
        setAvatarPreview(null);
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateMe({ name, phone });
      updateUser(data.user, null);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (bankAccountNo !== confirmAccountNo) {
      toast.error("Account numbers do not match.");
      return;
    }
    setSavingBank(true);
    try {
      const { data } = await authAPI.updateMe({
        bankName,
        bankAccountNo,
        ifscCode,
        branchName,
      });
      updateUser(data.user, null);
      toast.success("Bank details updated.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update bank details.",
      );
    } finally {
      setSavingBank(false);
    }
  };

  const pwMatches = pwForm.confirm.length > 0 && pwForm.newPw === pwForm.confirm;
  const pwSameAsCurrent = pwForm.newPw.length > 0 && pwForm.newPw === pwForm.current;
  const pwCanSubmit =
    !savingPw &&
    pwForm.current.length > 0 &&
    pwForm.newPw.length >= MIN_PASSWORD_LENGTH &&
    pwMatches &&
    !pwSameAsCurrent;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPw.length < MIN_PASSWORD_LENGTH) {
      toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (pwSameAsCurrent) {
      toast.error("New password must be different from your current password.");
      return;
    }
    setSavingPw(true);
    try {
      const { data } = await authAPI.changePassword(pwForm.current, pwForm.newPw);
      updateUser(data.user, data.token);
      toast.success("Password changed successfully.");
      setPwForm({ current: "", newPw: "", confirm: "" });
      setShowChangePw(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  };

  const currentAvatar = avatarPreview || user?.avatar || user?.profilePic;

  return (
    <AppShell>
      <div className="mx-auto  space-y-3">
        {/* ── Hero banner ───────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-300">
                  My Profile
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {user?.name || "Profile"}
              </h1>
              <p className="mt-1 text-sm text-purple-200">
                Manage your personal details and security settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user?.employeeId && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                  <Fingerprint className="h-3.5 w-3.5 text-purple-300" />
                  {user.employeeId}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm capitalize">
                <Shield className="h-3.5 w-3.5 text-purple-300" />
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Identity card ────────────────────────────────────── */}
          <div className="glass-card overflow-hidden lg:col-span-1">
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-600" />
            <div className="p-6 text-center">
              {/* Avatar with upload button */}
              <div className="relative mx-auto mb-4 h-24 w-24">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={user?.name}
                    className="h-24 w-24 rounded-2xl object-cover ring-4 ring-purple-100"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 ring-4 ring-purple-100">
                    <span className="text-3xl font-bold text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                {/* Upload overlay button */}
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-60"
                  title="Change profile photo"
                >
                  {uploadingAvatar ? (
                    <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <h3 className="font-display text-lg font-bold text-gray-900">
                {user?.name}
              </h3>
              <p className="text-sm capitalize text-surface-400">
                {user?.role}
              </p>

              {/* Info rows */}
              <div className="mt-6 space-y-2 text-left">
                <div className="rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-3 transition hover:border-purple-200">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                      Email
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-gray-800">
                    {user?.email}
                  </p>
                </div>

                {user?.phone && (
                  <div className="rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-3 transition hover:border-purple-200">
                    <div className="mb-1 flex items-center gap-1.5">
                      <UserCircle className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                        Phone
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {user.phone}
                    </p>
                  </div>
                )}

                {user?.department && (
                  <div className="rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-3 transition hover:border-purple-200">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                        Department
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {user.department}
                    </p>
                  </div>
                )}

                {user?.designation && (
                  <div className="rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-3 transition hover:border-purple-200">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                        Designation
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {user.designation}
                    </p>
                  </div>
                )}

                {user?.employeeId && (
                  <div className="rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-3 transition hover:border-purple-200">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                        Employee ID
                      </span>
                    </div>
                    <p className="font-mono text-sm font-medium text-gray-800">
                      {user.employeeId}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-3 transition hover:border-purple-200">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                      Role
                    </span>
                  </div>
                  <span
                    className={`status-badge text-xs ${
                      user?.role === "hr"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {user?.role?.toUpperCase()}
                  </span>
                </div>

                {/* HR-set password — shown until employee changes it themselves */}
                {user?.tempPassword && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Current Password
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="break-all font-mono text-sm text-gray-900">
                        {showTempPw
                          ? user.tempPassword
                          : "•".repeat(Math.min(user.tempPassword.length, 12))}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTempPw((v) => !v)}
                        className="flex-shrink-0 text-amber-600 hover:text-amber-800"
                        title={showTempPw ? "Hide" : "Show"}
                      >
                        {showTempPw ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-amber-600 leading-relaxed">
                      Set by HR. Change your password to secure your account.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Profile update */}
            <div className="glass-card overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-600" />
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-display text-lg font-bold text-gray-900">
                    Update Profile
                  </h3>
                  <p className="mt-0.5 text-sm text-surface-400">
                    Update your name and contact details.
                  </p>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-field"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn-primary"
                  >
                    <Save className="h-4 w-4" />
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>

            {/* Bank Details */}
            <div className="glass-card overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-600" />
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  <h3 className="font-display font-bold text-gray-900">
                    Bank Details
                  </h3>
                </div>
                <form onSubmit={handleSaveBank} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="input-field"
                        placeholder="e.g. State Bank of India"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="input-field"
                        placeholder="e.g. Andheri West"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      className="input-field"
                      placeholder="Enter account number"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                      Confirm Account Number
                    </label>
                    <input
                      type="text"
                      value={confirmAccountNo}
                      onChange={(e) => setConfirmAccountNo(e.target.value)}
                      className="input-field"
                      placeholder="Re-enter account number"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) =>
                        setIfscCode(e.target.value.toUpperCase())
                      }
                      className="input-field font-mono"
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="btn-primary"
                  >
                    <Save className="h-4 w-4" />
                    {savingBank ? "Saving..." : "Save Bank Details"}
                  </button>
                </form>
              </div>
            </div>

            {/* Password section */}
            <div className="glass-card overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-600" />
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-amber-500" />
                    <h3 className="font-display font-bold text-gray-900">
                      Password
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePw((v) => !v);
                      setPwForm({ current: "", newPw: "", confirm: "" });
                      setShowCurrent(false);
                      setShowNew(false);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                      showChangePw
                        ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        : "border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                    }`}
                  >
                    <KeyRound className="h-4 w-4" />
                    {showChangePw ? "Cancel" : "Change Password"}
                  </button>
                </div>

                {!showChangePw && (
                  <p className="mt-3 text-sm text-surface-400">
                    Keep your account secure by using a strong, unique password.
                  </p>
                )}

                {showChangePw && (
                  <form
                    onSubmit={handleChangePassword}
                    className="mt-5 space-y-4"
                  >
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrent ? "text" : "password"}
                          value={pwForm.current}
                          onChange={(e) =>
                            setPwForm((p) => ({
                              ...p,
                              current: e.target.value,
                            }))
                          }
                          className="input-field pr-11"
                          required
                          autoComplete="current-password"
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                        >
                          {showCurrent ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNew ? "text" : "password"}
                            value={pwForm.newPw}
                            onChange={(e) =>
                              setPwForm((p) => ({
                                ...p,
                                newPw: e.target.value,
                              }))
                            }
                            className="input-field pr-11"
                            minLength={MIN_PASSWORD_LENGTH}
                            required
                            autoComplete="new-password"
                            placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                          >
                            {showNew ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <PasswordStrength password={pwForm.newPw} variant="light" />
                        {pwSameAsCurrent && (
                          <p className="mt-1 text-xs text-red-500">
                            New password must differ from your current password.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={pwForm.confirm}
                          onChange={(e) =>
                            setPwForm((p) => ({
                              ...p,
                              confirm: e.target.value,
                            }))
                          }
                          className={`input-field ${pwForm.confirm && !pwMatches ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                          required
                          autoComplete="new-password"
                          placeholder="Re-enter new password"
                        />
                        {pwForm.confirm && !pwMatches && (
                          <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={!pwCanSubmit}
                        className="btn-primary"
                      >
                        <KeyRound className="h-4 w-4" />
                        {savingPw ? "Changing..." : "Change Password"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChangePw(false)}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Recent attendance */}
            <div className="glass-card overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-display font-bold text-gray-900">
                    Recent Attendance
                  </h3>
                </div>
                {recentAttendance.length === 0 ? (
                  <p className="text-sm text-surface-400">
                    No attendance records found for this month.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentAttendance.map((record) => {
                      const dotColor =
                        record.status === "present"
                          ? "bg-emerald-500"
                          : record.status === "absent"
                            ? "bg-red-500"
                            : record.status === "late"
                              ? "bg-amber-500"
                              : record.status === "half-day"
                                ? "bg-blue-500"
                                : "bg-surface-300";
                      return (
                        <div
                          key={record._id}
                          className="flex items-center justify-between rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/30 to-white px-3 py-2.5 transition hover:border-purple-200"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(record.date)}
                            </span>
                            {record.checkIn && (
                              <span className="text-xs text-surface-500">
                                In {record.checkIn}
                              </span>
                            )}
                            {record.checkOut && (
                              <span className="text-xs text-surface-500">
                                Out {record.checkOut}
                              </span>
                            )}
                          </div>
                          <span
                            className={`status-badge text-xs ${getStatusTone(record.status)}`}
                          >
                            {record.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
