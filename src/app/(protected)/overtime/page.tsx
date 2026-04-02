"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

type OvertimeRequest = {
  id: string;
  workDate: string;
  hours: number;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  status: string;
  employee: { firstName: string; lastName: string; email: string; phone?: string | null; position?: { name: string } | null };
};

export default function OvertimePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ workDate: "", startTime: "", endTime: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = () => {
    api
      .get<OvertimeRequest[]>("/overtime", { params: user?.role === "staff" ? { mine: "true" } : {} })
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
    if (!form.startTime || !form.endTime) {
      setError("Vui lòng nhập giờ bắt đầu và kết thúc");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/overtime", {
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason || undefined,
      });
      setForm({ workDate: "", startTime: "", endTime: "", reason: "" });
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
        <h1 className="text-2xl font-bold text-slate-800">Tăng ca</h1>
        {user?.role === "staff" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
          >
            {showForm ? "Hủy" : "Gửi đơn tăng ca"}
          </button>
        )}
      </div>

      {user?.role === "staff" && showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">Đơn tăng ca mới</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày</label>
              <input
                type="date"
                value={form.workDate}
                onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giờ bắt đầu</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giờ kết thúc</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lý do (không bắt buộc)</label>
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
            {submitting ? "Đang gửi..." : "Gửi đơn"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {user?.role !== "staff" && (
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Nhân viên</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Thời gian tăng ca</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Số giờ</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Lý do</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Không có đơn tăng ca
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  {user?.role !== "staff" && (
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                      <div className="text-xs text-slate-500">{r.employee.email}</div>
                      {r.employee.phone && <div className="text-xs text-slate-500">{r.employee.phone}</div>}
                      {r.employee.position && <div className="text-xs text-slate-400">{r.employee.position.name}</div>}
                    </td>
                  )}
                  <td className="px-4 py-3">{format(new Date(r.workDate), "d MMM yyyy")}</td>
                  <td className="px-4 py-3 font-medium">
                    {r.startTime && r.endTime ? `${r.startTime} – ${r.endTime}` : "—"}
                  </td>
                  <td className="px-4 py-3">{r.hours}h</td>
                  <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
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
                      {r.status === "approved" ? "Đã duyệt" : r.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
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
