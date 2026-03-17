"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Globe,
} from "lucide-react";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  roles?: string[];
};

type NavGroup = {
  labelKey: string;
  icon: React.ElementType;
  items: NavItem[];
  roles?: string[];
};

const navItems: (NavItem | NavGroup)[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/staff", labelKey: "nav.staff", icon: Users, roles: ["admin", "manager", "staff"] },
  { href: "/password-requests", labelKey: "nav.passwordRequests", icon: KeyRound, roles: ["admin"] },
  { href: "/employees", labelKey: "nav.employees", icon: Users, roles: ["admin", "manager"] },
  { href: "/schedules", labelKey: "nav.shiftSchedule", icon: Calendar, roles: ["admin", "manager"] },
  {
    labelKey: "nav.timekeeping",
    icon: Clock,
    items: [
      { href: "/attendance", labelKey: "nav.attendance", icon: ClipboardCheck },
      { href: "/work-hours", labelKey: "nav.workHours", icon: Clock },
      { href: "/leave", labelKey: "nav.leave", icon: CalendarDays },
      { href: "/overtime", labelKey: "nav.overtime", icon: Clock },
      { href: "/leave-approvals", labelKey: "nav.leaveApprovals", icon: ClipboardCheck, roles: ["admin", "manager"] },
      { href: "/overtime-approvals", labelKey: "nav.overtimeApprovals", icon: Clock, roles: ["admin", "manager"] },
    ],
  },
  { href: "/trainings", labelKey: "nav.training", icon: GraduationCap },
  { href: "/policies", labelKey: "nav.policies", icon: FileText },
  { href: "/ai-assistant", labelKey: "nav.hrAssistant", icon: MessageCircle },
];

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "nav.timekeeping": true,
  });

  const toggleGroup = (labelKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [labelKey]: !prev[labelKey] }));
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

  const toggleLang = () => {
    setLocale(locale === "en" ? "vi" : "en");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col bg-gradient-to-b from-primary-600 via-primary-700 to-accent-700">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link href="/dashboard" className="font-bold text-white text-sm">
            {t("app.title")}
          </Link>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white transition-all hover:bg-white/25"
            title={locale === "en" ? "Switch to Vietnamese" : "Chuyển sang Tiếng Anh"}
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === "en" ? "VI" : "EN"}
          </button>
        </div>
        <nav className="flex-1 overflow-auto p-2">
          {navItems.map((item) => {
            if (isNavGroup(item)) {
              if (!canSeeGroup(item) || !hasVisibleItems(item)) return null;
              const isOpen = openGroups[item.labelKey] ?? false;
              const isActive = item.items.some((i) => pathname === i.href);
              return (
                <div key={item.labelKey}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.labelKey)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {t(item.labelKey)}
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-white/20 pl-2">
                      {item.items
                        .filter((i) => canSeeItem(i))
                        .map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                              pathname === subItem.href
                                ? "bg-white/20 font-medium text-white"
                                : "text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <subItem.icon className="h-4 w-4 shrink-0" />
                            {t(subItem.labelKey)}
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
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 p-2">
          <div className="mb-2 px-3 py-2 text-xs text-white/60">
            {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.username} ({user?.role})
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
