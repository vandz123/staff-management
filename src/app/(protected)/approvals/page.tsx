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
  employee: { employeeCode?: string; firstName: string; lastName: string; email: string; phone?: string | null; position?: { name: string } | null; department?: { name: string } };
};

type OvertimeRequest = {
  id: string;
  workDate: string;
  hours: number;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  status: string;
  employee: { employeeCode?: string; firstName: string; lastName: string; email: string; phone?: string | null; position?: { name: string } | null };
};

const leaveTypeLabels: Record<string, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  emergency: "Nghỉ khẩn cấp",
  late_arrival: "Xin đi muộn",
  early_leave: "Xin ra sớm",
};

export default function ApprovalsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leave" | "overtime">("leave");

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get<LeaveRequest[]>("/leave").then((r) => setLeaveRequests(r.data.filter((x) => x.status === "pending"))),
      api.get<OvertimeRequest[]>("/overtime").then((r) => setOvertimeRequests(r.data.filter((x) => x.status === "pending"))),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleLeaveAction = async (id: string, action: "approve" | "reject") => {
    setActionId(id);
    try {
      await api.post(`/leave/${id}/approve`, { action });
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const handleOvertimeAction = async (id: string, action: "approve" | "reject") => {
    setActionId(id);
    try {
      await api.post(`/overtime/${id}/approve`, { action });
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const totalPending = leaveRequests.length + overtimeRequests.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Phê duyệt đơn</h1>
        <p className="text-sm text-slate-500">
          {totalPending} đơn chờ duyệt
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("leave")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "leave"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Đơn nghỉ phép / xin phép ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("overtime")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "overtime"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Đơn tăng ca ({overtimeRequests.length})
        </button>
      </div>

      {/* Leave Requests Tab */}
      {activeTab === "leave" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Mã NV</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Nhân viên</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Loại</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Thời gian</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Lý do</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Không có đơn nghỉ phép chờ duyệt
                  </td>
                </tr>
              ) : (
                leaveRequests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-primary-600">
                      {r.employee.employeeCode ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                      <div className="text-xs text-slate-500">{r.employee.email}</div>
                      {r.employee.phone && <div className="text-xs text-slate-500">{r.employee.phone}</div>}
                      {r.employee.position && <div className="text-xs text-slate-400">{r.employee.position.name}</div>}
                      {r.employee.department && (
                        <span className="text-xs text-slate-400">({r.employee.department.name})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{leaveTypeLabels[r.leaveType] ?? r.leaveType}</td>
                    <td className="px-4 py-3">
                      {format(new Date(r.startDate), "d MMM")} – {format(new Date(r.endDate), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleLeaveAction(r.id, "approve")}
                        disabled={actionId !== null}
                        className="mr-2 rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleLeaveAction(r.id, "reject")}
                        disabled={actionId !== null}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Overtime Requests Tab */}
      {activeTab === "overtime" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Mã NV</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Nhân viên</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Thời gian tăng ca</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Số giờ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Lý do</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : overtimeRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Không có đơn tăng ca chờ duyệt
                  </td>
                </tr>
              ) : (
                overtimeRequests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-primary-600">
                      {r.employee.employeeCode ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                      <div className="text-xs text-slate-500">{r.employee.email}</div>
                      {r.employee.phone && <div className="text-xs text-slate-500">{r.employee.phone}</div>}
                      {r.employee.position && <div className="text-xs text-slate-400">{r.employee.position.name}</div>}
                    </td>
                    <td className="px-4 py-3">{format(new Date(r.workDate), "d MMM yyyy")}</td>
                    <td className="px-4 py-3 font-medium">
                      {r.startTime && r.endTime ? `${r.startTime} – ${r.endTime}` : "—"}
                    </td>
                    <td className="px-4 py-3">{r.hours}h</td>
                    <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOvertimeAction(r.id, "approve")}
                        disabled={actionId !== null}
                        className="mr-2 rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleOvertimeAction(r.id, "reject")}
                        disabled={actionId !== null}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Từ chối
                      </button>
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
