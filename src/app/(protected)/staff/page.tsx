"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Users, UserCircle2, ClipboardCheck, CalendarDays } from "lucide-react";
import { format } from "date-fns";

type EmployeeWithUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  contractEndDate?: string | null;
  status: string;
  baseSalary?: number | null;
  department?: { name: string } | null;
  position?: { name: string } | null;
  user?: {
    role: "admin" | "staff";
    username: string;
    status: string;
  } | null;
  todayAttendance?: {
    status: string;
    checkIn: string | null;
  } | null;
};

type SelfAttendance = {
  id: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
};

type SelfLeave = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
};

function AttendanceBadge({ attendance, shiftStart, t }: { attendance?: { status: string; checkIn: string | null } | null; shiftStart?: string; t: (k: string) => string }) {
  if (!attendance || !attendance.checkIn) {
    if (attendance?.status === "absent") {
      return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-coral-100 text-coral-700">{t("attType.absent")}</span>;
    }
    return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-500">{t("attType.noData")}</span>;
  }

  if (shiftStart && attendance.checkIn) {
    const [h, m] = shiftStart.split(":").map(Number);
    const checkInDate = new Date(attendance.checkIn);
    const shiftDate = new Date(checkInDate);
    shiftDate.setHours(h, m, 0, 0);
    if (checkInDate > shiftDate) {
      return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-warm-100 text-warm-700">{t("attType.late")}</span>;
    }
  }

  return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-fresh-100 text-fresh-700">{t("attType.onTime")}</span>;
}

function EmployeeStatusBadge({ emp, t }: { emp: EmployeeWithUser; t: (k: string) => string }) {
  if (emp.status === "inactive") {
    return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-coral-100 text-coral-700">{t("empStatus.resigned")}</span>;
  }
  if (emp.contractEndDate) {
    const endDate = new Date(emp.contractEndDate);
    const now = new Date();
    const diffDays = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-coral-100 text-coral-700">{t("empStatus.resigned")}</span>;
    }
    if (diffDays <= 30) {
      return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-warm-100 text-warm-700">{t("empStatus.expiringSoon")}</span>;
    }
  }
  return <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-fresh-100 text-fresh-700">{t("empStatus.working")}</span>;
}

export default function StaffPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "admin") {
    return <AdminStaffView />;
  }

  return <SelfStaffView />;
}

function AdminStaffView() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<EmployeeWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get<EmployeeWithUser[]>("/employees", {
        params: { status: "all", includeAttendance: "true" },
      })
      .then((r) => setEmployees(r.data))
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map((e) => e.department?.name)
            .filter((d): d is string => !!d)
        )
      ),
    [employees]
  );

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (roleFilter !== "all" && e.user?.role !== roleFilter) return false;
      if (departmentFilter !== "all" && e.department?.name !== departmentFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const haystack = `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [employees, statusFilter, roleFilter, departmentFilter, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("staff.directory")}</h1>
          <p className="text-sm text-slate-500">{t("staff.directoryDesc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
          >
            <option value="all">{t("staff.allStatuses")}</option>
            <option value="active">{t("staff.active")}</option>
            <option value="inactive">{t("staff.inactive")}</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
          >
            <option value="all">{t("staff.allRoles")}</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
          >
            <option value="all">{t("staff.allDepartments")}</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder={t("staff.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatChip icon={Users} label={t("staff.totalEmployees")} value={employees.length} />
        <StatChip
          icon={UserCircle2}
          label={t("staff.active")}
          value={employees.filter((e) => e.status === "active").length}
        />
        <StatChip
          icon={UserCircle2}
          label={t("staff.withLogin")}
          value={employees.filter((e) => !!e.user).length}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm">
        <table className="w-full">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("dash.employee")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.department")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.position")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.role")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("staff.todayAttendance")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.employeeStatus")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {t("staff.loading")}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {t("staff.noMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {e.firstName} {e.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{e.email}</div>
                    {e.user && (
                      <div className="mt-1 text-xs text-slate-500">
                        Login: <span className="font-mono">{e.user.username}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {e.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {e.position?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {e.user?.role ? (
                      <span className="rounded bg-primary-50 px-2 py-0.5 text-xs capitalize text-primary-700">
                        {e.user.role}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">{t("staff.noAccount")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AttendanceBadge attendance={e.todayAttendance} t={t} />
                  </td>
                  <td className="px-4 py-3">
                    <EmployeeStatusBadge emp={e} t={t} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        e.status === "active"
                          ? "bg-fresh-100 text-fresh-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {e.status === "active" ? t("staff.active") : t("staff.inactive")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function SelfStaffView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<EmployeeWithUser | null>(null);
  const [attendance, setAttendance] = useState<SelfAttendance[]>([]);
  const [leave, setLeave] = useState<SelfLeave[]>([]);

  useEffect(() => {
    if (!user?.employeeId) return;
    api.get<EmployeeWithUser>(`/employees/${user.employeeId}`).then((r) => {
      setProfile(r.data as EmployeeWithUser);
    });
    api
      .get<SelfAttendance[]>("/attendance", {
        params: { employeeId: user.employeeId },
      })
      .then((r) => setAttendance(r.data.slice(0, 10)));
    api
      .get<SelfLeave[]>("/leave", { params: { mine: "true" } })
      .then((r) => setLeave(r.data.slice(0, 5)));
  }, [user?.employeeId]);

  if (!user?.employeeId) {
    return (
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-6 text-warm-800">
        <p className="font-semibold">{t("staff.noProfile")}</p>
        <p className="mt-2 text-sm">
          {t("staff.contactHR")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("staff.myProfile")}</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <UserCircle2 className="h-5 w-5 text-primary-500" /> {t("staff.personal")}
          </h2>
          {profile ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase text-slate-500">{t("emp.name")}</div>
                <div className="font-medium text-slate-900">
                  {profile.firstName} {profile.lastName}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">{t("emp.email")}</div>
                <div className="text-slate-800">{profile.email}</div>
              </div>
              {profile.phone && (
                <div>
                  <div className="text-xs uppercase text-slate-500">{t("emp.phone")}</div>
                  <div className="text-slate-800">{profile.phone}</div>
                </div>
              )}
              {profile.dateOfBirth && (
                <div>
                  <div className="text-xs uppercase text-slate-500">{t("emp.dateOfBirth")}</div>
                  <div className="text-slate-800">{format(new Date(profile.dateOfBirth), "dd/MM/yyyy")}</div>
                </div>
              )}
              {profile.address && (
                <div>
                  <div className="text-xs uppercase text-slate-500">{t("emp.address")}</div>
                  <div className="text-slate-800">{profile.address}</div>
                </div>
              )}
              <div>
                <div className="text-xs uppercase text-slate-500">{t("emp.department")}</div>
                <div className="text-slate-800">
                  {profile.department?.name ?? "Not assigned"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">{t("emp.position")}</div>
                <div className="text-slate-800">
                  {profile.position?.name ?? "Not assigned"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">{t("emp.status")}</div>
                <div className="text-slate-800 capitalize">{profile.status}</div>
              </div>
              {profile.baseSalary != null && (
                <div>
                  <div className="text-xs uppercase text-slate-500">{t("dash.baseSalary")}</div>
                  <div className="text-slate-800">
                    {(profile.baseSalary / 1_000_000).toFixed(1)}M VND / month
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("staff.loadingProfile")}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <ClipboardCheck className="h-5 w-5 text-fresh-500" /> {t("staff.recentAttendance")}
          </h2>
          {attendance.length === 0 ? (
            <p className="text-sm text-slate-500">{t("staff.noAttendance")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">{t("staff.date")}</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">{t("staff.checkIn")}</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">{t("staff.checkOut")}</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">{t("emp.status")}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {format(new Date(a.workDate), "d MMM yyyy")}
                    </td>
                    <td className="px-3 py-2">
                      {a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {a.checkOut ? format(new Date(a.checkOut), "HH:mm") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        a.status === "present" ? "bg-fresh-100 text-fresh-700" :
                        a.status === "late" ? "bg-warm-100 text-warm-700" :
                        a.status === "absent" ? "bg-coral-100 text-coral-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <CalendarDays className="h-5 w-5 text-accent-500" /> {t("staff.recentLeave")}
        </h2>
        {leave.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("staff.noLeave")}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">{t("staff.type")}</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">{t("staff.start")}</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">{t("staff.end")}</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">{t("emp.status")}</th>
              </tr>
            </thead>
            <tbody>
              {leave.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 capitalize">{l.leaveType}</td>
                  <td className="px-3 py-2">
                    {format(new Date(l.startDate), "d MMM yyyy")}
                  </td>
                  <td className="px-3 py-2">
                    {format(new Date(l.endDate), "d MMM yyyy")}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        l.status === "approved"
                          ? "bg-fresh-100 text-fresh-700"
                          : l.status === "rejected"
                            ? "bg-coral-100 text-coral-700"
                            : "bg-warm-100 text-warm-700"
                      )}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
