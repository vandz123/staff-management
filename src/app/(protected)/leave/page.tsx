"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
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

export default function LeavePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    leaveType: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = () => {
    api
      .get<LeaveRequest[]>("/leave", { params: user?.role === "staff" ? { mine: "true" } : {} })
      .then((r) => setRequests(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/leave", form);
      setForm({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
      setShowForm(false);
      fetchRequests();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response?.data;
      setError(res?.error || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Leave</h1>
        {user?.role === "staff" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
          >
            {showForm ? "Cancel" : "Request Leave"}
          </button>
        )}
      </div>

      {user?.role === "staff" && showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">New Leave Request</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Leave Type</label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="unpaid">Unpaid Leave</option>
                <option value="emergency">Emergency Leave</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {user?.role !== "staff" && (
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Start</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">End</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  {user?.role !== "staff" && (
                    <td className="px-4 py-3 font-medium">
                      {r.employee.firstName} {r.employee.lastName}
                      {r.employee.department && (
                        <span className="ml-1 text-slate-500">({r.employee.department.name})</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 capitalize">{r.leaveType}</td>
                  <td className="px-4 py-3">{format(new Date(r.startDate), "d MMM yyyy")}</td>
                  <td className="px-4 py-3">{format(new Date(r.endDate), "d MMM yyyy")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        r.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : r.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.status}
                    </span>
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
