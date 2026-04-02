"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  BadgeCheck,
  CalendarDays,
  FileText,
} from "lucide-react";

type EmployeeProfile = {
  id: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  hireDate: string;
  contractEndDate: string | null;
  status: string;
  baseSalary: number | null;
  annualLeaveBalance: number;
  department: { name: string } | null;
  position: { name: string } | null;
  user: { username: string; role: string } | null;
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.employeeId) {
      setLoading(false);
      return;
    }
    api
      .get<EmployeeProfile>(`/employees/${user.employeeId}`)
      .then((r) => setProfile(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-6 text-warm-800">
        <p className="font-medium">Chưa liên kết hồ sơ nhân viên với tài khoản này.</p>
        <p className="mt-1 text-sm">Vui lòng liên hệ HR hoặc quản trị viên.</p>
      </div>
    );
  }

  const statusInfo = (() => {
    if (profile.status === "inactive") return { label: "Đã nghỉ việc", color: "bg-coral-100 text-coral-700" };
    if (profile.contractEndDate) {
      const daysLeft = Math.floor(
        (new Date(profile.contractEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft < 0) return { label: "Hết hợp đồng", color: "bg-coral-100 text-coral-700" };
      if (daysLeft <= 30) return { label: "Sắp hết HĐ", color: "bg-warm-100 text-warm-700" };
    }
    return { label: "Đang làm việc", color: "bg-fresh-100 text-fresh-700" };
  })();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Hồ sơ nhân viên</h1>

      {/* Profile Header */}
      <div className="mb-6 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-3xl font-bold text-white shadow-lg">
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-slate-500">
              <span className="font-mono text-xs text-primary-600">{profile.employeeCode}</span> · {profile.position?.name ?? "—"} · {profile.department?.name ?? "—"}
            </p>
            <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Info */}
        <div className="rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <FileText className="h-4 w-4" /> Thông tin cá nhân
          </h3>
          <InfoRow icon={User} label="Họ và tên" value={`${profile.firstName} ${profile.lastName}`} />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={Phone} label="Số điện thoại" value={profile.phone} />
          <InfoRow icon={MapPin} label="Địa chỉ" value={profile.address} />
          <InfoRow
            icon={Calendar}
            label="Ngày sinh"
            value={profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "dd/MM/yyyy") : null}
          />
        </div>

        {/* Employment Info */}
        <div className="rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Briefcase className="h-4 w-4" /> Thông tin công việc
          </h3>
          <InfoRow icon={Building2} label="Phòng ban" value={profile.department?.name} />
          <InfoRow icon={Briefcase} label="Chức vụ" value={profile.position?.name} />
          <InfoRow
            icon={Calendar}
            label="Ngày vào làm"
            value={format(new Date(profile.hireDate), "dd/MM/yyyy")}
          />
          <InfoRow
            icon={CalendarDays}
            label="Ngày hết hợp đồng"
            value={profile.contractEndDate ? format(new Date(profile.contractEndDate), "dd/MM/yyyy") : "Không xác định"}
          />
          <InfoRow icon={BadgeCheck} label="Trạng thái" value={statusInfo.label} />
          <InfoRow
            icon={CalendarDays}
            label="Số ngày nghỉ phép còn lại"
            value={`${profile.annualLeaveBalance} ngày`}
          />
        </div>
      </div>

      {/* Account Info */}
      {profile.user && (
        <div className="mt-6 rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <User className="h-4 w-4" /> Tài khoản hệ thống
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tên đăng nhập</p>
              <p className="font-mono text-sm font-medium text-slate-800">{profile.user.username}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Vai trò</p>
              <p className="text-sm font-medium capitalize text-slate-800">{profile.user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
