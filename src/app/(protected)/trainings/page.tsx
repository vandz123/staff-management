"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle,
  Plus,
  UserPlus,
  GraduationCap,
  Clock,
  AlertTriangle,
} from "lucide-react";

type Employee = { id: string; firstName: string; lastName: string };
type Training = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  employeeTrainings: {
    id: string;
    status: string;
    completionDate: string | null;
    employee: Employee;
  }[];
};

export default function TrainingsPage() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Create training form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign form
  const [assignTrainingId, setAssignTrainingId] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isStaff = user?.role === "staff";

  const reload = () => {
    api.get<Training[]>("/trainings").then((r) => setTrainings(r.data));
  };

  useEffect(() => {
    reload();
    if (isAdminOrManager) {
      api.get<Employee[]>("/employees").then((r) => setEmployees(r.data));
    }
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await api.post("/trainings", {
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        deadline: newDeadline || null,
      });
      setNewTitle("");
      setNewDescription("");
      setNewDeadline("");
      setShowCreate(false);
      reload();
    } catch {
      alert("Failed to create training");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (trainingId: string) => {
    if (!assignEmployeeId) return;
    try {
      await api.post("/trainings/assign", { trainingId, employeeId: assignEmployeeId });
      setAssignTrainingId(null);
      setAssignEmployeeId("");
      reload();
    } catch {
      alert("Failed to assign training");
    }
  };

  const complete = async (etId: string) => {
    await api.post("/trainings/complete", { employeeTrainingId: etId });
    reload();
  };

  // Staff: show personal trainings
  const myTrainings = isStaff && user?.employeeId
    ? trainings.flatMap((t) =>
        t.employeeTrainings
          .filter((et) => et.employee.id === user.employeeId)
          .map((et) => ({ training: t, et }))
      )
    : [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Training</h1>
        {isAdminOrManager && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create Training
          </button>
        )}
      </div>

      {/* Create training form */}
      {showCreate && isAdminOrManager && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">New Training Program</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Title *</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="e.g. Workplace Safety"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Description</label>
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="Training description"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Deadline</label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newTitle.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff: My Training Tasks */}
      {isStaff && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <GraduationCap className="h-5 w-5 text-primary-600" />
            My Training Tasks
          </h2>
          {myTrainings.length === 0 ? (
            <p className="text-slate-500">No training assigned.</p>
          ) : (
            <ul className="space-y-2">
              {myTrainings.map(({ training, et }) => (
                <li
                  key={et.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{training.title}</span>
                    {training.deadline && (
                      <span className="ml-2 text-sm text-slate-500">
                        Deadline: {format(new Date(training.deadline), "d MMM yyyy")}
                      </span>
                    )}
                  </div>
                  {et.status === "completed" ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => complete(et.id)}
                      className="rounded bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
                    >
                      Mark complete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* All Trainings */}
      <div className="space-y-4">
        {trainings.map((t) => {
          const completed = t.employeeTrainings.filter((et) => et.status === "completed").length;
          const total = t.employeeTrainings.length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isOverdue = t.deadline && new Date(t.deadline) < new Date();

          return (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-slate-800">{t.title}</h3>
                    {t.description && (
                      <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      {t.deadline && (
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
                          {isOverdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {isOverdue ? "Overdue — " : "Deadline: "}
                          {format(new Date(t.deadline), "d MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdminOrManager && (
                    <button
                      onClick={() => setAssignTrainingId(assignTrainingId === t.id ? null : t.id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>
                        {completed}/{total} completed
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Assign form */}
                {assignTrainingId === t.id && isAdminOrManager && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3">
                    <select
                      value={assignEmployeeId}
                      onChange={(e) => setAssignEmployeeId(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                    >
                      <option value="">Select employee...</option>
                      {employees
                        .filter(
                          (emp) =>
                            !t.employeeTrainings.some((et) => et.employee.id === emp.id)
                        )
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleAssign(t.id)}
                      disabled={!assignEmployeeId}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => { setAssignTrainingId(null); setAssignEmployeeId(""); }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Assigned employees */}
              {t.employeeTrainings.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {t.employeeTrainings.map((et) => (
                      <span
                        key={et.id}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          et.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {et.status === "completed" && <CheckCircle className="h-3 w-3" />}
                        {et.employee.firstName} {et.employee.lastName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {trainings.length === 0 && (
          <p className="py-8 text-center text-slate-500">
            No training programs yet.{" "}
            {isAdminOrManager && "Click 'Create Training' to add one."}
          </p>
        )}
      </div>
    </div>
  );
}
