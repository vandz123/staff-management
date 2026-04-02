"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { addDays, format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, AlertTriangle } from "lucide-react";

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

  const isAdmin = user?.role === "admin";

  const reload = () => {
    api
      .get<Assignment[]>("/shift-assignments", { params: { workDate: weekStart } })
      .then((r) => setAssignments(r.data));
    api.get<Shift[]>("/shifts").then((r) => setShifts(r.data));
  };

  useEffect(() => {
    reload();
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

  const prevWeek = () =>
    setWeekStart(format(addDays(new Date(weekStart), -7), "yyyy-MM-dd"));
  const nextWeek = () =>
    setWeekStart(format(addDays(new Date(weekStart), 7), "yyyy-MM-dd"));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Lịch ca làm</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowCreateShift(!showCreateShift)}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Tạo ca mới
            </button>
          )}
          <button
            onClick={prevWeek}
            className="rounded border px-3 py-2 text-sm hover:bg-slate-100"
          >
            ← Trước
          </button>
          <span className="font-medium text-sm">
            {format(new Date(weekStart), "d MMM")} –{" "}
            {format(addDays(new Date(weekStart), 6), "d MMM yyyy")}
          </span>
          <button
            onClick={nextWeek}
            className="rounded border px-3 py-2 text-sm hover:bg-slate-100"
          >
            Sau →
          </button>
        </div>
      </div>

      {/* Create Shift Form */}
      {showCreateShift && isAdmin && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Tạo loại ca mới</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Tên ca *</label>
              <input
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="Ví dụ: Ca đêm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Giờ bắt đầu</label>
              <input
                type="time"
                value={newShiftStart}
                onChange={(e) => setNewShiftStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Giờ kết thúc</label>
              <input
                type="time"
                value={newShiftEnd}
                onChange={(e) => setNewShiftEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Số nhân viên cần</label>
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
              {savingShift ? "Đang tạo..." : "Tạo ca"}
            </button>
            <button
              onClick={() => setShowCreateShift(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Schedule Table - view only, no assign button */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-600">
                Ca
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
                    {shift.startTime}–{shift.endTime} · {shift.requiredStaff} cần
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
                            Thiếu {shift.requiredStaff - count}
                          </div>
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

      {shifts.length === 0 && (
        <p className="mt-6 text-center text-slate-500">
          Chưa có ca làm nào.{" "}
          {isAdmin && "Nhấn 'Tạo ca mới' để thêm."}
        </p>
      )}
    </div>
  );
}
