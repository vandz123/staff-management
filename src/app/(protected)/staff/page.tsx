 "use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Users, UserCircle2, ClipboardCheck, CalendarDays } from "lucide-react";
import { format } from "date-fns";

type EmployeeWithUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  baseSalary?: number | null;
  department?: { name: string } | null;
  position?: { name: string } | null;
  user?: {
    role: "admin" | "manager" | "staff";
    username: string;
    status: string;
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

export default function StaffPage() {
  const { user } = useAuth();

  // #region agent log
  fetch("http://127.0.0.1:7265/ingest/a4b4f286-f1fa-4860-bd48-265a0cc8119b", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "412356",
    },
    body: JSON.stringify({
      sessionId: "412356",
      runId: "initial",
      hypothesisId: "H1",
      location: "src/app/(protected)/staff/page.tsx:42",
      message: "StaffPage render",
      data: { role: user?.role ?? null },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!user) return null;

  if (user.role === "admin") {
    return <AdminStaffView />;
  }

  if (user.role === "manager") {
    return <ManagerStaffView />;
  }

  return <SelfStaffView />;
}

function AdminStaffView() {
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
        params: { status: "all" },
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
          <h1 className="text-2xl font-bold text-slate-800">Staff Directory</h1>
          <p className="text-sm text-slate-500">Organization-wide view of all employees.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatChip icon={Users} label="Total employees" value={employees.length} />
        <StatChip
          icon={UserCircle2}
          label="Active"
          value={employees.filter((e) => e.status === "active").length}
        />
        <StatChip
          icon={UserCircle2}
          label="With login accounts"
          value={employees.filter((e) => !!e.user).length}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Department</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Position</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading staff...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No staff match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
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
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">
                        {e.user.role}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No account</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium",
                        e.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {e.status}
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

function ManagerStaffView() {
  const [employees, setEmployees] = useState<EmployeeWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<EmployeeWithUser[]>("/employees", { params: { status: "active" } })
      .then((r) => setEmployees(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Team</h1>
        <p className="text-sm text-slate-500">
          Employees in your department with quick access to their core information.
        </p>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatChip icon={Users} label="Team size" value={employees.length} />
        <StatChip
          icon={UserCircle2}
          label="With login accounts"
          value={employees.filter((e) => !!e.user).length}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Position</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Department</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Login</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Loading team...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No employees found in your department.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {e.firstName} {e.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{e.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {e.position?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {e.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {e.user ? (
                      <span className="font-mono text-xs text-slate-700">
                        {e.user.username}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No account</span>
                    )}
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
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-semibold">No staff profile linked to this account.</p>
        <p className="mt-2 text-sm">
          Please contact HR or an administrator so they can link your login account to an
          employee profile.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">My Staff Profile</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <UserCircle2 className="h-5 w-5" /> Personal & Employment
          </h2>
          {profile ? (
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-xs uppercase text-slate-500">Name</div>
                <div className="font-medium text-slate-900">
                  {profile.firstName} {profile.lastName}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Email</div>
                <div className="text-slate-800">{profile.email}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Department</div>
                <div className="text-slate-800">
                  {profile.department?.name ?? "Not assigned"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Position</div>
                <div className="text-slate-800">
                  {profile.position?.name ?? "Not assigned"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Status</div>
                <div className="text-slate-800 capitalize">{profile.status}</div>
              </div>
              {profile.baseSalary != null && (
                <div>
                  <div className="text-xs uppercase text-slate-500">Base salary</div>
                  <div className="text-slate-800">
                    {(profile.baseSalary / 1_000_000).toFixed(1)}M VND / month
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading profile...</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <ClipboardCheck className="h-5 w-5" /> Recent Attendance
          </h2>
          {attendance.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance records yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Check in</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Check out</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
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
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">
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

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <CalendarDays className="h-5 w-5" /> Recent Leave
        </h2>
        {leave.length === 0 ? (
          <p className="text-sm text-slate-500">
            You have no recent or pending leave requests.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Type</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Start</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">End</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
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
                        "rounded px-2 py-0.5 text-xs capitalize",
                        l.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : l.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

