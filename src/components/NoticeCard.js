import { Bell, BellRing, UserRound } from 'lucide-react';
import { formatDateTime, getNoticeTypeLabel, getStatusTone } from '@/lib/utils';

export default function NoticeCard({ notice, onOpen, showActions }) {
  const isUnread = notice.isRead === false;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(notice)}
      className="glass-card block w-full p-5 text-left transition-all duration-200 hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${isUnread ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-500'}`}>
            {isUnread ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-lg font-bold text-gray-900">{notice.title}</h3>
              <span className={`status-badge ${getStatusTone(isUnread ? 'finalised' : 'draft')}`}>
                {isUnread ? 'Unread' : 'Read'}
              </span>
              <span className="status-badge bg-surface-100 text-surface-500">{getNoticeTypeLabel(notice.type)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-surface-500">{notice.body}</p>
          </div>
        </div>
        {showActions ? (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-surface-400">Readers</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{notice.readCount ?? notice.readBy?.length ?? 0}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-surface-400">
        <span>{formatDateTime(notice.createdAt)}</span>
        {notice.recipient ? (
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3.5 w-3.5" />
            {notice.recipient.name}
          </span>
        ) : null}
        {notice.createdBy?.name ? <span>By {notice.createdBy.name}</span> : null}
      </div>
    </button>
  );
}
