"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  Clock,
  GraduationCap,
  FileText,
  MessageCircle,
  LogOut,
  KeyRound,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  roles?: string[];
};

const navItems: (NavItem | NavGroup)[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff", label: "Staff", icon: Users, roles: ["admin", "manager", "staff"] },
  { href: "/password-requests", label: "Password Requests", icon: KeyRound, roles: ["admin"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["admin", "manager"] },
  { href: "/schedules", label: "Shift Schedule", icon: Calendar, roles: ["admin", "manager"] },
  {
    label: "Timekeeping",
    icon: Clock,
    items: [
      { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/work-hours", label: "Work Hours", icon: Clock },
      { href: "/leave", label: "Leave", icon: CalendarDays },
      { href: "/overtime", label: "Overtime", icon: Clock },
      { href: "/leave-approvals", label: "Leave Approvals", icon: ClipboardCheck, roles: ["admin", "manager"] },
      { href: "/overtime-approvals", label: "Overtime Approvals", icon: Clock, roles: ["admin", "manager"] },
    ],
  },
  { href: "/trainings", label: "Training", icon: GraduationCap },
  { href: "/policies", label: "Policy Docs", icon: FileText },
  { href: "/ai-assistant", label: "HR Assistant", icon: MessageCircle },
];

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Timekeeping: true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const canSeeItem = (item: NavItem) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  };

  const canSeeGroup = (group: NavGroup) => {
    if (!group.roles) return true;
    return user && group.roles.includes(user.role);
  };

  const hasVisibleItems = (group: NavGroup) => {
    return group.items.some((item) => canSeeItem(item));
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-4">
          <Link href="/dashboard" className="font-semibold text-slate-800">
            Staff Management
          </Link>
        </div>
        <nav className="flex-1 overflow-auto p-2">
          {navItems.map((item) => {
            if (isNavGroup(item)) {
              if (!canSeeGroup(item) || !hasVisibleItems(item)) return null;
              const isOpen = openGroups[item.label] ?? false;
              const isActive = item.items.some((i) => pathname === i.href);
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pl-2">
                      {item.items
                        .filter((i) => canSeeItem(i))
                        .map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                              pathname === subItem.href
                                ? "bg-primary-50 font-medium text-primary-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            )}
                          >
                            <subItem.icon className="h-4 w-4 shrink-0" />
                            {subItem.label}
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              );
            }
            if (!canSeeItem(item)) return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-2">
          <div className="mb-2 px-3 py-2 text-xs text-slate-500">
            {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.username} ({user?.role})
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
