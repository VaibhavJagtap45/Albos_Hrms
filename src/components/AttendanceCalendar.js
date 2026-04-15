'use client';

import { CalendarDays } from 'lucide-react';
import {
  buildCalendarDays,
  classNames,
  dayLabel,
  formatDate,
  formatTime,
  getAttendanceSummary,
  isCurrentMonthDate,
  isFutureDay,
  isTodayDate,
} from '@/lib/utils';

const CELL_STYLES = {
  present: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  late: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  leave: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  holiday: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  absent: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  'half-day': 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  weekoff: 'bg-white text-surface-300 ring-1 ring-surface-100',
  future: 'bg-white text-surface-300 ring-1 ring-surface-100',
};

function getCellState(day, recordsByDate, holidaysByDate) {
  if (!day) return 'future';
  const iso = day.toISOString().split('T')[0];
  const holiday = holidaysByDate.get(iso);
  if (holiday) return 'holiday';
  if (day.getDay() === 0) return 'weekoff';
  const record = recordsByDate.get(iso);
  if (record) return record.status || 'present';
  if (isFutureDay(day)) return 'future';
  return 'absent';
}

export default function AttendanceCalendar({
  year,
  month,
  records = [],
  holidays = [],
  selectedDate,
  onSelectDate,
}) {
  const cells = buildCalendarDays(year, month);
  const recordsByDate = new Map(records.map((record) => [String(record.date).split('T')[0], record]));
  const holidaysByDate = new Map(holidays.map((holiday) => [String(holiday.date).split('T')[0], holiday]));
  const selectedIso = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const summary = getAttendanceSummary(records);

  const detailRecord = selectedDate ? recordsByDate.get(selectedIso) : null;
  const detailHoliday = selectedDate ? holidaysByDate.get(selectedIso) : null;
  const detailState = selectedDate ? getCellState(selectedDate, recordsByDate, holidaysByDate) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
            <div key={label} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-surface-100">
          {cells.map((day, index) => {
            const state = getCellState(day, recordsByDate, holidaysByDate);
            const iso = day ? day.toISOString().split('T')[0] : `blank-${index}`;
            const isSelected = day && iso === selectedIso;
            const record = day ? recordsByDate.get(iso) : null;
            const holiday = day ? holidaysByDate.get(iso) : null;

            return (
              <button
                key={iso}
                type="button"
                disabled={!day}
                onClick={() => day && onSelectDate?.(day)}
                className={classNames(
                  'min-h-[108px] bg-white p-3 text-left transition-all duration-200',
                  day ? 'hover:bg-brand-50/50' : 'cursor-default',
                  isSelected ? 'ring-2 ring-brand-400 ring-inset' : '',
                )}
              >
                {day ? (
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={classNames(
                            'text-sm font-semibold',
                            !isCurrentMonthDate(day, year, month) ? 'text-surface-300' : 'text-gray-900',
                            isTodayDate(day) ? 'text-brand-700' : '',
                          )}
                        >
                          {formatDate(day, 'dd')}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-surface-300">{dayLabel(day)}</p>
                      </div>
                      <span className={classNames('rounded-full px-2 py-1 text-[10px] font-semibold capitalize', CELL_STYLES[state])}>
                        {state === 'weekoff' ? 'Off' : state.replace('-', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {holiday ? <p className="line-clamp-2 text-[11px] text-surface-500">{holiday.name}</p> : null}
                      {record?.checkIn ? <p className="text-[11px] text-surface-500">In {record.checkIn}</p> : null}
                      {record?.checkOut ? <p className="text-[11px] text-surface-500">Out {record.checkOut}</p> : null}
                      {!holiday && !record && state === 'weekoff' ? <p className="text-[11px] text-surface-400">Weekly off</p> : null}
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[108px] bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-gray-900">Month Snapshot</h3>
              <p className="text-xs text-surface-400">Attendance status overview</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Present', summary.present, 'text-green-700'],
              ['Late', summary.late, 'text-amber-700'],
              ['Leaves', summary.leave + summary['half-day'], 'text-blue-700'],
              ['Holidays', holidays.length, 'text-surface-500'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-2xl bg-surface-50 p-3">
                <p className="text-xs text-surface-400">{label}</p>
                <p className={`mt-1 text-xl font-display font-bold ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-gray-900">Day Details</h3>
          {selectedDate ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-surface-400">Selected Date</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(selectedDate)}</p>
              </div>
              <div className="rounded-2xl bg-surface-50 p-4">
                <p className="text-xs uppercase tracking-wider text-surface-400">Status</p>
                <p className="mt-1 text-sm font-semibold capitalize text-gray-900">
                  {detailState === 'weekoff' ? 'Weekly Off' : detailState?.replace('-', ' ')}
                </p>
              </div>
              {detailHoliday ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wider text-surface-400">Holiday</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{detailHoliday.name}</p>
                  <p className="mt-1 text-xs capitalize text-surface-400">{detailHoliday.type}</p>
                </div>
              ) : null}
              {detailRecord ? (
                <div className="space-y-3 rounded-2xl bg-brand-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-surface-400">Check In</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {detailRecord.checkIn || formatTime(detailRecord.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-surface-400">Check Out</span>
                    <span className="text-sm font-semibold text-gray-900">{detailRecord.checkOut || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-surface-400">Working Hours</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {detailRecord.workingHours ? `${detailRecord.workingHours} hrs` : '-'}
                    </span>
                  </div>
                  {detailRecord.note ? (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-surface-400">Note</p>
                      <p className="mt-1 text-sm text-surface-500">{detailRecord.note}</p>
                    </div>
                  ) : null}
                </div>
              ) : detailHoliday ? null : (
                <p className="rounded-2xl bg-surface-50 p-4 text-sm text-surface-400">
                  No attendance record was found for this day.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-surface-50 p-4 text-sm text-surface-400">
              Select a day on the calendar to see attendance and holiday details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
