"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";

type OvertimeRequest = {
  id: string;
  workDate: string;
  hours: number;
  reason: string | null;
  status: string;
  employee: { firstName: string; lastName: string };
};

export default function OvertimeApprovalsPage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = () => {
    api
      .get<OvertimeRequest[]>("/overtime")
      .then((r) => setRequests(r.data.filter((x) => x.status === "pending")))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionId(id);
    try {
      await api.post(`/overtime/${id}/approve`, { action });
      fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Overtime Approvals</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Hours</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Reason</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No pending overtime requests
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    {r.employee.firstName} {r.employee.lastName}
                  </td>
                  <td className="px-4 py-3">{format(new Date(r.workDate), "d MMM yyyy")}</td>
                  <td className="px-4 py-3">{r.hours}h</td>
                  <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleAction(r.id, "approve")}
                      disabled={actionId !== null}
                      className="mr-2 rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "reject")}
                      disabled={actionId !== null}
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
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
