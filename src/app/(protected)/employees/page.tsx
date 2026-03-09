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
  status: string;
  department?: { name: string } | null;
  position?: { name: string } | null;
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
          departmentId: data.departmentId || null,
          positionId: data.positionId || null,
          status: data.status,
        });
      } else {
        await api.post("/employees", {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          hireDate: data.hireDate || new Date().toISOString().slice(0, 10),
          departmentId: data.departmentId || null,
          positionId: data.positionId || null,
        });
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
            <input name="phone" placeholder="Phone" defaultValue={editing ? (editing as Employee & { phone?: string }).phone : undefined} className="rounded border px-3 py-2" />
            {!editing && <input name="hireDate" type="date" required className="rounded border px-3 py-2" />}
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
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Department</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Position</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                <td className="px-4 py-3">{emp.department?.name ?? "—"}</td>
                <td className="px-4 py-3">{emp.position?.name ?? "—"}</td>
                <td>
                  <span
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium",
                      emp.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {emp.status}
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
