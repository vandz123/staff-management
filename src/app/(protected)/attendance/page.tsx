"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

type Attendance = {
  id: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  employee: { firstName: string; lastName: string };
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const params: Record<string, string> = { workDate: date };
    if (user?.role === "staff" && user?.employeeId) {
      params.employeeId = user.employeeId;
    }
    api.get<Attendance[]>("/attendance", { params }).then((r) => setAttendance(r.data));
  }, [date, user?.role, user?.employeeId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check In</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check Out</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{format(new Date(a.workDate), "d MMM yyyy")}</td>
                <td className="px-4 py-3 font-medium">
                  {a.employee.firstName} {a.employee.lastName}
                </td>
                <td className="px-4 py-3">
                  {a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "—"}
                </td>
                <td className="px-4 py-3">
                  {a.checkOut ? format(new Date(a.checkOut), "HH:mm") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      a.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
