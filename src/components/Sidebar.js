"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Bell,
  CalendarCheck,
  CalendarRange,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { classNames, getInitials } from "@/lib/utils";

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      hint: "Overview",
      icon: LayoutDashboard,
      roles: ["hr", "employee"],
    },
    {
      href: "/employees",
      label: "Employees",
      hint: "Team directory",
      icon: Users,
      roles: ["hr"],
    },
    {
      href: "/attendance",
      label: "Attendance",
      hint: "Daily tracking",
      icon: CalendarCheck,
      roles: ["hr", "employee"],
    },
    {
      href: "/leaves",
      label: "Leaves",
      hint: "Requests and approvals",
      icon: CalendarRange,
      roles: ["hr", "employee"],
    },
    {
      href: "/payroll",
      label: "Payroll",
      hint: "Salary operations",
      icon: ReceiptText,
      roles: ["hr", "employee"],
    },
    {
      href: "/notices",
      label: "Notices",
      hint: "Company updates",
      icon: Bell,
      roles: ["hr", "employee"],
    },
    {
      href: "/holidays",
      label: "Holidays",
      hint: "Calendar and breaks",
      icon: Sun,
      roles: ["hr", "employee"],
    },
    {
      href: "/profile",
      label: "My Profile",
      hint: "Personal details",
      icon: UserCircle,
      roles: ["hr", "employee"],
    },
  ];

  const filtered = navItems.filter((item) => item.roles.includes(user?.role));
  const roleLabel = user?.role === "hr" ? "Operations Lead" : "Employee Access";

  return (
    <>
      <div
        className={classNames(
          "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={classNames(
          "fixed left-0 top-0 z-50 h-screen w-[280px] overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#12061d_0%,#1d0b35_42%,#0f0517_100%)] text-white shadow-[0_28px_80px_rgba(15,23,42,0.35)] transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:z-40 lg:translate-x-0",
        )}
      >
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.9) 1px, transparent 1.5px), radial-gradient(circle at 75% 30%, rgba(196,181,253,0.75) 1px, transparent 1.6px), radial-gradient(circle at 40% 80%, rgba(217,70,239,0.35) 1px, transparent 1.6px)",
              backgroundSize: "180px 180px, 260px 260px, 320px 320px",
            }}
          />
          <div className="absolute left-[-72px] top-[-36px] h-56 w-56 rounded-full bg-violet-400/[0.16] blur-3xl" />
          <div className="absolute bottom-24 right-[-96px] h-60 w-60 rounded-full bg-fuchsia-400/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        <div className="relative flex h-full flex-col">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard"
                className="flex items-center gap-3"
                onClick={onClose}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br from-violet-400 via-brand-500 to-indigo-500 text-white shadow-[0_16px_34px_rgba(109,40,217,0.32)]">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
                    Workspace
                  </p>
                  <p className="font-display text-base font-bold tracking-tight text-white">
                    HRMS
                  </p>
                  <p className="text-[11px] text-white/60">Albos Technology</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* <div className="mt-5 overflow-hidden rounded-[26px] border border-violet-300/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-4 shadow-[0_20px_48px_rgba(9,5,20,0.3)] backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
                    Control Center
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold text-white">
                    Galaxy operations cockpit
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-violet-100 ring-1 ring-white/10">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/[0.65]">
                Track attendance, manage leave, and finalise payroll from one
                focused command deck.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    Modules
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {String(filtered.length).padStart(2, "0")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    Access
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {user?.role === "hr" ? "HR" : "EMP"}
                  </p>
                </div>
              </div>
            </div> */}
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/30">
              Command Deck
            </p>
            <div className="mt-3 space-y-1">
              {filtered.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={
                      isActive
                        ? "group sidebar-link-active"
                        : "group sidebar-link"
                    }
                  >
                    <span
                      className={classNames(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                        isActive
                          ? "bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                          : "bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      <span
                        className={classNames(
                          "mt-0.5 block truncate text-[11px]",
                          isActive
                            ? "text-white/60"
                            : "text-white/40 group-hover:text-white/55",
                        )}
                      >
                        {item.hint}
                      </span>
                    </span>
                    <span
                      className={classNames(
                        "h-2.5 w-2.5 rounded-full transition-all duration-200",
                        isActive
                          ? "bg-violet-300"
                          : "bg-transparent group-hover:bg-white/20",
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="space-y-3 border-t border-white/10 p-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {user?.avatar || user?.profilePic ? (
                  <img
                    src={user.avatar || user.profilePic}
                    alt={user.name}
                    className="h-12 w-12 flex-shrink-0 rounded-2xl object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-brand-500 to-indigo-500 text-white shadow-[0_12px_24px_rgba(109,40,217,0.2)]">
                    <span className="text-sm font-bold">
                      {getInitials(user?.name)}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.name}
                  </p>
                  <p className="truncate text-[11px] uppercase tracking-[0.3em] text-white/45">
                    {roleLabel}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  <ShieldCheck className="h-3 w-3" />
                  Ready
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="sidebar-link w-full justify-center border border-white/10 bg-white/[0.06] text-white/70 hover:border-rose-300/20 hover:bg-rose-500/10 hover:text-rose-100"
            >
              <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
