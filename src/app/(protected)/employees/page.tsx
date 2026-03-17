"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  contractEndDate?: string | null;
  status: string;
  department?: { name: string } | null;
  position?: { name: string } | null;
  user?: {
    role: "admin" | "manager" | "staff";
    username: string;
    status: string;
  } | null;
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setLoading(true);
    api.get<Employee[]>("/employees").then((r) => {
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
          contractEndDate: data.contractEndDate || null,
          hireDate: data.hireDate || new Date().toISOString().slice(0, 10),
          departmentId: data.departmentId || null,
          positionId: data.positionId || null,
          baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined,
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
            `Login account created:\n\nUsername: ${created.login.username}\nTemporary password: ${created.login.tempPassword}\nRole: ${created.login.role}\n\nAsk the employee to change this password after first login.`
          );
        } else if (createLogin) {
          alert("Could not create login account automatically. Please check the server logs.");
        }
      }
      setShowForm(false);
      setEditing(null);
      form.reset();
      api.get<Employee[]>("/employees").then((r) => setEmployees(r.data));
    } catch (err) {
      console.error(err);
    }
  };

  const markInactive = async (emp: Employee) => {
    if (!confirm(`Mark ${emp.firstName} ${emp.lastName} as inactive?`)) return;
    await api.patch(`/employees/${emp.id}`, { status: "inactive" });
    api.get<Employee[]>("/employees").then((r) => setEmployees(r.data));
  };

  if (loading) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold">{editing ? "Edit Employee" : "New Employee"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="firstName" placeholder="First name" required defaultValue={editing?.firstName} className="rounded border px-3 py-2" />
            <input name="lastName" placeholder="Last name" required defaultValue={editing?.lastName} className="rounded border px-3 py-2" />
            <input name="email" type="email" placeholder="Email" required defaultValue={editing?.email} className="rounded border px-3 py-2" />
            <input name="phone" placeholder="Phone" defaultValue={editing?.phone || undefined} className="rounded border px-3 py-2" />
            <input name="address" placeholder="Address" defaultValue={editing?.address || undefined} className="rounded border px-3 py-2 sm:col-span-2" />
            <input name="dateOfBirth" type="date" placeholder="Date of Birth" defaultValue={editing?.dateOfBirth ? editing.dateOfBirth.split('T')[0] : undefined} className="rounded border px-3 py-2" />
            <input name="contractEndDate" type="date" placeholder="Contract End Date" defaultValue={editing?.contractEndDate ? editing.contractEndDate.split('T')[0] : undefined} className="rounded border px-3 py-2" />
            {!editing && <input name="hireDate" type="date" required className="rounded border px-3 py-2" />}
            {!editing && (
              <input
                name="baseSalary"
                type="number"
                min="0"
                step="100000"
                placeholder="Base salary (VND/month)"
                className="rounded border px-3 py-2"
              />
            )}
            <select name="departmentId" className="rounded border px-3 py-2">
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} selected={(editing as Employee & { department?: { id: string } })?.department?.id === d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select name="positionId" className="rounded border px-3 py-2">
              <option value="">Select position</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id} selected={(editing as Employee & { position?: { id: string } })?.position?.id === p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!editing && (
              <select name="role" className="rounded border px-3 py-2" required>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            )}
            {!editing && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    id="createLogin"
                    name="createLogin"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  <label htmlFor="createLogin" className="text-sm text-slate-700">
                    Create login account for this employee
                  </label>
                </div>
                <input
                  name="username"
                  placeholder="Username (optional, auto-generated if left blank)"
                  className="rounded border px-3 py-2 text-sm"
                />
              </>
            )}
            {editing && (
              <select name="status" className="rounded border px-3 py-2">
                <option value="active" selected={editing.status === "active"}>Active</option>
                <option value="inactive" selected={editing.status === "inactive"}>Inactive</option>
              </select>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
              {editing ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">DOB</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Department</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Status</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{emp.phone || "—"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{emp.address ? emp.address.substring(0, 30) + (emp.address.length > 30 ? "..." : "") : "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString("vi-VN") : "—"}
                </td>
                <td className="px-4 py-3">{emp.department?.name ?? "—"}</td>
                <td className="px-4 py-3">{emp.position?.name ?? "—"}</td>
                <td>
                  <span
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium",
                      emp.status === "active" ? "bg-success-100 text-success-700" : 
                      emp.status === "contract_ending_soon" ? "bg-warning-100 text-warning-700" :
                      emp.status === "left" ? "bg-danger-100 text-danger-700" :
                      "bg-slate-100 text-slate-600"
                    )}
                  >
                    {emp.status === "active" ? "Đang làm" : 
                     emp.status === "contract_ending_soon" ? "Sắp hết HĐ" :
                     emp.status === "left" ? "Đã nghỉ" :
                     emp.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setEditing(emp);
                        setShowForm(true);
                      }}
                      className="mr-2 text-primary-600 hover:underline"
                    >
                      <Pencil className="inline h-4 w-4" />
                    </button>
                    {emp.status === "active" && (
                      <button
                        onClick={() => markInactive(emp)}
                        className="text-amber-600 hover:underline"
                        title="Mark inactive"
                      >
                        <UserX className="inline h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
