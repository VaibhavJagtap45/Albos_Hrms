"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarRange, Plus, Trash2, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/lib/auth";
import { holidayAPI } from "@/lib/api";
import {
  formatDate,
  getHolidayTypeLabel,
  getYearOptions,
  toIsoDate,
} from "@/lib/utils";

const HOLIDAY_TYPES = ["national", "company"];

const EMPTY_FORM = {
  name: "",
  date: toIsoDate(new Date()),
  type: "national",
  description: "",
};

function HolidayModal({ holiday, onClose, onDone }) {
  const isEdit = Boolean(holiday?._id);
  const [form, setForm] = useState(
    holiday
      ? {
          name: holiday.name,
          date: toIsoDate(holiday.date),
          type: holiday.type,
          description: holiday.description || "",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await holidayAPI.update(holiday._id, form);
        toast.success("Holiday updated.");
      } else {
        await holidayAPI.create(form);
        toast.success("Holiday added.");
      }
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save holiday.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-gray-900">
            {isEdit ? "Edit Holiday" : "Add Holiday"}
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
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              className="input-field"
              placeholder="e.g. Diwali, Republic Day"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={handleChange("date")}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
                Type
              </label>
              <select
                value={form.type}
                onChange={handleChange("type")}
                className="input-field"
              >
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getHolidayTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-500">
              Description (optional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={handleChange("description")}
              className="input-field"
              placeholder="Short description"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "Saving..." : isEdit ? "Update Holiday" : "Add Holiday"}
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

export default function HolidaysPage() {
  const { user, isHR } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | holiday object (edit)
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (user) loadHolidays();
  }, [user, year]);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const { data } = await holidayAPI.list({ year });
      setHolidays(data.holidays);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load holidays.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await holidayAPI.delete(deleteId);
      toast.success("Holiday removed.");
      setDeleteId(null);
      await loadHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete holiday.");
    }
  };

  const national = holidays.filter((h) => h.type === "national").length;
  const company = holidays.filter((h) => h.type === "company").length;

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  return (
    <AppShell>
      <div className="mx-auto  space-y-3">
        <PageHeader
          title="Holidays"
          description={
            isHR
              ? "Manage the official holiday calendar for the year."
              : "View upcoming holidays for the year."
          }
          actions={
            isHR
              ? [
                  <button
                    key="add"
                    type="button"
                    onClick={() => setModal("create")}
                    className="btn-primary text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Holiday
                  </button>,
                ]
              : undefined
          }
        />

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-surface-500">
              Year:
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input-field min-w-[120px]"
            >
              {getYearOptions(3).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={CalendarRange}
            label="Total Holidays"
            value={holidays.length}
            tone="bg-brand-100 text-brand-700"
            subtext={`In ${year}`}
          />
          <StatCard
            icon={CalendarRange}
            label="National"
            value={national}
            tone="bg-surface-100 text-surface-500"
            subtext="Public holidays"
          />
          <StatCard
            icon={CalendarRange}
            label="Company"
            value={company}
            tone="bg-blue-100 text-blue-700"
            subtext="Company-declared offs"
          />
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-surface-400">
              Loading holidays...
            </div>
          ) : sortedHolidays.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No holidays found"
              description={
                isHR
                  ? `No holidays have been added for ${year} yet.`
                  : `No holidays are scheduled for ${year}.`
              }
              action={
                isHR ? (
                  <button
                    type="button"
                    onClick={() => setModal("create")}
                    className="btn-primary text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Holiday
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    {[
                      "Date",
                      "Holiday",
                      "Type",
                      "Description",
                      ...(isHR ? ["Actions"] : []),
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500 ${h === "Actions" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {sortedHolidays.map((holiday) => (
                    <tr key={holiday._id} className="hover:bg-surface-50/80">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatDate(holiday.date)}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {holiday.name}
                      </td>
                      <td className="px-5 py-4 text-sm text-surface-500">
                        {getHolidayTypeLabel(holiday.type)}
                      </td>
                      <td className="px-5 py-4 text-sm text-surface-400 max-w-[200px]">
                        <p className="truncate">{holiday.description || "-"}</p>
                      </td>
                      {isHR && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setModal(holiday)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-surface-200 px-3 text-xs font-medium text-surface-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(holiday._id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 text-surface-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <HolidayModal
          holiday={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            loadHolidays();
          }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6">
            <h3 className="font-display text-lg font-bold text-gray-900">
              Remove Holiday
            </h3>
            <p className="mt-2 text-sm text-surface-500">
              Are you sure you want to remove this holiday from the calendar?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
