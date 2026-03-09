"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardCheck,
  Clock,
  GraduationCap,
  FileText,
  MessageCircle,
  LogOut,
} from "lucide-react";

const nav: { href: string; label: string; icon: React.ElementType; roles?: string[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users, roles: ["admin", "manager"] },
  { href: "/schedules", label: "Shift Schedule", icon: Calendar, roles: ["admin", "manager"] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/work-hours", label: "Work Hours", icon: Clock },
  { href: "/trainings", label: "Training", icon: GraduationCap },
  { href: "/policies", label: "Policy Docs", icon: FileText, roles: ["admin"] },
  { href: "/ai-assistant", label: "HR Assistant", icon: MessageCircle },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const visibleNav = nav.filter(
    (n) => !n.roles || (user && n.roles.includes(user.role))
  );

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
          {visibleNav.map((item) => (
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
          ))}
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
