"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { addDays, format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, UserPlus, X, AlertTriangle } from "lucide-react";

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
};
type Employee = { id: string; firstName: string; lastName: string };
type Assignment = {
  id: string;
  employeeId: string;
  shiftId: string;
  workDate: string;
  employee: Employee;
  shift: Shift;
};

export default function SchedulesPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(d, "yyyy-MM-dd");
  });

  // Create shift form
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("08:00");
  const [newShiftEnd, setNewShiftEnd] = useState("16:00");
  const [newShiftReqStaff, setNewShiftReqStaff] = useState(5);
  const [savingShift, setSavingShift] = useState(false);

  // Assign modal
  const [assignCell, setAssignCell] = useState<{ dayKey: string; shiftId: string } | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const reload = () => {
    api
      .get<Assignment[]>("/shift-assignments", { params: { workDate: weekStart } })
      .then((r) => setAssignments(r.data));
    api.get<Shift[]>("/shifts").then((r) => setShifts(r.data));
  };

  useEffect(() => {
    reload();
    if (isAdminOrManager) {
      api.get<Employee[]>("/employees").then((r) => setEmployees(r.data));
    }
  }, [weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(weekStart), i));
  const byDayShift = days.reduce(
    (acc, d) => {
      const key = format(d, "yyyy-MM-dd");
      acc[key] = shifts.reduce(
        (a, s) => {
          a[s.id] = { shift: s, assigned: [] as Assignment[] };
          return a;
        },
        {} as Record<string, { shift: Shift; assigned: Assignment[] }>
      );
      return acc;
    },
    {} as Record<string, Record<string, { shift: Shift; assigned: Assignment[] }>>
  );

  for (const a of assignments) {
    const dayKey = format(new Date(a.workDate), "yyyy-MM-dd");
    if (byDayShift[dayKey]?.[a.shiftId]) {
      byDayShift[dayKey][a.shiftId].assigned.push(a);
    }
  }

  const handleCreateShift = async () => {
    if (!newShiftName.trim()) return;
    setSavingShift(true);
    try {
      await api.post("/shifts", {
        name: newShiftName.trim(),
        startTime: newShiftStart,
        endTime: newShiftEnd,
        requiredStaff: newShiftReqStaff,
      });
      setNewShiftName("");
      setNewShiftStart("08:00");
      setNewShiftEnd("16:00");
      setNewShiftReqStaff(5);
      setShowCreateShift(false);
      reload();
    } catch {
      alert("Failed to create shift");
    } finally {
      setSavingShift(false);
    }
  };

  const handleAssign = async () => {
    if (!assignCell || !assignEmployeeId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await api.post("/shift-assignments", {
        employeeId: assignEmployeeId,
        shiftId: assignCell.shiftId,
        workDate: assignCell.dayKey,
      });
      setAssignCell(null);
      setAssignEmployeeId("");
      reload();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to assign";
      setAssignError(msg);
    } finally {
      setAssigning(false);
    }
  };

  const prevWeek = () =>
    setWeekStart(format(addDays(new Date(weekStart), -7), "yyyy-MM-dd"));
  const nextWeek = () =>
    setWeekStart(format(addDays(new Date(weekStart), 7), "yyyy-MM-dd"));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Shift Schedule</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowCreateShift(!showCreateShift)}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Create Shift
            </button>
          )}
          <button
            onClick={prevWeek}
            className="rounded border px-3 py-2 text-sm hover:bg-slate-100"
          >
            ← Prev
          </button>
          <span className="font-medium text-sm">
            {format(new Date(weekStart), "d MMM")} –{" "}
            {format(addDays(new Date(weekStart), 6), "d MMM yyyy")}
          </span>
          <button
            onClick={nextWeek}
            className="rounded border px-3 py-2 text-sm hover:bg-slate-100"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Create Shift Form */}
      {showCreateShift && isAdmin && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">New Shift Type</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Name *</label>
              <input
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="e.g. Night Shift"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Start Time</label>
              <input
                type="time"
                value={newShiftStart}
                onChange={(e) => setNewShiftStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">End Time</label>
              <input
                type="time"
                value={newShiftEnd}
                onChange={(e) => setNewShiftEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Required Staff</label>
              <input
                type="number"
                min={1}
                value={newShiftReqStaff}
                onChange={(e) => setNewShiftReqStaff(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreateShift}
              disabled={savingShift || !newShiftName.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {savingShift ? "Creating..." : "Create Shift"}
            </button>
            <button
              onClick={() => setShowCreateShift(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-600">
                Shift
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className={cn(
                    "min-w-[140px] border-b border-l border-slate-200 bg-slate-50 p-3 text-center text-sm font-medium",
                    format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-600"
                  )}
                >
                  {format(d, "EEE d")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="border-b border-slate-200 p-3">
                  <div className="font-medium text-slate-800">{shift.name}</div>
                  <div className="text-xs text-slate-500">
                    {shift.startTime}–{shift.endTime} · {shift.requiredStaff} needed
                  </div>
                </td>
                {days.map((d) => {
                  const dayKey = format(d, "yyyy-MM-dd");
                  const cell = byDayShift[dayKey]?.[shift.id];
                  const count = cell?.assigned.length ?? 0;
                  const ok = count >= shift.requiredStaff;
                  const isToday = dayKey === format(new Date(), "yyyy-MM-dd");

                  return (
                    <td
                      key={dayKey}
                      className={cn(
                        "border-b border-l border-slate-200 p-2 align-top",
                        ok
                          ? "bg-emerald-50"
                          : count > 0
                            ? "bg-amber-50"
                            : "bg-red-50",
                        isToday && "ring-1 ring-inset ring-primary-200"
                      )}
                    >
                      <div className="space-y-1 text-xs">
                        {cell?.assigned.map((a) => (
                          <div
                            key={a.id}
                            className="rounded bg-white px-1.5 py-0.5 shadow-sm"
                          >
                            {a.employee.firstName} {a.employee.lastName}
                          </div>
                        ))}
                        {count < shift.requiredStaff && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            {shift.requiredStaff - count} missing
                          </div>
                        )}
                        {isAdminOrManager && (
                          <button
                            onClick={() => {
                              setAssignCell({ dayKey, shiftId: shift.id });
                              setAssignEmployeeId("");
                              setAssignError(null);
                            }}
                            className="mt-1 flex w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 py-0.5 text-slate-400 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600"
                          >
                            <UserPlus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {assignCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Assign Employee</h3>
              <button
                onClick={() => {
                  setAssignCell(null);
                  setAssignError(null);
                }}
                className="rounded p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              Shift:{" "}
              <strong>{shifts.find((s) => s.id === assignCell.shiftId)?.name}</strong>
              {" · Date: "}
              <strong>{format(new Date(assignCell.dayKey), "EEE d MMM yyyy")}</strong>
            </p>
            <select
              value={assignEmployeeId}
              onChange={(e) => setAssignEmployeeId(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Select employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
            {assignError && (
              <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{assignError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setAssignCell(null);
                  setAssignError(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignEmployeeId || assigning}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {assigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shifts.length === 0 && (
        <p className="mt-6 text-center text-slate-500">
          No shifts defined yet.{" "}
          {isAdmin && "Click 'Create Shift' to add one."}
        </p>
      )}
    </div>
  );
}
