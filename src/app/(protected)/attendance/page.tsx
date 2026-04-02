"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format, subDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

type Attendance = {
  id: string;
  employeeId: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  employee: { id: string; firstName: string; lastName: string; email: string; phone?: string | null; position?: { name: string } | null };
};

type MyShift = {
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [viewMode, setViewMode] = useState<"single" | "period">("single");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 13), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [myShift, setMyShift] = useState<MyShift | null>(null);
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);

  const isStaffView = user?.role === "staff" && user?.employeeId;
  const canSelectEmployee = user?.role === "admin" && !isStaffView;

  useEffect(() => {
    if (canSelectEmployee) {
      api
        .get<Array<{ id: string; firstName: string; lastName: string }>>("/employees")
        .then((r) => setEmployees(r.data.map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))));
    }
  }, [canSelectEmployee]);

  useEffect(() => {
    const params: Record<string, string> = viewMode === "single" ? { workDate: date } : { start: startDate, end: endDate };
    if (user?.role === "staff" && user?.employeeId) {
      params.employeeId = user.employeeId;
    } else if (canSelectEmployee && selectedEmployeeId) {
      params.employeeId = selectedEmployeeId;
    }
    api.get<Attendance[]>("/attendance", { params }).then((r) => setAttendance(r.data));
  }, [date, startDate, endDate, viewMode, user?.role, user?.employeeId, canSelectEmployee, selectedEmployeeId]);

  // Fetch today's shift for staff
  useEffect(() => {
    if (!isStaffView) return;
    api
      .get<MyShift | null>("/attendance/my-shift")
      .then((r) => setMyShift(r.data))
      .catch(() => setMyShift(null));
  }, [isStaffView]);

  const isBeforeShiftEnd = (): boolean => {
    if (!myShift?.shiftEndTime) return false;
    const [h, m] = myShift.shiftEndTime.split(":").map(Number);
    const now = new Date();
    const shiftEnd = new Date();
    shiftEnd.setHours(h, m, 0, 0);
    return now < shiftEnd;
  };

  const handleCheckInOut = async (action: "checkIn" | "checkOut") => {
    if (!user?.employeeId) return;

    if (action === "checkOut" && isBeforeShiftEnd()) {
      setShowEarlyCheckoutModal(true);
      return;
    }

    await performCheckInOut(action);
  };

  const performCheckInOut = async (action: "checkIn" | "checkOut") => {
    if (!user?.employeeId) return;
    setSavingAttendance(true);
    setSaveError(null);
    try {
      const payload: Record<string, string> = {
        employeeId: user.employeeId,
        workDate: date,
      };
      const now = new Date().toISOString();
      if (action === "checkIn") {
        payload.checkIn = now;
      } else {
        payload.checkOut = now;
      }
      await api.post("/attendance", payload);

      const params: Record<string, string> =
        viewMode === "single" ? { workDate: date } : { start: startDate, end: endDate };
      params.employeeId = user.employeeId;
      const attRes = await api.get<Attendance[]>("/attendance", { params });
      setAttendance(attRes.data);
    } catch (err) {
      console.error(err);
      setSaveError("Không thể cập nhật chấm công. Vui lòng thử lại.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const todayIso = format(new Date(), "yyyy-MM-dd");
  const isTodaySelected = viewMode === "single" && date === todayIso;
  const staffTodayRecord =
    isStaffView && isTodaySelected
      ? attendance.find(
          (a) => a.employeeId === user?.employeeId && a.workDate.startsWith(todayIso),
        )
      : undefined;

  // Staff view: show attendance summary (count of days)
  if (isStaffView) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Chấm công</h1>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "single" | "period")}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="single">Theo ngày</option>
              <option value="period">Khoảng thời gian</option>
            </select>
            {viewMode === "single" ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2"
              />
            ) : (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded border border-slate-300 px-3 py-2"
                />
                <span className="text-slate-500">đến</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded border border-slate-300 px-3 py-2"
                />
              </>
            )}
          </div>
        </div>

        {/* Today's check in/out */}
        {isTodaySelected && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Chấm công hôm nay</h2>
                <p className="text-xs text-slate-500">
                  {format(new Date(), "EEEE, d MMM yyyy")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!staffTodayRecord || !staffTodayRecord.checkIn ? (
                  <button
                    onClick={() => handleCheckInOut("checkIn")}
                    disabled={savingAttendance}
                    className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingAttendance ? "Đang lưu..." : "Check In"}
                  </button>
                ) : !staffTodayRecord.checkOut ? (
                  <button
                    onClick={() => handleCheckInOut("checkOut")}
                    disabled={savingAttendance}
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingAttendance ? "Đang lưu..." : "Check Out"}
                  </button>
                ) : (
                  <span className="text-sm text-emerald-700">
                    Bạn đã hoàn thành chấm công hôm nay.
                  </span>
                )}
              </div>
            </div>
            {staffTodayRecord && (
              <p className="mt-2 text-xs text-slate-500">
                Check-in:{" "}
                {staffTodayRecord.checkIn
                  ? format(new Date(staffTodayRecord.checkIn), "HH:mm")
                  : "—"}{" "}
                · Check-out:{" "}
                {staffTodayRecord.checkOut
                  ? format(new Date(staffTodayRecord.checkOut), "HH:mm")
                  : "—"}
              </p>
            )}
            {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
          </div>
        )}

        {/* Early Checkout Modal */}
        {showEarlyCheckoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Check out sớm</h3>
              </div>
              <p className="mb-2 text-sm text-slate-600">
                Ca của bạn{myShift?.shiftName ? ` (${myShift.shiftName})` : ""} kết thúc lúc{" "}
                <span className="font-semibold text-slate-800">{myShift?.shiftEndTime}</span>, nhưng bạn
                đang check out lúc{" "}
                <span className="font-semibold text-slate-800">{format(new Date(), "HH:mm")}</span>.
              </p>
              <p className="mb-6 text-sm text-amber-700 font-medium">
                Bạn sẽ không làm đủ ca. Bạn vẫn muốn check out?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowEarlyCheckoutModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={async () => {
                    setShowEarlyCheckoutModal(false);
                    await performCheckInOut("checkOut");
                  }}
                  disabled={savingAttendance}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {savingAttendance ? "Đang check out..." : "Vẫn check out"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff: own attendance records */}
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">Tổng ngày</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{attendance.length}</p>
          </div>
          <div className="rounded-xl border border-fresh-200 bg-fresh-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-fresh-600">Có mặt</p>
            <p className="mt-1 text-2xl font-bold text-fresh-700">{attendance.filter(a => a.status === "present").length}</p>
          </div>
          <div className="rounded-xl border border-coral-200 bg-coral-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-coral-600">Vắng mặt</p>
            <p className="mt-1 text-2xl font-bold text-coral-700">{attendance.filter(a => a.status === "absent").length}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check In</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check Out</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{format(new Date(a.workDate), "d MMM yyyy")}</td>
                  <td className="px-4 py-3">
                    {a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.checkOut ? format(new Date(a.checkOut), "HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        a.status === "present"
                          ? "bg-fresh-100 text-fresh-700"
                          : a.status === "absent"
                          ? "bg-coral-100 text-coral-700"
                          : a.status === "late"
                          ? "bg-warm-100 text-warm-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.status === "present" ? "Đúng giờ" :
                       a.status === "absent" ? "Nghỉ" :
                       a.status === "late" ? "Muộn" :
                       "Chưa xác nhận"}
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

  // Admin view: see all employees
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Chấm công</h1>
        <div className="flex flex-wrap items-center gap-3">
          {canSelectEmployee && (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Tất cả nhân viên</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          )}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "single" | "period")}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="single">Theo ngày</option>
            <option value="period">Khoảng thời gian</option>
          </select>
          {viewMode === "single" ? (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2"
            />
          ) : (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2"
              />
              <span className="text-slate-500">đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2"
              />
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Nhân viên</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check In</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check Out</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Trạng thái</th>
              {viewMode === "period" && (
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Số giờ</th>
              )}
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => {
              let hours = 0;
              if (a.checkIn && a.checkOut) {
                hours = (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / (1000 * 60 * 60);
              }
              return (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{format(new Date(a.workDate), "d MMM yyyy")}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.employee.firstName} {a.employee.lastName}</div>
                    <div className="text-xs text-slate-500">{a.employee.email}</div>
                    {a.employee.phone && <div className="text-xs text-slate-500">{a.employee.phone}</div>}
                    {a.employee.position && <div className="text-xs text-slate-400">{a.employee.position.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.checkOut ? format(new Date(a.checkOut), "HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        a.status === "present"
                          ? "bg-fresh-100 text-fresh-700"
                          : a.status === "absent"
                          ? "bg-coral-100 text-coral-700"
                          : a.status === "late"
                          ? "bg-warm-100 text-warm-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.status === "present" ? "Đúng giờ" :
                       a.status === "absent" ? "Nghỉ" :
                       a.status === "late" ? "Muộn" :
                       "Chưa xác nhận"}
                    </span>
                  </td>
                  {viewMode === "period" && (
                    <td className="px-4 py-3 text-slate-600">
                      {hours > 0 ? `${hours.toFixed(1)}h` : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
