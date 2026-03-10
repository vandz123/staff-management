"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";

type ResetRequest = {
  id: string;
  userId: string;
  username: string;
  employeeName: string | null;
  department: string | null;
  requestReason: string | null;
  requestTime: string;
  status: string;
  approvedTime: string | null;
  generatedPassword: string | null;
  tempPasswordExpiry: string | null;
};

export default function PasswordRequestsPage() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    tempPassword?: string;
    message?: string;
  } | null>(null);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get("/auth/password-reset-requests");
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setActionId(id);
    setApprovalResult(null);
    try {
      const { data } = await api.patch("/auth/password-reset-requests", {
        id,
        action: "approve",
      });
      setApprovalResult({
        tempPassword: data.tempPassword,
        message: data.message,
      });
      await fetchRequests();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response?.data;
      setApprovalResult({ message: res?.error || "Failed to approve" });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this password reset request?")) return;
    setActionId(id);
    setApprovalResult(null);
    try {
      await api.patch("/auth/password-reset-requests", { id, action: "reject" });
      await fetchRequests();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response?.data;
      setApprovalResult({ message: res?.error || "Failed to reject" });
    } finally {
      setActionId(null);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Password Reset Requests</h1>

      {approvalResult?.message && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            approvalResult.tempPassword ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {approvalResult.tempPassword && (
            <p className="font-mono font-semibold">
              Temporary password: {approvalResult.tempPassword}
            </p>
          )}
          <p className="text-sm">{approvalResult.message}</p>
          <p className="mt-2 text-xs opacity-80">
            Share the temporary password with the employee. They can check status on the Forgot
            Password page.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-700">Pending Approval</h2>
            {pending.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600">
                No pending password reset requests.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Reason</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {pending.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3">
                          <span className="font-medium">{r.employeeName || r.username}</span>
                          <br />
                          <span className="text-xs text-slate-500">{r.username}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.department ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {format(new Date(r.requestTime), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.requestReason || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actionId !== null}
                            className="mr-2 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={actionId !== null}
                            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-700">History</h2>
            {history.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600">
                No request history.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {history.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3">
                          <span className="font-medium">{r.employeeName || r.username}</span>
                          <br />
                          <span className="text-xs text-slate-500">{r.username}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.department ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {format(new Date(r.requestTime), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              r.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : r.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
