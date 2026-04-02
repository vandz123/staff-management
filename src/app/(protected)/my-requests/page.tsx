"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { CalendarDays, Clock, Plus, X, AlertTriangle, LogIn } from "lucide-react";

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  createdAt: string;
};

type OvertimeRequest = {
  id: string;
  workDate: string;
  hours: number;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  status: string;
  createdAt: string;
};

type AttendanceStats = {
  totalLate: number;
  totalEarlyLeave: number;
  weeklyLate: number;
  weeklyEarlyLeave: number;
  warningCount: number;
};

const leaveTypeLabels: Record<string, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  emergency: "Nghỉ khẩn cấp",
  late_arrival: "Xin đi muộn",
  early_leave: "Xin ra sớm",
};

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};
const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"leave" | "overtime">("leave");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [overtimeForm, setOvertimeForm] = useState({ workDate: "", startTime: "", endTime: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get<LeaveRequest[]>("/leave", { params: { mine: "true" } }).then((r) => setLeaveRequests(r.data)),
      api.get<OvertimeRequest[]>("/overtime", { params: { mine: "true" } }).then((r) => setOvertimeRequests(r.data)),
      api.get<AttendanceStats>("/attendance/stats").then((r) => setStats(r.data)).catch(() => {}),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const isExemption = leaveForm.leaveType === "late_arrival" || leaveForm.leaveType === "early_leave";
      await api.post("/leave", {
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: isExemption ? leaveForm.startDate : leaveForm.endDate,
        reason: leaveForm.reason || undefined,
      });
      setLeaveForm({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
      setShowLeaveForm(false);
      fetchAll();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response?.data;
      setError(res?.error || "Không thể gửi đơn");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!overtimeForm.startTime || !overtimeForm.endTime) {
      setError("Vui lòng nhập giờ bắt đầu và kết thúc");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/overtime", {
        workDate: overtimeForm.workDate,
        startTime: overtimeForm.startTime,
        endTime: overtimeForm.endTime,
        reason: overtimeForm.reason || undefined,
      });
      setOvertimeForm({ workDate: "", startTime: "", endTime: "", reason: "" });
      setShowOvertimeForm(false);
      fetchAll();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response?.data;
      setError(res?.error || "Không thể gửi đơn");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingLeave = leaveRequests.filter((r) => r.status === "pending").length;
  const pendingOvertime = overtimeRequests.filter((r) => r.status === "pending").length;
  const isExemptionType = leaveForm.leaveType === "late_arrival" || leaveForm.leaveType === "early_leave";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Đơn từ của tôi</h1>
        <p className="text-sm text-slate-500">Gửi và theo dõi đơn xin nghỉ phép, tăng ca, đi muộn, ra sớm</p>
      </div>

      {/* Attendance Violation Stats */}
      {stats && (stats.totalLate > 0 || stats.totalEarlyLeave > 0) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" /> Thống kê đi muộn / ra sớm
          </h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-amber-600">Đi muộn (tổng)</p>
              <p className="text-lg font-bold text-amber-800">{stats.totalLate} lần</p>
            </div>
            <div>
              <p className="text-xs text-amber-600">Ra sớm (tổng)</p>
              <p className="text-lg font-bold text-amber-800">{stats.totalEarlyLeave} lần</p>
            </div>
            <div>
              <p className="text-xs text-amber-600">Tuần này (muộn + sớm)</p>
              <p className="text-lg font-bold text-amber-800">{stats.weeklyLate + stats.weeklyEarlyLeave} lần</p>
            </div>
            <div>
              <p className="text-xs text-amber-600">Cảnh cáo</p>
              <p className={`text-lg font-bold ${stats.warningCount >= 3 ? "text-red-700" : "text-amber-800"}`}>
                {stats.warningCount} lần
                {stats.warningCount >= 3 && <span className="ml-1 text-xs font-normal">⚠️ Mức nghiêm trọng</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Đơn nghỉ phép / xin phép</p>
              <p className="text-lg font-bold text-slate-800">
                {leaveRequests.length} đơn
                {pendingLeave > 0 && <span className="ml-1 text-sm font-normal text-amber-600">({pendingLeave} chờ duyệt)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowLeaveForm(true); setShowOvertimeForm(false); setActiveTab("leave"); setError(""); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white shadow-sm hover:bg-accent-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Đơn tăng ca</p>
              <p className="text-lg font-bold text-slate-800">
                {overtimeRequests.length} đơn
                {pendingOvertime > 0 && <span className="ml-1 text-sm font-normal text-amber-600">({pendingOvertime} chờ duyệt)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowOvertimeForm(true); setShowLeaveForm(false); setActiveTab("overtime"); setError(""); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Leave / Exemption Form */}
      {showLeaveForm && (
        <form onSubmit={submitLeave} className="mb-6 rounded-xl border border-accent-200 bg-accent-50/30 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Gửi đơn</h2>
            <button type="button" onClick={() => { setShowLeaveForm(false); setError(""); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại đơn *</label>
              <select
                value={leaveForm.leaveType}
                onChange={(e) => setLeaveForm((f) => ({ ...f, leaveType: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="annual">Nghỉ phép năm</option>
                <option value="sick">Nghỉ ốm</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="emergency">Nghỉ khẩn cấp</option>
                <option value="late_arrival">Xin đi muộn</option>
                <option value="early_leave">Xin ra sớm</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lý do</label>
              <input
                type="text"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder={isExemptionType ? "Lý do xin phép" : "Lý do nghỉ (không bắt buộc)"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {isExemptionType ? "Ngày *" : "Từ ngày *"}
              </label>
              <input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            {!isExemptionType && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Đến ngày *</label>
                <input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            )}
          </div>
          {isExemptionType && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
              <LogIn className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {leaveForm.leaveType === "late_arrival"
                  ? "Nếu được duyệt, bạn sẽ không bị tính lỗi khi check-in sau 8:10."
                  : "Nếu được duyệt, bạn sẽ không bị tính lỗi khi check-out trước 17:40."}
              </span>
            </div>
          )}
          {error && activeTab === "leave" && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-accent-600 px-5 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {submitting ? "Đang gửi..." : "Gửi đơn"}
          </button>
        </form>
      )}

      {/* Overtime Form */}
      {showOvertimeForm && (
        <form onSubmit={submitOvertime} className="mb-6 rounded-xl border border-primary-200 bg-primary-50/30 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Gửi đơn tăng ca</h2>
            <button type="button" onClick={() => { setShowOvertimeForm(false); setError(""); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày tăng ca *</label>
              <input
                type="date"
                value={overtimeForm.workDate}
                onChange={(e) => setOvertimeForm((f) => ({ ...f, workDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lý do</label>
              <input
                type="text"
                value={overtimeForm.reason}
                onChange={(e) => setOvertimeForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Lý do tăng ca (không bắt buộc)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giờ bắt đầu *</label>
              <input
                type="time"
                value={overtimeForm.startTime}
                onChange={(e) => setOvertimeForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giờ kết thúc *</label>
              <input
                type="time"
                value={overtimeForm.endTime}
                onChange={(e) => setOvertimeForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          {error && activeTab === "overtime" && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Đang gửi..." : "Gửi đơn tăng ca"}
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("leave")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "leave" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Đơn nghỉ phép / xin phép ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("overtime")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "overtime" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Đơn tăng ca ({overtimeRequests.length})
        </button>
      </div>

      {/* Leave History */}
      {activeTab === "leave" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Loại</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Thời gian</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Lý do</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày gửi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Đang tải...</td></tr>
              ) : leaveRequests.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có đơn nào</td></tr>
              ) : (
                leaveRequests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm">{leaveTypeLabels[r.leaveType] ?? r.leaveType}</td>
                    <td className="px-4 py-3 text-sm">
                      {r.leaveType === "late_arrival" || r.leaveType === "early_leave"
                        ? format(new Date(r.startDate), "d MMM yyyy")
                        : `${format(new Date(r.startDate), "d MMM")} – ${format(new Date(r.endDate), "d MMM yyyy")}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.reason || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{format(new Date(r.createdAt), "d MMM yyyy")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Overtime History */}
      {activeTab === "overtime" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Thời gian tăng ca</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Số giờ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Lý do</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày gửi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Đang tải...</td></tr>
              ) : overtimeRequests.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chưa có đơn tăng ca nào</td></tr>
              ) : (
                overtimeRequests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm">{format(new Date(r.workDate), "d MMM yyyy")}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {r.startTime && r.endTime ? `${r.startTime} – ${r.endTime}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">{r.hours}h</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.reason || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{format(new Date(r.createdAt), "d MMM yyyy")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
