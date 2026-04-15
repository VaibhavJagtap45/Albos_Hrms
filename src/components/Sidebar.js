'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Bell, CalendarCheck, CalendarRange, Fingerprint, LayoutDashboard,
  LogOut, ReceiptText, Sun, UserCircle, Users, X,
} from 'lucide-react';
import { classNames, getInitials } from '@/lib/utils';

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['hr', 'employee'] },
    { href: '/employees', label: 'Employees', icon: Users, roles: ['hr'] },
    { href: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['hr', 'employee'] },
    { href: '/leaves', label: 'Leaves', icon: CalendarRange, roles: ['hr', 'employee'] },
    { href: '/payroll', label: 'Payroll', icon: ReceiptText, roles: ['hr', 'employee'] },
    { href: '/notices', label: 'Notices', icon: Bell, roles: ['hr', 'employee'] },
    { href: '/holidays', label: 'Holidays', icon: Sun, roles: ['hr', 'employee'] },
    { href: '/profile', label: 'My Profile', icon: UserCircle, roles: ['hr', 'employee'] },
  ];

  const filtered = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      <div
        className={classNames(
          'fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={classNames(
          'fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-surface-200 bg-white transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:z-40 lg:translate-x-0',
        )}
      >
        <div className="border-b border-surface-200 p-5">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-white">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-sm font-bold tracking-tight text-gray-900">HRMS</p>
                <p className="text-[11px] text-surface-400">Albos Technology</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-200 text-surface-500 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {filtered.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-surface-200 p-4">
          <div className="rounded-2xl bg-surface-50 p-3">
            <div className="flex items-center gap-3">
              {user?.avatar || user?.profilePic ? (
                <img
                  src={user.avatar || user.profilePic}
                  alt={user.name}
                  className="h-10 w-10 rounded-2xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                  <span className="text-sm font-bold">{getInitials(user?.name)}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="truncate text-[11px] uppercase tracking-wider text-surface-400">{user?.role}</p>
              </div>
            </div>
          </div>

          <button onClick={logout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
