"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Users,
  UserX,
  AlertTriangle,
  ClipboardList,
  CalendarClock,
  CheckCircle,
} from "lucide-react";

type DashboardData = {
  totalEmployeesToday: number;
  absentToday: number;
  shiftsMissingStaff: number;
  shiftsMissingStaffDetail: { name: string; missing: number; requiredStaff: number }[];
  correctionsPending: number;
  upcomingTrainingDeadlines: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      title: "Total Employees Today",
      value: data?.totalEmployeesToday ?? 0,
      icon: Users,
      color: "bg-primary-500",
    },
    {
      title: "Absent Today",
      value: data?.absentToday ?? 0,
      icon: UserX,
      color: "bg-amber-500",
    },
    {
      title: "Shifts Missing Staff",
      value: data?.shiftsMissingStaff ?? 0,
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    {
      title: "Corrections Pending",
      value: data?.correctionsPending ?? 0,
      icon: ClipboardList,
      color: "bg-slate-500",
    },
    {
      title: "Upcoming Training Deadlines",
      value: data?.upcomingTrainingDeadlines ?? 0,
      icon: CalendarClock,
      color: "bg-emerald-500",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color} text-white`}
              >
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {data?.shiftsMissingStaffDetail && data.shiftsMissingStaffDetail.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Shifts Missing Staff</h2>
          <div className="space-y-2">
            {data.shiftsMissingStaffDetail.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-red-700">
                  {s.missing} missing (need {s.requiredStaff})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
