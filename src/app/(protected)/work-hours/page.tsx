"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format, subDays } from "date-fns";

type SummaryItem = {
  employeeId: string;
  employee: { firstName: string; lastName: string; email: string };
  totalHours: number;
  records: number;
  overtimeHours: number;
};

export default function WorkHoursPage() {
  const end = new Date();
  const start = subDays(end, 14);
  const [startDate, setStartDate] = useState(format(start, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(end, "yyyy-MM-dd"));
  const [data, setData] = useState<{ summary: SummaryItem[] } | null>(null);

  useEffect(() => {
    api
      .get<{ summary: SummaryItem[] }>("/work-hours", {
        params: { start: startDate, end: endDate },
      })
      .then((r) => setData(r.data))
      .catch(console.error);
  }, [startDate, endDate]);

  const exportCsv = () => {
    if (!data?.summary) return;
    const headers = ["Employee", "Email", "Total Hours", "Records", "Overtime Hours"];
    const rows = data.summary.map((s) => [
      `${s.employee.firstName} ${s.employee.lastName}`,
      s.employee.email,
      s.totalHours.toFixed(2),
      s.records,
      s.overtimeHours.toFixed(2),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-hours-${startDate}-${endDate}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Work Hours Summary</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border px-3 py-2"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border px-3 py-2"
          />
          <button
            onClick={exportCsv}
            className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Total Hours</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Records</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Overtime</th>
            </tr>
          </thead>
          <tbody>
            {data?.summary.map((s) => (
              <tr key={s.employeeId} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  {s.employee.firstName} {s.employee.lastName}
                </td>
                <td className="px-4 py-3">{s.totalHours.toFixed(2)}</td>
                <td className="px-4 py-3">{s.records}</td>
                <td className="px-4 py-3">{s.overtimeHours.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
