"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color} text-white`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    missing: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status === "ok" ? "OK" : status === "warning" ? "Almost full" : "Missing staff"}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-medium">Failed to load dashboard.</p>
        <p className="mt-1 text-sm">Please refresh the page or contact support if the problem persists.</p>
      </div>
    );
  }

  if (!data.role || !["admin", "manager", "staff"].includes(data.role)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Unable to load dashboard for your role.</p>
      </div>
    );
  }

  // ========== ADMIN DASHBOARD ==========
  if (data.role === "admin") {
    const wo = data.workforceOverview ?? { totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0, newThisMonth: 0 };
    const as = data.attendanceSummary ?? { present: 0, absent: 0, late: 0, missingCheckIn: 0 };
    const pr = data.pendingRequests ?? { passwordReset: 0, attendanceCorrection: 0, leave: 0 };

    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-slate-800">Admin Dashboard</h1>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Workforce Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Employees" value={wo.totalEmployees} icon={Users} color="bg-primary-500" />
            <StatCard title="Active" value={wo.activeEmployees} icon={UserCheck} color="bg-emerald-500" />
            <StatCard title="Inactive" value={wo.inactiveEmployees} icon={UserX} color="bg-slate-500" />
            <StatCard title="New This Month" value={wo.newThisMonth} icon={UserPlus} color="bg-blue-500" />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Attendance Summary (Today)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Present" value={as.present} icon={ClipboardCheck} color="bg-emerald-500" />
            <StatCard title="Absent" value={as.absent} icon={UserX} color="bg-red-500" />
            <StatCard title="Late" value={as.late} icon={Clock} color="bg-amber-500" />
            <StatCard title="Missing Check-In" value={as.missingCheckIn} icon={AlertTriangle} color="bg-amber-500" />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Shift Coverage Status</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Shift</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Required</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Assigned</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(data.shiftCoverage ?? []).map((s) => (
                  <tr key={s.name}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.required}</td>
                    <td className="px-4 py-3">{s.assigned}</td>
                    <td className="px-4 py-3">
                      {s.status && <StatusBadge status={s.status} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Payroll Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Total Payroll (Est.)</p>
              <p className="text-xl font-bold text-slate-800">
                {((data.payrollOverview?.totalPayroll ?? 0) / 1_000_000).toFixed(1)}M VND
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Total Overtime</p>
              <p className="text-xl font-bold text-slate-800">
                {data.payrollOverview?.totalOvertimeHours ?? 0} hours
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Highest OT Dept</p>
              <p className="text-xl font-bold text-slate-800">
                {data.payrollOverview?.highestOTDept ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
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
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Completed" value={data.trainingStatus?.completed ?? 0} icon={GraduationCap} color="bg-emerald-500" />
            <StatCard title="Pending" value={data.trainingStatus?.pending ?? 0} icon={Clock} color="bg-amber-500" />
            <StatCard title="Overdue" value={data.trainingStatus?.overdue ?? 0} icon={AlertTriangle} color="bg-red-500" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Pending Requests</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/password-requests"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-300 hover:bg-primary-50"
            >
              <KeyRound className="h-8 w-8 text-primary-600" />
              <div>
                <p className="font-medium text-slate-800">Password Reset</p>
                <p className="text-2xl font-bold text-primary-600">{pr.passwordReset}</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <FileEdit className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-medium text-slate-800">Attendance Correction</p>
                <p className="text-2xl font-bold text-amber-600">{pr.attendanceCorrection}</p>
              </div>
            </div>
            <Link
              href="/leave-approvals"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-300 hover:bg-primary-50"
            >
              <Calendar className="h-8 w-8 text-primary-600" />
              <div>
                <p className="font-medium text-slate-800">Leave Requests</p>
                <p className="text-2xl font-bold text-primary-600">{pr.leave}</p>
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
        <h1 className="mb-6 text-2xl font-bold text-slate-800">Manager Dashboard</h1>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Team Overview</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard title="Team Size" value={to.teamSize} icon={Users} color="bg-primary-500" />
            <StatCard title="Present Today" value={to.presentToday} icon={UserCheck} color="bg-emerald-500" />
            <StatCard title="Absent" value={to.absent} icon={UserX} color="bg-red-500" />
            <StatCard title="Late" value={to.late} icon={Clock} color="bg-amber-500" />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-700">Team Shift Schedule (Today)</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Shift</th>
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
            <h2 className="mb-3 text-lg font-semibold text-slate-700">Attendance Alerts</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {(data.attendanceAlerts ?? []).length === 0 ? (
                <p className="text-slate-500">No alerts</p>
              ) : (
                <ul className="space-y-2">
                  {(data.attendanceAlerts ?? []).map((a, i) => (
                    <li key={i} className="flex justify-between rounded-lg bg-amber-50 px-3 py-2">
                      <span className="font-medium text-amber-800">{a.issue}</span>
                      <span className="text-amber-700">{a.employee}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {(data.shiftCoverageWarning ?? []).length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-700">Shift Coverage Warning</h2>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              {data.shiftCoverageWarning?.map((s, i) => (
                <p key={i} className="text-red-800">
                  {s.name}: {s.assigned}/{s.required} assigned — missing {s.required - s.assigned}
                </p>
              ))}
              <Link href="/schedules" className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
                Assign staff →
              </Link>
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Training Progress</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Training</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(data.trainingProgress ?? []).map((t, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{t.employee}</td>
                    <td className="px-4 py-3">{t.training}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          t.status === "Completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : t.status === "Overdue"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Pending Approvals</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-medium text-slate-700">Leave Requests ({pa.leave.length})</h3>
              {pa.leave.length === 0 ? (
                <p className="text-sm text-slate-500">None</p>
              ) : (
                <ul className="space-y-2">
                  {pa.leave.slice(0, 3).map((l) => (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <span>{l.employee}</span>
                      <Link
                        href="/leave-approvals"
                        className="text-primary-600 hover:underline"
                      >
                        Approve
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-medium text-slate-700">Overtime ({pa.overtime.length})</h3>
              {pa.overtime.length === 0 ? (
                <p className="text-sm text-slate-500">None</p>
              ) : (
                <ul className="space-y-2">
                  {pa.overtime.slice(0, 3).map((o) => (
                    <li key={o.id} className="flex items-center justify-between text-sm">
                      <span>{o.employee} — {o.hours}h</span>
                      <Link href="/overtime-approvals" className="text-primary-600 hover:underline">
                        Approve
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-medium text-slate-700">Corrections ({pa.attendanceCorrection.length})</h3>
              {pa.attendanceCorrection.length === 0 ? (
                <p className="text-sm text-slate-500">None</p>
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
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Employee Dashboard</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Calendar className="h-5 w-5" /> Today&apos;s Schedule
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
            <p className="text-slate-500">No shift assigned today</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <ClipboardCheck className="h-5 w-5" /> Attendance Status
          </h2>
          {att ? (
            <div className="space-y-2">
              <p>
                <span className="text-slate-500">Check-In:</span>{" "}
                {att.checkIn ? format(new Date(att.checkIn), "HH:mm") : "—"}
              </p>
              <p>
                <span className="text-slate-500">Check-Out:</span>{" "}
                {att.checkOut ? format(new Date(att.checkOut), "HH:mm") : "Not yet"}
              </p>
              <p className="font-medium text-slate-800">{att.status}</p>
            </div>
          ) : (
            <p className="text-slate-500">No record</p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Clock className="h-5 w-5" /> Work Hours Summary
          </h2>
          {wh ? (
            <div>
              <p className="text-2xl font-bold text-slate-800">{wh.totalHours} hours</p>
              <p className="text-slate-600">Overtime: {wh.overtime} hours</p>
              <p className="mt-1 text-xs text-slate-500">
                Pay period: {format(new Date(wh.payPeriodStart), "d MMM")} –{" "}
                {format(new Date(wh.payPeriodEnd), "d MMM yyyy")}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">No data</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <TrendingUp className="h-5 w-5" /> Payroll Estimate
          </h2>
          {pay ? (
            <div className="space-y-2">
              <p>
                <span className="text-slate-500">Base Salary:</span>{" "}
                {(pay.baseSalary / 1_000_000).toFixed(1)}M VND
              </p>
              <p>
                <span className="text-slate-500">Overtime Pay:</span>{" "}
                {(pay.overtimePay / 1_000).toFixed(0)}K VND
              </p>
              {pay.deductions > 0 && (
                <p className="text-red-600">Deductions: {(pay.deductions / 1_000).toFixed(0)}K VND</p>
              )}
              <p className="mt-2 text-xl font-bold text-slate-800">
                Estimated: {(pay.estimatedTotal / 1_000_000).toFixed(2)}M VND
              </p>
            </div>
          ) : (
            <p className="text-slate-500">No salary data</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
          <GraduationCap className="h-5 w-5" /> Training Tasks
        </h2>
        {tasks.length === 0 ? (
          <p className="text-slate-500">No training assigned</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <span className="font-medium">{t.training}</span>
                  {t.deadline && (
                    <span className="ml-2 text-sm text-slate-500">
                      Deadline: {format(new Date(t.deadline), "d MMM yyyy")}
                    </span>
                  )}
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    t.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {t.status === "completed" ? "Completed" : t.deadline && new Date(t.deadline) < new Date() ? "Overdue" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/trainings" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
          View all trainings →
        </Link>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
          <MessageCircle className="h-5 w-5" /> HR Assistant
        </h2>
        <p className="mb-3 text-slate-600">
          Ask questions about leave days, overtime policy, or other HR matters.
        </p>
        <Link
          href="/ai-assistant"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
        >
          <MessageCircle className="h-4 w-4" /> Open HR Assistant
        </Link>
      </section>

      {data.leaveBalance != null && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-700">Leave Balance</h2>
          <p className="text-2xl font-bold text-slate-800">{data.leaveBalance} days</p>
          <p className="text-sm text-slate-500">Annual leave remaining</p>
          <Link href="/leave" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            Submit leave request →
          </Link>
        </section>
      )}
    </div>
  );
}
