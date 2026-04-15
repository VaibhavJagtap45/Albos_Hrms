'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarRange, Check, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import EmptyState from '@/components/EmptyState';
import LeaveForm from '@/components/LeaveForm';
import { useAuth } from '@/lib/auth';
import { leaveAPI } from '@/lib/api';
import {
  formatDate,
  formatDateRange,
  getLeaveTypeLabel,
  getStatusTone,
} from '@/lib/utils';

function GradientStatCard({ icon: Icon, label, value, subtext, gradient, badge }) {
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
        {badge != null && <span className="absolute right-4 top-4 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">{badge}</span>}
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

function ConfirmModal({ title, description, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <ModalHeader
          title={title}
          description={description}
          onClose={onCancel}
          gradient="from-red-500 to-rose-600"
        />
        <div className="p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className={`btn-primary flex-1 ${danger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''}`}
            >
              {confirmLabel}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionModal({ leave, action, onClose, onDone }) {
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (action === 'approve') {
        await leaveAPI.approve(leave._id, comment);
        toast.success('Leave approved.');
      } else {
        await leaveAPI.reject(leave._id, comment);
        toast.success('Leave rejected.');
      }
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} leave.`);
    } finally {
      setSaving(false);
    }
  };

  const headerGradient = action === 'approve' ? 'from-emerald-600 to-teal-700' : 'from-red-500 to-rose-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <ModalHeader
          title={`${action === 'approve' ? 'Approve' : 'Reject'} Leave`}
          description={`Review and ${action} this leave request.`}
          onClose={onClose}
          gradient={headerGradient}
        />
        <div className="p-6">
          <div className="mb-4 rounded-xl border border-purple-50 bg-gradient-to-br from-purple-50/40 to-white p-4 text-sm">
            <p className="font-semibold text-gray-900">{leave.employeeId?.name || 'Employee'}</p>
            <p className="mt-1 text-surface-500">
              {getLeaveTypeLabel(leave.leaveType)} · {formatDateRange(leave.fromDate, leave.toDate)}
            </p>
            {leave.reason && <p className="mt-2 text-surface-500 italic">"{leave.reason}"</p>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input-field min-h-[80px] resize-y"
                placeholder={`Add a note for the ${action}...`}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className={`btn-primary w-full ${action === 'reject' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''}`}
            >
              {saving ? 'Processing...' : `${action === 'approve' ? 'Approve' : 'Reject'} Leave`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LeavesPage() {
  const { user, isHR } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { leave, action: 'approve'|'reject' }
  const [cancelId, setCancelId] = useState(null);

  useEffect(() => {
    if (user) loadLeaves();
  }, [user]);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const { data } = isHR ? await leaveAPI.list() : await leaveAPI.my();
      setLeaves(isHR ? data.leaves : data.leaves);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load leaves.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (formData) => {
    setApplying(true);
    try {
      await leaveAPI.apply(formData);
      toast.success('Leave application submitted.');
      setShowApply(false);
      await loadLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply for leave.');
    } finally {
      setApplying(false);
    }
  };

  const handleCancel = async () => {
    try {
      await leaveAPI.cancel(cancelId);
      toast.success('Leave cancelled.');
      setCancelId(null);
      await loadLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel leave.');
    }
  };

  const pending = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;
  const rejected = leaves.filter((l) => l.status === 'rejected').length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Hero banner ───────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 purple-glow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-300">
                  {isHR ? 'Leave Management' : 'My Leaves'}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Leaves</h1>
              <p className="mt-1 text-sm text-purple-200">
                {isHR
                  ? 'Review and manage all employee leave requests.'
                  : 'Apply for leave and track your request status.'}
              </p>
            </div>
            {!isHR && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowApply((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  {showApply ? 'Hide Form' : 'Apply for Leave'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stat cards ───────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <GradientStatCard
            icon={CalendarRange}
            label="Pending"
            value={pending}
            subtext="Awaiting decision"
            gradient="from-amber-500 to-orange-600"
          />
          <GradientStatCard
            icon={CalendarRange}
            label="Approved"
            value={approved}
            subtext="Approved leaves"
            gradient="from-emerald-500 to-teal-600"
          />
          <GradientStatCard
            icon={CalendarRange}
            label="Rejected"
            value={rejected}
            subtext="Rejected requests"
            gradient="from-rose-500 to-pink-600"
          />
        </div>

        {/* ── Apply for Leave panel ─────────────────────────────── */}
        {!isHR && showApply && (
          <div className="glass-card overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-600" />
            <div className="p-6">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                <Plus className="h-3.5 w-3.5" /> New Leave Request
              </p>
              <LeaveForm onSubmit={handleApply} submitting={applying} />
            </div>
          </div>
        )}

        {/* ── Leaves table ─────────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-surface-400">Loading leave records...</div>
          ) : leaves.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No leave records found"
              description={isHR ? 'No leave applications have been submitted yet.' : 'You have not submitted any leave applications.'}
              action={
                !isHR
                  ? <button type="button" onClick={() => setShowApply(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" />Apply for Leave</button>
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50/60">
                    {[
                      isHR ? 'Employee' : null,
                      'Leave Type',
                      'Duration',
                      'Days',
                      'Status',
                      'Reason',
                      'Applied On',
                      'Actions',
                    ]
                      .filter(Boolean)
                      .map((heading) => (
                        <th
                          key={heading}
                          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-purple-700 ${heading === 'Actions' ? 'text-right' : 'text-left'}`}
                        >
                          {heading}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/80">
                  {leaves.map((leave) => {
                    const emp = leave.employeeId || {};
                    const days = leave.days ?? (() => {
                      const from = new Date(leave.fromDate);
                      const to   = new Date(leave.toDate);
                      return Math.round((to - from) / 86400000) + 1;
                    })();
                    const canCancel = leave.status === 'pending' && (!isHR || leave.employeeId?._id === user?._id);

                    const statusBadgeClass =
                      leave.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : leave.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : leave.status === 'rejected'
                        ? 'bg-red-100 text-red-600'
                        : leave.status === 'cancelled'
                        ? 'bg-surface-100 text-surface-500'
                        : getStatusTone(leave.status);

                    return (
                      <tr key={leave._id} className="group transition-colors hover:bg-purple-50/30">
                        {isHR && (
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-gray-900">{emp.name || '-'}</p>
                            <p className="text-xs text-surface-400">{emp.employeeId || '-'} · {emp.department || '-'}</p>
                          </td>
                        )}
                        <td className="px-5 py-4 text-sm text-gray-700">{getLeaveTypeLabel(leave.leaveType)}</td>
                        <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{formatDateRange(leave.fromDate, leave.toDate)}</td>
                        <td className="px-5 py-4 text-sm text-gray-700">{days}</td>
                        <td className="px-5 py-4">
                          <span className={`status-badge ${statusBadgeClass}`}>{leave.status}</span>
                        </td>
                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="truncate text-sm text-surface-500">{leave.reason || '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-surface-400 whitespace-nowrap">{formatDate(leave.createdAt)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isHR && leave.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ leave, action: 'approve' })}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 text-xs font-medium text-green-700 transition hover:bg-green-100"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ leave, action: 'reject' })}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => setCancelId(leave._id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-surface-200 px-3 text-xs font-medium text-surface-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            )}
                            {leave.comment && (
                              <span title={leave.comment} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 text-surface-400">
                                <MessageSquare className="h-3.5 w-3.5" />
                              </span>
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
      </div>

      {actionModal && (
        <ActionModal
          leave={actionModal.leave}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onDone={() => { setActionModal(null); loadLeaves(); }}
        />
      )}

      {cancelId && (
        <ConfirmModal
          title="Cancel Leave Request"
          description="Are you sure you want to cancel this leave application?"
          confirmLabel="Cancel Leave"
          danger
          onConfirm={handleCancel}
          onCancel={() => setCancelId(null)}
        />
      )}
    </AppShell>
  );
}
