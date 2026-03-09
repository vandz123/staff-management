"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle } from "lucide-react";

type Training = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  employeeTrainings: {
    id: string;
    status: string;
    completionDate: string | null;
    employee: { id: string; firstName: string; lastName: string };
  }[];
};

export default function TrainingsPage() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);

  useEffect(() => {
    api.get<Training[]>("/trainings").then((r) => setTrainings(r.data));
  }, []);

  const complete = async (etId: string) => {
    await api.post("/trainings/complete", { employeeTrainingId: etId });
    api.get<Training[]>("/trainings").then((r) => setTrainings(r.data));
  };

  const myTrainings =
    user?.role === "staff" && user?.employeeId
      ? trainings.flatMap((t) =>
          t.employeeTrainings
            .filter((et) => et.employee.id === user.employeeId)
            .map((et) => ({ training: t, et }))
        )
      : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Training</h1>

      {user?.role === "staff" && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">My Training Tasks</h2>
          {myTrainings.length === 0 ? (
            <p className="text-slate-500">No training assigned.</p>
          ) : (
            <ul className="space-y-2">
              {myTrainings.map(({ training, et }) => (
                <li
                  key={et.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{training.title}</span>
                    {training.deadline && (
                      <span className="ml-2 text-sm text-slate-500">
                        Deadline: {format(new Date(training.deadline), "d MMM yyyy")}
                      </span>
                    )}
                  </div>
                  {et.status === "completed" ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => complete(et.id)}
                      className="rounded bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
                    >
                      Mark complete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">All Trainings</h2>
        <div className="divide-y divide-slate-100">
          {trainings.map((t) => (
            <div key={t.id} className="p-4">
              <h3 className="font-medium">{t.title}</h3>
              {t.description && (
                <p className="mt-1 text-sm text-slate-600">{t.description}</p>
              )}
              {t.deadline && (
                <p className="mt-1 text-xs text-slate-500">
                  Deadline: {format(new Date(t.deadline), "d MMM yyyy")}
                </p>
              )}
              <div className="mt-2 text-sm">
                Assigned: {t.employeeTrainings.length} | Completed:{" "}
                {t.employeeTrainings.filter((et) => et.status === "completed").length}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
