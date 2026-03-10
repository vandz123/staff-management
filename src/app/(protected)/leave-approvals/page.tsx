"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  employee: { firstName: string; lastName: string; department?: { name: string } };
};

export default function LeaveApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = () => {
    api
      .get<LeaveRequest[]>("/leave")
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
      await api.post(`/leave/${id}/approve`, { action });
      fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Leave Approvals</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Dates</th>
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
                  No pending leave requests
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    {r.employee.firstName} {r.employee.lastName}
                    {r.employee.department && (
                      <span className="ml-1 text-slate-500">({r.employee.department.name})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.leaveType}</td>
                  <td className="px-4 py-3">
                    {format(new Date(r.startDate), "d MMM")} – {format(new Date(r.endDate), "d MMM yyyy")}
                  </td>
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
