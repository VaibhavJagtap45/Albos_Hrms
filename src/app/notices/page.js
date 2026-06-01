"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bell, Plus, Trash2, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import NoticeCard from "@/components/NoticeCard";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/lib/auth";
import { employeeAPI, noticeAPI } from "@/lib/api";
import { formatDateTime, getNoticeTypeLabel } from "@/lib/utils";

const NOTICE_TYPES = ["global", "individual"];

function CreateModal({ employees, onClose, onDone }) {
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "global",
    recipient: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.type === "individual" && !form.recipient) {
      toast.error("Please select a recipient for an individual notice.");
      return;
    }
    setSaving(true);
    try {
      await noticeAPI.create({
        title: form.title,
        body: form.body,
        type: form.type,
        recipient: form.type === "individual" ? form.recipient : undefined,
      });
      toast.success("Notice published successfully.");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create notice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-gray-900">
            New Notice
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500 ">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              className="input-field"
              placeholder="Notice title"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
              Message
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              className="input-field min-h-[120px] resize-y"
              placeholder="Write the notice content..."
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    type: e.target.value,
                    recipient: "",
                  }))
                }
                className="input-field"
              >
                {NOTICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getNoticeTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            {form.type === "individual" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                  Recipient
                </label>
                <select
                  value={form.recipient}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, recipient: e.target.value }))
                  }
                  className="input-field"
                  required
                >
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeId} – {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "Publishing..." : "Publish Notice"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ notice, onClose, onDelete, isHR }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-surface-400">
              {getNoticeTypeLabel(notice.type)} Notice
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-gray-900">
              {notice.title}
            </h3>
            <p className="mt-1 text-xs text-surface-400">
              {formatDateTime(notice.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-surface-50 p-4">
          <p className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
            {notice.body}
          </p>
        </div>

        {(notice.createdBy?.name || notice.recipient?.name) && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-surface-400">
            {notice.createdBy?.name && <span>By: {notice.createdBy.name}</span>}
            {notice.recipient?.name && <span>To: {notice.recipient.name}</span>}
          </div>
        )}

        {isHR && (
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => onDelete(notice._id)}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Delete Notice
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Close
            </button>
          </div>
        )}

        {!isHR && (
          <div className="mt-5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary w-full"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NoticesPage() {
  const { user, isHR } = useAuth();
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [openNotice, setOpenNotice] = useState(null);

  useEffect(() => {
    if (user) {
      loadNotices();
      if (isHR) loadEmployees();
    }
  }, [user]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const { data } = await noticeAPI.list();
        setNotices(data.notices);
      } else {
        const { data } = await noticeAPI.my();
        setNotices(data.notices);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await employeeAPI.list({ isActive: true, limit: 300 });
      setEmployees(data.employees);
    } catch {
      /* silent */
    }
  };

  const handleOpen = async (notice) => {
    setOpenNotice(notice);
    if (!isHR && notice.isRead === false) {
      try {
        await noticeAPI.markRead(notice._id);
        setNotices((prev) =>
          prev.map((n) => (n._id === notice._id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        /* silent */
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await noticeAPI.delete(id);
      toast.success("Notice deleted.");
      setOpenNotice(null);
      await loadNotices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete notice.");
    }
  };

  const globalCount = notices.filter((n) => n.type === "global").length;
  const individualCount = notices.filter((n) => n.type === "individual").length;

  return (
    <AppShell>
      <div className="mx-auto  space-y-3">
        {/* <PageHeader
          title="Notices"
          description={
            isHR
              ? "Create and manage company-wide and individual notices."
              : "Stay updated with announcements from HR."
          }
          actions={
            isHR
              ? [
                  <button
                    key="create"
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="btn-primary text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    New Notice
                  </button>,
                ]
              : undefined
          }
        /> */}
        <PageHeader
          title="Notices"
          titleClassName="text-white"
          description={
            isHR
              ? "Create and manage company-wide and individual notices."
              : "Stay updated with announcements from HR."
          }
          descriptionClassName="text-white"
          actions={
            isHR
              ? [
                  <button
                    key="create"
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="btn-primary text-sm text-white"
                  >
                    <Plus className="h-4 w-4 text-white" />
                    New Notice
                  </button>,
                ]
              : undefined
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {isHR ? (
            <>
              <StatCard
                icon={Bell}
                label="Total Notices"
                value={notices.length}
                tone="bg-brand-100 text-brand-700"
                subtext="All published notices"
              />
              <StatCard
                icon={Bell}
                label="Global"
                value={globalCount}
                tone="bg-surface-100 text-surface-500"
                subtext="Company-wide notices"
              />
              <StatCard
                icon={Bell}
                label="Individual"
                value={individualCount}
                tone="bg-blue-100 text-blue-700"
                subtext="Personal notices"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Bell}
                label="Unread"
                value={unreadCount}
                tone="bg-brand-100 text-brand-700"
                subtext="Notices awaiting your attention"
              />
              <StatCard
                icon={Bell}
                label="Total"
                value={notices.length}
                tone="bg-surface-100 text-surface-500"
                subtext="All your notices"
              />
              <StatCard
                icon={Bell}
                label="Read"
                value={notices.length - unreadCount}
                tone="bg-green-100 text-green-700"
                subtext="Already read"
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="glass-card p-10 text-center text-sm text-surface-400">
              Loading notices...
            </div>
          ) : notices.length === 0 ? (
            <div className="glass-card">
              <EmptyState
                icon={Bell}
                title="No notices yet"
                description={
                  isHR
                    ? "Create a notice to broadcast announcements to employees."
                    : "You have no notices at the moment."
                }
                action={
                  isHR ? (
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="btn-primary text-sm"
                    >
                      <Plus className="h-4 w-4" /> New Notice
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            notices.map((notice) => (
              <NoticeCard
                key={notice._id}
                notice={notice}
                onOpen={handleOpen}
                showActions={isHR}
              />
            ))
          )}
        </div>
      </div>

      {showCreate && (
        <CreateModal
          employees={employees}
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            loadNotices();
          }}
        />
      )}

      {openNotice && (
        <DetailModal
          notice={openNotice}
          onClose={() => setOpenNotice(null)}
          onDelete={handleDelete}
          isHR={isHR}
        />
      )}
    </AppShell>
  );
}
