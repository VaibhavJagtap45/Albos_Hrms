'use client';

import { useState } from 'react';

const INITIAL_STATE = {
  leaveType: 'full',
  fromDate: '',
  toDate: '',
  reason: '',
};

export default function LeaveForm({ onSubmit, submitting = false }) {
  const [form, setForm] = useState(INITIAL_STATE);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit?.({
      ...form,
      toDate: form.leaveType === 'half' ? form.fromDate : form.toDate,
    });
    setForm(INITIAL_STATE);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">Leave Type</label>
        <select
          value={form.leaveType}
          onChange={(event) => setForm((current) => ({ ...current, leaveType: event.target.value }))}
          className="input-field"
        >
          <option value="full">Full Day</option>
          <option value="half">Half Day</option>
          <option value="sick">Sick Leave</option>
          <option value="casual">Casual Leave</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">From Date</label>
          <input
            type="date"
            value={form.fromDate}
            onChange={(event) => setForm((current) => ({ ...current, fromDate: event.target.value }))}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">To Date</label>
          <input
            type="date"
            value={form.leaveType === 'half' ? form.fromDate : form.toDate}
            onChange={(event) => setForm((current) => ({ ...current, toDate: event.target.value }))}
            className="input-field"
            disabled={form.leaveType === 'half'}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">Reason</label>
        <textarea
          value={form.reason}
          onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          className="input-field min-h-[120px] resize-y"
          placeholder="Briefly explain the leave request"
          required
        />
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Apply for Leave'}
      </button>
    </form>
  );
}
