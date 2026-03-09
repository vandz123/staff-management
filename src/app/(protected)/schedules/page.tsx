"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { addDays, format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

type Shift = { id: string; name: string; startTime: string; endTime: string; requiredStaff: number };
type Assignment = {
  id: string;
  employeeId: string;
  shiftId: string;
  workDate: string;
  employee: { id: string; firstName: string; lastName: string };
  shift: Shift;
};

export default function SchedulesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(d, "yyyy-MM-dd");
  });

  useEffect(() => {
    const start = new Date(weekStart);
    const end = addDays(start, 6);
    api
      .get<Assignment[]>("/shift-assignments", {
        params: { workDate: weekStart },
      })
      .then((r) => setAssignments(r.data));
    api.get<Shift[]>("/shifts").then((r) => setShifts(r.data));
  }, [weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(weekStart), i));
  const byDayShift = days.reduce((acc, d) => {
    const key = format(d, "yyyy-MM-dd");
    acc[key] = shifts.reduce((a, s) => {
      a[s.id] = { shift: s, assigned: [] as Assignment[] };
      return a;
    }, {} as Record<string, { shift: Shift; assigned: Assignment[] }>);
    return acc;
  }, {} as Record<string, Record<string, { shift: Shift; assigned: Assignment[] }>>);

  for (const a of assignments) {
    const dayKey = format(new Date(a.workDate), "yyyy-MM-dd");
    if (byDayShift[dayKey]?.[a.shiftId]) {
      byDayShift[dayKey][a.shiftId].assigned.push(a);
    }
  }

  const prevWeek = () => setWeekStart(format(addDays(new Date(weekStart), -7), "yyyy-MM-dd"));
  const nextWeek = () => setWeekStart(format(addDays(new Date(weekStart), 7), "yyyy-MM-dd"));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Shift Schedule</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="rounded border px-3 py-1 hover:bg-slate-100">
            ← Prev
          </button>
          <span className="font-medium">
            {format(new Date(weekStart), "d MMM")} – {format(addDays(new Date(weekStart), 6), "d MMM yyyy")}
          </span>
          <button onClick={nextWeek} className="rounded border px-3 py-1 hover:bg-slate-100">
            Next →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 p-2 text-left text-sm font-medium">
                Shift
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className="min-w-[120px] border border-slate-200 bg-slate-50 p-2 text-center text-sm font-medium"
                >
                  {format(d, "EEE d")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="border border-slate-200 p-2 font-medium">
                  {shift.name}
                  <span className="ml-1 text-xs text-slate-500">
                    ({shift.startTime}-{shift.endTime}, need {shift.requiredStaff})
                  </span>
                </td>
                {days.map((d) => {
                  const dayKey = format(d, "yyyy-MM-dd");
                  const cell = byDayShift[dayKey]?.[shift.id];
                  const count = cell?.assigned.length ?? 0;
                  const ok = count >= shift.requiredStaff;
                  return (
                    <td
                      key={dayKey}
                      className={cn(
                        "border border-slate-200 p-2",
                        ok ? "bg-emerald-50" : "bg-red-50"
                      )}
                    >
                      <div className="text-xs">
                        {cell?.assigned.map((a) => (
                          <div key={a.id}>
                            {a.employee.firstName} {a.employee.lastName}
                          </div>
                        ))}
                        {count < shift.requiredStaff && (
                          <span className="text-red-600">
                            {shift.requiredStaff - count} missing
                          </span>
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
    </div>
  );
}
