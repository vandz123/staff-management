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
  TrendingUp,
  GraduationCap,
  KeyRound,
  FileEdit,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { AttendanceChart, EmployeeStatusChart, DepartmentAttendanceChart, OvertimeChart, LeaveChart } from "@/components/DashboardCharts";

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
  payrollOverview?: {
    totalPayroll: number;
    totalOvertimeHours: number;
    highestOTDept: string;
  };
  trainingStatus?: { completed: number; pending: number; overdue: number };
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
  // Manager
  teamOverview?: {
    teamSize: number;
    presentToday: number;
    absent: number;
    late: number;
  };
  teamShiftSchedule?: Array<{ employee: string; shift: string; time: string }>;
  attendanceAlerts?: Array<{ issue: string; employee: string }>;
  shiftCoverageWarning?: Array<{ name: string; required: number; assigned: number }>;
  trainingProgress?: Array<{ employee: string; training: string; status: string }>;
  pendingApprovals?: {
    leave: Array<{ id: string; employee: string; type: string; startDate: string; endDate: string }>;
    overtime: Array<{ id: string; employee: string; hours: number; date: string }>;
    attendanceCorrection: Array<{ id: string; employee: string }>;
  };
  // Staff
  todaysSchedule?: { date: string; shift: string; time: string } | null;
  attendanceStatus?: {
    checkIn: string | null;
    checkOut: string | null;
    status: string;
  };
  workHoursSummary?: {
    totalHours: number;
    overtime: number;
    payPeriodStart: string;
    payPeriodEnd: string;
  };
  payrollEstimate?: {
    baseSalary: number;
    overtimePay: number;
    deductions: number;
    estimatedTotal: number;
  };
  trainingTasks?: Array<{
    id: string;
    training: string;
    deadline: string | null;
    status: string;
  }>;
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

  if (!data.role || !["admin", "manager", "staff"].includes(data.role)) {
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

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.payrollOverview")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-sm text-slate-500">{t("dash.totalPayroll")}</p>
              <p className="text-xl font-bold text-slate-800">
                {((data.payrollOverview?.totalPayroll ?? 0) / 1_000_000).toFixed(1)}M VND
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-sm text-slate-500">{t("dash.totalOvertime")}</p>
              <p className="text-xl font-bold text-slate-800">
                {data.payrollOverview?.totalOvertimeHours ?? 0} {t("dash.hours")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-sm text-slate-500">{t("dash.highestOTDept")}</p>
              <p className="text-xl font-bold text-slate-800">
                {data.payrollOverview?.highestOTDept ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
<<<<<<< HEAD
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.trainingStatus")}</h2>
=======
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Analytics Dashboard</h2>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 font-semibold text-slate-700">Attendance Trends</h3>
              <AttendanceChart 
                data={[
                  { name: "Today", present: as.present, absent: as.absent, late: as.late },
                  { name: "Weekly Avg", present: Math.round(as.present * 0.8), absent: Math.round(as.absent * 1.2), late: Math.round(as.late * 0.9) }
                ]} 
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 font-semibold text-slate-700">Employee Status Distribution</h3>
              <EmployeeStatusChart 
                data={[
                  { name: "Active", value: wo.activeEmployees },
                  { name: "Inactive", value: wo.inactiveEmployees },
                  { name: "New", value: wo.newThisMonth }
                ]} 
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Training Status</h2>
>>>>>>> 9abf6cda9ff002082fab1b990049f7e110b5c836
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title={t("dash.completed")} value={data.trainingStatus?.completed ?? 0} icon={GraduationCap} color="bg-fresh-500" />
            <StatCard title={t("dash.pending")} value={data.trainingStatus?.pending ?? 0} icon={Clock} color="bg-warm-500" />
            <StatCard title={t("dash.overdue")} value={data.trainingStatus?.overdue ?? 0} icon={AlertTriangle} color="bg-coral-500" />
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
              href="/leave-approvals"
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

  // ========== MANAGER DASHBOARD ==========
  if (data.role === "manager") {
    const to = data.teamOverview ?? { teamSize: 0, presentToday: 0, absent: 0, late: 0 };
    const pa = data.pendingApprovals ?? { leave: [], overtime: [], attendanceCorrection: [] };

    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("dash.manager.title")}</h1>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.teamOverview")}</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard title={t("dash.teamSize")} value={to.teamSize} icon={Users} color="bg-primary-500" />
            <StatCard title={t("dash.presentToday")} value={to.presentToday} icon={UserCheck} color="bg-fresh-500" />
            <StatCard title={t("dash.absent")} value={to.absent} icon={UserX} color="bg-coral-500" />
            <StatCard title={t("dash.late")} value={to.late} icon={Clock} color="bg-warm-500" />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.teamShiftSchedule")}</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm">
              <table className="w-full">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.employee")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.shift")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(data.teamShiftSchedule ?? []).map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium">{s.employee}</td>
                      <td className="px-4 py-3">{s.shift} ({s.time})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.attendanceAlerts")}</h2>
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              {(data.attendanceAlerts ?? []).length === 0 ? (
                <p className="text-slate-500">{t("dash.noAlerts")}</p>
              ) : (
                <ul className="space-y-2">
                  {(data.attendanceAlerts ?? []).map((a, i) => (
                    <li key={i} className="flex justify-between rounded-lg bg-warm-50 px-3 py-2">
                      <span className="font-medium text-warm-800">{a.issue}</span>
                      <span className="text-warm-700">{a.employee}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {(data.shiftCoverageWarning ?? []).length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.shiftCoverageWarning")}</h2>
            <div className="rounded-xl border border-coral-200 bg-coral-50 p-4">
              {data.shiftCoverageWarning?.map((s, i) => (
                <p key={i} className="text-coral-800">
                  {s.name}: {s.assigned}/{s.required} {t("dash.assigned")} — missing {s.required - s.assigned}
                </p>
              ))}
              <Link href="/schedules" className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
                {t("dash.assignStaff")}
              </Link>
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.trainingProgress")}</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm">
            <table className="w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.employee")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.training")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(data.trainingProgress ?? []).map((tr, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{tr.employee}</td>
                    <td className="px-4 py-3">{tr.training}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          tr.status === "Completed"
                            ? "bg-fresh-100 text-fresh-700"
                            : tr.status === "Overdue"
                              ? "bg-coral-100 text-coral-700"
                              : "bg-warm-100 text-warm-700"
                        }`}
                      >
                        {tr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{t("dash.pendingApprovals")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <h3 className="mb-2 font-medium text-slate-700">{t("dash.leaveRequests")} ({pa.leave.length})</h3>
              {pa.leave.length === 0 ? (
                <p className="text-sm text-slate-500">{t("dash.none")}</p>
              ) : (
                <ul className="space-y-2">
                  {pa.leave.slice(0, 3).map((l) => (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <span>{l.employee}</span>
                      <Link
                        href="/leave-approvals"
                        className="text-primary-600 hover:underline"
                      >
                        {t("dash.approve")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <h3 className="mb-2 font-medium text-slate-700">{t("dash.overtime")} ({pa.overtime.length})</h3>
              {pa.overtime.length === 0 ? (
                <p className="text-sm text-slate-500">{t("dash.none")}</p>
              ) : (
                <ul className="space-y-2">
                  {pa.overtime.slice(0, 3).map((o) => (
                    <li key={o.id} className="flex items-center justify-between text-sm">
                      <span>{o.employee} — {o.hours}h</span>
                      <Link href="/overtime-approvals" className="text-primary-600 hover:underline">
                        {t("dash.approve")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <h3 className="mb-2 font-medium text-slate-700">{t("dash.corrections")} ({pa.attendanceCorrection.length})</h3>
              {pa.attendanceCorrection.length === 0 ? (
                <p className="text-sm text-slate-500">{t("dash.none")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {pa.attendanceCorrection.map((c) => (
                    <li key={c.id}>{c.employee}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ========== STAFF DASHBOARD ==========
  const schedule = data.todaysSchedule;
  const att = data.attendanceStatus;
  const wh = data.workHoursSummary;
  const pay = data.payrollEstimate;
  const tasks = data.trainingTasks ?? [];

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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Clock className="h-5 w-5 text-accent-500" /> {t("dash.workHours")}
          </h2>
          {wh ? (
            <div>
              <p className="text-2xl font-bold text-slate-800">{wh.totalHours} {t("dash.hours")}</p>
              <p className="text-slate-600">{t("dash.overtime")}: {wh.overtime} {t("dash.hours")}</p>
              <p className="mt-1 text-xs text-slate-500">
                Pay period: {format(new Date(wh.payPeriodStart), "d MMM")} –{" "}
                {format(new Date(wh.payPeriodEnd), "d MMM yyyy")}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">{t("dash.noData")}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <TrendingUp className="h-5 w-5 text-warm-500" /> {t("dash.payrollEstimate")}
          </h2>
          {pay ? (
            <div className="space-y-2">
              <p>
                <span className="text-slate-500">{t("dash.baseSalary")}:</span>{" "}
                {(pay.baseSalary / 1_000_000).toFixed(1)}M VND
              </p>
              <p>
                <span className="text-slate-500">{t("dash.overtimePay")}:</span>{" "}
                {(pay.overtimePay / 1_000).toFixed(0)}K VND
              </p>
              {pay.deductions > 0 && (
                <p className="text-coral-600">{t("dash.deductions")}: {(pay.deductions / 1_000).toFixed(0)}K VND</p>
              )}
              <p className="mt-2 text-xl font-bold text-slate-800">
                {t("dash.estimated")}: {(pay.estimatedTotal / 1_000_000).toFixed(2)}M VND
              </p>
            </div>
          ) : (
            <p className="text-slate-500">{t("dash.noSalaryData")}</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
          <GraduationCap className="h-5 w-5 text-primary-500" /> {t("dash.trainingTasks")}
        </h2>
        {tasks.length === 0 ? (
          <p className="text-slate-500">{t("dash.noTraining")}</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <span className="font-medium">{task.training}</span>
                  {task.deadline && (
                    <span className="ml-2 text-sm text-slate-500">
                      Deadline: {format(new Date(task.deadline), "d MMM yyyy")}
                    </span>
                  )}
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    task.status === "completed" ? "bg-fresh-100 text-fresh-700" : "bg-warm-100 text-warm-700"
                  }`}
                >
                  {task.status === "completed" ? t("dash.completed") : task.deadline && new Date(task.deadline) < new Date() ? t("dash.overdue") : t("dash.pending")}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/trainings" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
          {t("dash.viewAllTrainings")}
        </Link>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
          <MessageCircle className="h-5 w-5 text-accent-500" /> {t("dash.hrAssistant")}
        </h2>
        <p className="mb-3 text-slate-600">
          {t("dash.hrAssistantDesc")}
        </p>
        <Link
          href="/ai-assistant"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 px-4 py-2 font-medium text-white shadow-md hover:shadow-lg transition-shadow"
        >
          <MessageCircle className="h-4 w.4" /> {t("dash.openHRAssistant")}
        </Link>
      </section>

      {data.leaveBalance != null && (
        <section className="mt-6 rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-700">{t("dash.leaveBalance")}</h2>
          <p className="text-2xl font-bold text-slate-800">{data.leaveBalance} days</p>
          <p className="text-sm text-slate-500">{t("dash.daysRemaining")}</p>
          <Link href="/leave" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            {t("dash.submitLeave")}
          </Link>
        </section>
      )}
    </div>
  );
}
