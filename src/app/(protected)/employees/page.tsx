"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Users, UserCircle2, Plus, Pencil, UserX } from "lucide-react";
import { format } from "date-fns";

type Employee = {
  id: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  contractEndDate?: string | null;
  probationStart?: string | null;
  probationEnd?: string | null;
  status: string;
  baseSalary?: number | null;
  department?: { id?: string; name: string } | null;
  position?: { id?: string; name: string } | null;
  user?: {
    role: "admin" | "staff";
    username: string;
    status: string;
  } | null;
};

function getEmployeeStatus(emp: Employee, t: (k: string) => string): { label: string; color: string } {
  if (emp.status === "inactive" || emp.status === "left") {
    return { label: t("empStatus.resigned"), color: "bg-coral-100 text-coral-700" };
  }
  if (emp.status === "probation") {
    return { label: t("empStatus.probation"), color: "bg-violet-100 text-violet-700" };
  }
  if (emp.contractEndDate) {
    const endDate = new Date(emp.contractEndDate);
    const now = new Date();
    const diffDays = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { label: t("empStatus.resigned"), color: "bg-coral-100 text-coral-700" };
    }
    if (diffDays <= 30) {
      return { label: t("empStatus.expiringSoon"), color: "bg-warm-100 text-warm-700" };
    }
  }
  return { label: t("empStatus.working"), color: "bg-fresh-100 text-fresh-700" };
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

export default function EmployeesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setLoading(true);
    api.get<Employee[]>("/employees", { params: { status: "all" } }).then((r) => {
      setEmployees(r.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isAdmin) {
      api.get<{ id: string; name: string }[]>("/departments").then((r) => setDepartments(r.data));
      api.get<{ id: string; name: string }[]>("/positions").then((r) => setPositions(r.data));
    }
  }, [isAdmin]);

  const allDepartments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department?.name).filter((d): d is string => !!d))),
    [employees]
  );

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (departmentFilter !== "all" && e.department?.name !== departmentFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const haystack = `${e.firstName} ${e.lastName} ${e.email} ${e.user?.username || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [employees, statusFilter, departmentFilter, search]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    try {
      if (editing) {
        await api.patch(`/employees/${editing.id}`, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          address: data.address || null,
          dateOfBirth: data.dateOfBirth || null,
          contractEndDate: data.contractEndDate || null,
          departmentId: data.departmentId || null,
          positionId: data.positionId || null,
          status: data.status,
          probationStart: data.probationStart || null,
          probationEnd: data.probationEnd || null,
        });
      } else {
        const createLogin = data.createLogin === "on";
        const response = await api.post("/employees", {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          address: data.address || null,
          dateOfBirth: data.dateOfBirth || null,
          hireDate: data.hireDate || new Date().toISOString().slice(0, 10),
          contractEndDate: data.contractEndDate || null,
          departmentId: data.departmentId || null,
          positionId: data.positionId || null,
          baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined,
          status: data.status || "active",
          probationStart: data.probationStart || null,
          probationEnd: data.probationEnd || null,
          role: data.role,
          username: data.username || undefined,
          createLogin,
        });

        const created = response.data as {
          employee: Employee;
          login?: { username: string; tempPassword: string; role: string } | null;
        };

        if (created.login) {
          alert(
            `Tài khoản đã tạo:\n\nTên đăng nhập: ${created.login.username}\nMật khẩu tạm: ${created.login.tempPassword}\nVai trò: ${created.login.role}\n\nYêu cầu nhân viên đổi mật khẩu sau lần đăng nhập đầu.`
          );
        } else if (createLogin) {
          alert("Không thể tạo tài khoản tự động. Vui lòng kiểm tra server logs.");
        }
      }
      setShowForm(false);
      setEditing(null);
      form.reset();
      api.get<Employee[]>("/employees", { params: { status: "all" } }).then((r) => setEmployees(r.data));
    } catch (err: unknown) {
      console.error(err);
      const message =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ||
        "Không thể lưu nhân viên. Vui lòng kiểm tra dữ liệu và thử lại.";
      alert(message);
    }
  };

  const markInactive = async (emp: Employee) => {
    if (!confirm(`Đánh dấu ${emp.firstName} ${emp.lastName} là không hoạt động?`)) return;
    await api.patch(`/employees/${emp.id}`, { status: "inactive" });
    api.get<Employee[]>("/employees", { params: { status: "all" } }).then((r) => setEmployees(r.data));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("emp.title")}</h1>
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
            <option value="probation">{t("empStatus.probation")}</option>
            <option value="inactive">{t("staff.inactive")}</option>
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
          >
            <option value="all">{t("staff.allDepartments")}</option>
            {allDepartments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder={t("staff.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
          />
          {isAdmin && (
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 px-4 py-2 text-white shadow-md hover:shadow-lg transition-shadow"
            >
              <Plus className="h-4 w-4" />
              {t("emp.addEmployee")}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatChip icon={Users} label={t("staff.totalEmployees")} value={employees.length} />
        <StatChip
          icon={UserCircle2}
          label={t("staff.active")}
          value={employees.filter((e) => e.status === "active").length}
        />
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm"
        >
          <h2 className="mb-4 font-semibold">{editing ? t("emp.editEmployee") : t("emp.newEmployee")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input name="firstName" placeholder={t("emp.firstName")} required defaultValue={editing?.firstName} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            <input name="lastName" placeholder={t("emp.lastName")} required defaultValue={editing?.lastName} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            <input name="email" type="email" placeholder={t("emp.email")} required defaultValue={editing?.email} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            <input name="phone" placeholder={t("emp.phone")} defaultValue={editing?.phone ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t("emp.dateOfBirth")}</label>
              <input name="dateOfBirth" type="date" defaultValue={editing?.dateOfBirth?.slice(0, 10) ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            </div>
            <input name="address" placeholder={t("emp.address")} defaultValue={editing?.address ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            {!editing && (
              <div>
                <label className="mb-1 block text-xs text-slate-500">{t("emp.hireDate")}</label>
                <input name="hireDate" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t("emp.contractEndDate")}</label>
              <input name="contractEndDate" type="date" defaultValue={editing?.contractEndDate?.slice(0, 10) ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            </div>
            <select
              name="departmentId"
              defaultValue={editing?.department?.id ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
            >
              <option value="">{t("emp.selectDepartment")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              name="positionId"
              defaultValue={editing?.position?.id ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
            >
              <option value="">{t("emp.selectPosition")}</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!editing && (
              <select name="role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" required>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            )}
            {!editing && (
              <>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="createLogin"
                    name="createLogin"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  <label htmlFor="createLogin" className="text-sm text-slate-700">
                    {t("emp.createLoginAccount")}
                  </label>
                </div>
                <input
                  name="username"
                  placeholder={t("emp.username")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                />
              </>
            )}
            {editing && (
              <select
                name="status"
                defaultValue={editing.status}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
              >
                <option value="active">{t("staff.active")}</option>
                <option value="probation">{t("empStatus.probation")}</option>
                <option value="inactive">{t("staff.inactive")}</option>
              </select>
            )}
            {!editing && (
              <select name="status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none">
                <option value="active">{t("staff.active")}</option>
                <option value="probation">{t("empStatus.probation")}</option>
              </select>
            )}
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t("emp.probationStart")}</label>
              <input name="probationStart" type="date" defaultValue={editing?.probationStart?.slice(0, 10) ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t("emp.probationEnd")}</label>
              <input name="probationEnd" type="date" defaultValue={editing?.probationEnd?.slice(0, 10) ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 px-4 py-2 text-white shadow-md hover:shadow-lg transition-shadow">
              {editing ? t("emp.update") : t("emp.create")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50"
            >
              {t("emp.cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm">
        <table className="w-full">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Mã NV</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Tài khoản</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.dateOfBirth")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.address")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.department")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.position")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.status")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("emp.probationPeriod")}</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                  {t("staff.noMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((emp) => {
                const empStatus = getEmployeeStatus(emp, t);
                return (
                  <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-primary-600">
                      {emp.employeeCode ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{emp.email}</div>
                      {emp.phone && <div className="text-xs text-slate-500">{emp.phone}</div>}
                      {emp.user && (
                        <div className="mt-1 text-xs text-slate-400">
                          Login: <span className="font-mono">{emp.user.username}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {emp.dateOfBirth ? format(new Date(emp.dateOfBirth), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {emp.address ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {emp.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {emp.position?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", empStatus.color)}>
                        {empStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {emp.probationStart && emp.probationEnd ? (
                        <span className="text-xs">
                          {format(new Date(emp.probationStart), "dd/MM/yyyy")} — {format(new Date(emp.probationEnd), "dd/MM/yyyy")}
                        </span>
                      ) : emp.probationStart ? (
                        <span className="text-xs">
                          {format(new Date(emp.probationStart), "dd/MM/yyyy")} — ...
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setEditing(emp);
                            setShowForm(true);
                          }}
                          className="mr-2 text-primary-600 hover:text-primary-700"
                        >
                          <Pencil className="inline h-4 w-4" />
                        </button>
                        {emp.status === "active" && (
                          <button
                            onClick={() => markInactive(emp)}
                            className="text-warm-600 hover:text-warm-700"
                            title={t("emp.markInactive")}
                          >
                            <UserX className="inline h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
