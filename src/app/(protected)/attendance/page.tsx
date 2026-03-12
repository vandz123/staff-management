"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format, subDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Clock, DollarSign, AlertTriangle } from "lucide-react";

type Attendance = {
  id: string;
  employeeId: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  employee: { id: string; firstName: string; lastName: string };
};

type PayrollSummary = {
  employee: string;
  period: { start: string; end: string };
  baseSalary: number;
  hourlyRate: number;
  totalHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  approvedOvertimeHours: number;
  approvedOvertimePay: number;
  estimatedTotal: number;
  dailyBreakdown: Array<{ date: string; hours: number; overtime: number; regular: number }>;
};

type MyShift = {
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
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
  const canSelectEmployee = (user?.role === "admin" || user?.role === "manager") && !isStaffView;

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

  useEffect(() => {
    const shouldShowPayroll = isStaffView || (canSelectEmployee && selectedEmployeeId);
    if (!shouldShowPayroll) {
      setPayroll(null);
      return;
    }
    const start = viewMode === "single" ? date : startDate;
    const end = viewMode === "single" ? date : endDate;
    const params: Record<string, string> = { start, end };
    if (canSelectEmployee && selectedEmployeeId) {
      params.employeeId = selectedEmployeeId;
    }
    api
      .get<PayrollSummary>("/attendance/payroll-summary", { params })
      .then((r) => setPayroll(r.data))
      .catch(() => setPayroll(null));
  }, [isStaffView, canSelectEmployee, selectedEmployeeId, viewMode, date, startDate, endDate]);

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

    // If checking out early, show confirmation modal instead of proceeding
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
      const [attRes, payRes] = await Promise.all([
        api.get<Attendance[]>("/attendance", { params }),
        api
          .get<PayrollSummary>("/attendance/payroll-summary", {
            params: { start: startDate, end: endDate },
          })
          .catch(() => ({ data: null as unknown as PayrollSummary })),
      ]);
      setAttendance(attRes.data);
      if (payRes.data) {
        setPayroll(payRes.data);
      }
    } catch (err) {
      console.error(err);
      setSaveError("Failed to update attendance. Please try again.");
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <div className="flex flex-wrap items-center gap-3">
          {canSelectEmployee && (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All employees</option>
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
            <option value="single">Single day</option>
            <option value="period">Date range</option>
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
              <span className="text-slate-500">to</span>
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

      {isStaffView && isTodaySelected && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Today&apos;s Attendance</h2>
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
                  {savingAttendance ? "Saving..." : "Check In"}
                </button>
              ) : !staffTodayRecord.checkOut ? (
                <button
                  onClick={() => handleCheckInOut("checkOut")}
                  disabled={savingAttendance}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingAttendance ? "Saving..." : "Check Out"}
                </button>
              ) : (
                <span className="text-sm text-emerald-700">
                  You have completed today&apos;s attendance.
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

      {/* Early Checkout Confirmation Modal */}
      {showEarlyCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Early Checkout</h3>
            </div>
            <p className="mb-2 text-sm text-slate-600">
              Your shift{myShift?.shiftName ? ` (${myShift.shiftName})` : ""} ends at{" "}
              <span className="font-semibold text-slate-800">{myShift?.shiftEndTime}</span>, but you
              are checking out at{" "}
              <span className="font-semibold text-slate-800">{format(new Date(), "HH:mm")}</span>.
            </p>
            <p className="mb-6 text-sm text-amber-700 font-medium">
              You will not be working the full shift. Do you still want to check out?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEarlyCheckoutModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowEarlyCheckoutModal(false);
                  await performCheckInOut("checkOut");
                }}
                disabled={savingAttendance}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {savingAttendance ? "Checking out..." : "Check Out Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {payroll && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Payroll Summary
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Period: {format(new Date(payroll.period.start), "d MMM yyyy")} – {format(new Date(payroll.period.end), "d MMM yyyy")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Total hours</p>
              <p className="mt-1 flex items-center gap-1 text-xl font-bold text-slate-800">
                <Clock className="h-4 w-4" />
                {payroll.totalHours}h
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Overtime</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{payroll.overtimeHours}h</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Regular pay</p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {(payroll.regularPay / 1_000_000).toFixed(2)}M VND
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Overtime pay</p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {(payroll.overtimePay / 1_000).toFixed(0)}K VND
              </p>
            </div>
            <div className="rounded-lg bg-primary-50 p-4">
              <p className="text-xs font-medium uppercase text-primary-600">Estimated total</p>
              <p className="mt-1 flex items-center gap-1 text-xl font-bold text-primary-700">
                <TrendingUp className="h-4 w-4" />
                {(payroll.estimatedTotal / 1_000_000).toFixed(2)}M VND
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Base salary: {(payroll.baseSalary / 1_000_000).toFixed(1)}M VND/mo · Hourly: {payroll.hourlyRate.toLocaleString()} VND
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check In</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Check Out</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
              {viewMode === "period" && (
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Hours</th>
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
