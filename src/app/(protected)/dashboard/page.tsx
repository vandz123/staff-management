"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { BarChart, DonutChart } from "@/components/Chart";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  KeyRound,
  FileEdit,
  Calendar,
  CalendarDays,
} from "lucide-react";

type DashboardData = {
  role: string;
  // Admin
  workforceOverview?: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    newThisMonth: number;
  };
  attendanceSummary?: {
    present: number;
    absent: number;
    late: number;
    missingCheckIn: number;
  };
  shiftCoverage?: Array<{
    name: string;
    required: number;
    assigned: number;
    status?: string;
  }>;
  pendingRequests?: {
    passwordReset: number;
    attendanceCorrection: number;
    leave: number;
  };
  attendanceTrend?: Array<{
    label: string;
    present: number;
    late: number;
    absent: number;
  }>;
  attendanceBreakdown?: {
    onTime: number;
    late: number;
    absent: number;
  };
  // Staff
  todaysSchedule?: { date: string; shift: string; time: string } | null;
  attendanceStatus?: {
    checkIn: string | null;
    checkOut: string | null;
    status: string;
  };
  leaveBalance?: number;
  recentLeaveRequests?: Array<{ id: string; leaveType: string; startDate: string; endDate: string; status: string }>;
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const colors: Record<string, string> = {
    ok: "bg-fresh-100 text-fresh-800",
    warning: "bg-warm-100 text-warm-800",
    missing: "bg-coral-100 text-coral-800",
  };
  const labels: Record<string, string> = {
    ok: "OK",
    warning: t("dash.pending"),
    missing: t("dash.absent"),
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-coral-200 bg-coral-50 p-6 text-coral-800">
        <p className="font-medium">{t("dash.failed")}</p>
        <p className="mt-1 text-sm">{t("dash.failedRetry")}</p>
      </div>
    );
  }

  if (!data.role || !["admin", "staff"].includes(data.role)) {
    return (
      <div className="rounded-lg border border-warm-200 bg-warm-50 p-6 text-warm-800">
        <p className="font-medium">{t("dash.roleError")}</p>
      </div>
    );
  }

  // ========== ADMIN DASHBOARD ==========
  if (data.role === "admin") {
    const wo = data.workforceOverview ?? { totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0, newThisMonth: 0 };
    const as = data.attendanceSummary ?? { present: 0, absent: 0, late: 0, missingCheckIn: 0 };
    const pr = data.pendingRequests ?? { passwordReset: 0, attendanceCorrection: 0, leave: 0 };
    const trend = data.attendanceTrend ?? [];
    const breakdown = data.attendanceBreakdown ?? { onTime: 0, late: 0, absent: 0 };

    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("dash.admin.title")}</h1>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.workforce")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t("dash.totalEmployees")} value={wo.totalEmployees} icon={Users} color="bg-primary-500" />
            <StatCard title={t("dash.active")} value={wo.activeEmployees} icon={UserCheck} color="bg-fresh-500" />
            <StatCard title={t("dash.inactive")} value={wo.inactiveEmployees} icon={UserX} color="bg-slate-500" />
            <StatCard title={t("dash.newThisMonth")} value={wo.newThisMonth} icon={UserPlus} color="bg-accent-500" />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.attendanceSummary")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t("dash.present")} value={as.present} icon={ClipboardCheck} color="bg-fresh-500" />
            <StatCard title={t("dash.absent")} value={as.absent} icon={UserX} color="bg-coral-500" />
            <StatCard title={t("dash.late")} value={as.late} icon={Clock} color="bg-warm-500" />
            <StatCard title={t("dash.missingCheckIn")} value={as.missingCheckIn} icon={AlertTriangle} color="bg-warm-500" />
          </div>
        </section>

        {/* Charts Section */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.analytics")}</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-slate-600">{t("dash.attendanceTrend")}</h3>
              <BarChart
                labels={trend.map((d) => d.label)}
                datasets={[
                  { label: t("dash.onTime"), data: trend.map((d) => d.present), color: "#22c55e" },
                  { label: t("dash.late"), data: trend.map((d) => d.late), color: "#f59e0b" },
                  { label: t("dash.absent"), data: trend.map((d) => d.absent), color: "#ef4444" },
                ]}
                height={240}
              />
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-600">{t("dash.attendanceBreakdown")}</h3>
              <DonutChart
                segments={[
                  { label: t("dash.onTime"), value: breakdown.onTime, color: "#22c55e" },
                  { label: t("dash.late"), value: breakdown.late, color: "#f59e0b" },
                  { label: t("dash.absent"), value: breakdown.absent, color: "#ef4444" },
                ]}
                size={180}
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.shiftCoverage")}</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm">
            <table className="w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.shift")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.required")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.assigned")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(data.shiftCoverage ?? []).map((s) => (
                  <tr key={s.name}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.required}</td>
                    <td className="px-4 py-3">{s.assigned}</td>
                    <td className="px-4 py-3">
                      {s.status && <StatusBadge status={s.status} t={t} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.pendingRequests")}</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/password-requests"
              className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.02] hover:border-primary-300"
            >
              <KeyRound className="h-8 w-8 text-primary-600" />
              <div>
                <p className="font-medium text-slate-800">{t("dash.passwordReset")}</p>
                <p className="text-2xl font-bold text-primary-600">{pr.passwordReset}</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <FileEdit className="h-8 w-8 text-warm-600" />
              <div>
                <p className="font-medium text-slate-800">{t("dash.attendanceCorrection")}</p>
                <p className="text-2xl font-bold text-warm-600">{pr.attendanceCorrection}</p>
              </div>
            </div>
            <Link
              href="/approvals"
              className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.02] hover:border-primary-300"
            >
              <Calendar className="h-8 w-8 text-accent-600" />
              <div>
                <p className="font-medium text-slate-800">{t("dash.leaveRequests")}</p>
                <p className="text-2xl font-bold text-accent-600">{pr.leave}</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ========== STAFF DASHBOARD ==========
  const schedule = data.todaysSchedule;
  const att = data.attendanceStatus;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("dash.staff.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Calendar className="h-5 w-5 text-primary-500" /> {t("dash.todaysSchedule")}
          </h2>
          {schedule ? (
            <div>
              <p className="text-2xl font-bold text-slate-800">{schedule.shift}</p>
              <p className="text-slate-600">{schedule.time}</p>
              <p className="mt-1 text-sm text-slate-500">
                {format(new Date(schedule.date), "EEEE, d MMM yyyy")}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">{t("dash.noShift")}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <ClipboardCheck className="h-5 w-5 text-fresh-500" /> {t("dash.attendanceStatus")}
          </h2>
          {att ? (
            <div className="space-y-2">
              <p>
                <span className="text-slate-500">{t("dash.checkIn")}:</span>{" "}
                {att.checkIn ? format(new Date(att.checkIn), "HH:mm") : "—"}
              </p>
              <p>
                <span className="text-slate-500">{t("dash.checkOut")}:</span>{" "}
                {att.checkOut ? format(new Date(att.checkOut), "HH:mm") : t("dash.notYet")}
              </p>
              <p className="font-medium text-slate-800">{att.status}</p>
            </div>
          ) : (
            <p className="text-slate-500">{t("dash.noRecord")}</p>
          )}
        </section>
      </div>

      {/* Leave Balance - replaces payroll estimate */}
      {data.leaveBalance != null && (
        <section className="mt-6 rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <CalendarDays className="h-5 w-5 text-accent-500" /> {t("dash.leaveBalance")}
          </h2>
          <p className="text-3xl font-bold text-slate-800">{data.leaveBalance} {t("dash.days")}</p>
          <p className="text-sm text-slate-500">{t("dash.daysRemaining")}</p>
          <Link href="/leave" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            {t("dash.submitLeave")}
          </Link>
        </section>
      )}
    </div>
  );
}
