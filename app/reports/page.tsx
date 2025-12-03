"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";

type Employee = {
  id: string;
  status: string;
};

type Credential = {
  id: string;
  status: string | null;
  expiry_date: string | null;
};

type Incident = {
  id: string;
  status: string;
};

type EmployeeTraining = {
  id: string;
  status: string;
};

type Shift = {
  id: string;
  start_time: string;
  status: string;
};

type Stats = {
  employees_active: number;
  employees_onboarding: number;
  employees_inactive: number;
  creds_expiring_soon: number;
  creds_expired: number;
  incidents_open: number;
  incidents_resolved: number;
  trainings_assigned: number;
  trainings_completed: number;
  upcoming_shifts: number;
};

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    const [
      { data: employees },
      { data: credentials },
      { data: incidents },
      { data: empTrainings },
      { data: shifts }
    ] = await Promise.all([
      supabase.from("employees").select("id, status"),
      supabase
        .from("credentials")
        .select("id, status, expiry_date"),
      supabase
        .from("incidents")
        .select("id, status"),
      supabase
        .from("employee_trainings")
        .select("id, status"),
      supabase
        .from("shifts")
        .select("id, start_time, status")
    ]);

    const now = new Date();
    const in30days = new Date();
    in30days.setDate(now.getDate() + 30);

    const empArr = (employees || []) as Employee[];
    const credArr = (credentials || []) as Credential[];
    const incArr = (incidents || []) as Incident[];
    const trnArr = (empTrainings || []) as EmployeeTraining[];
    const shiftArr = (shifts || []) as Shift[];

    const s: Stats = {
      employees_active: empArr.filter((e) => e.status === "active").length,
      employees_onboarding: empArr.filter((e) => e.status === "onboarding").length,
      employees_inactive: empArr.filter((e) => e.status === "inactive").length,
      creds_expiring_soon: credArr.filter((c) => {
        if (!c.expiry_date) return false;
        const d = new Date(c.expiry_date);
        return d > now && d <= in30days;
      }).length,
      creds_expired: credArr.filter((c) => {
        if (!c.expiry_date) return false;
        const d = new Date(c.expiry_date);
        return d < now;
      }).length,
      incidents_open: incArr.filter((i) => i.status === "open").length,
      incidents_resolved: incArr.filter((i) => i.status === "resolved").length,
      trainings_assigned: trnArr.length,
      trainings_completed: trnArr.filter((t) => t.status === "completed").length,
      upcoming_shifts: shiftArr.filter((s) => {
        const d = new Date(s.start_time);
        return d >= now && s.status === "scheduled";
      }).length
    };

    setStats(s);
    setLoading(false);
  }

  const trainingCompletionRate =
    stats && stats.trainings_assigned > 0
      ? Math.round(
          (stats.trainings_completed / stats.trainings_assigned) * 100
        )
      : 0;

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Reports"
          description="High-level overview of Tinash workforce, compliance, and operations."
        />

        <div className="px-6 py-4">
          {loading || !stats ? (
            <p className="text-sm text-slate-500">Loading reports...</p>
          ) : (
            <>
              {/* EMPLOYEES */}
              <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Workforce
              </h2>
              <div className="mb-6 grid gap-3 md:grid-cols-3">
                <ReportCard
                  title="Active employees"
                  value={stats.employees_active}
                  helper={`${stats.employees_onboarding} onboarding • ${stats.employees_inactive} inactive`}
                />
                <ReportCard
                  title="Onboarding employees"
                  value={stats.employees_onboarding}
                  helper="New hires in process"
                />
                <ReportCard
                  title="Inactive employees"
                  value={stats.employees_inactive}
                  helper="Not currently working shifts"
                />
              </div>

              {/* CREDENTIALS */}
              <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Credentials & Compliance
              </h2>
              <div className="mb-6 grid gap-3 md:grid-cols-3">
                <ReportCard
                  title="Expiring within 30 days"
                  value={stats.creds_expiring_soon}
                  helper="Licenses & clearances"
                />
                <ReportCard
                  title="Expired credentials"
                  value={stats.creds_expired}
                  helper="Need immediate follow-up"
                  tone="danger"
                />
                <ReportCard
                  title="Training completion rate"
                  value={`${trainingCompletionRate}%`}
                  helper={`${stats.trainings_completed}/${stats.trainings_assigned} completions`}
                />
              </div>

              {/* INCIDENTS + SHIFTS */}
              <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Operations
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <ReportCard
                  title="Open incidents"
                  value={stats.incidents_open}
                  helper={`${stats.incidents_resolved} resolved`}
                  tone={stats.incidents_open > 0 ? "warning" : "neutral"}
                />
                <ReportCard
                  title="Resolved incidents"
                  value={stats.incidents_resolved}
                  helper="Closed and documented"
                />
                <ReportCard
                  title="Upcoming scheduled shifts"
                  value={stats.upcoming_shifts}
                  helper="Next 30+ days"
                />
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  );
}

type ReportCardProps = {
  title: string;
  value: number | string;
  helper?: string;
  tone?: "neutral" | "warning" | "danger";
};

function ReportCard({ title, value, helper, tone = "neutral" }: ReportCardProps) {
  const toneClasses =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-white";

  return (
    <div
      className={`rounded-2xl border ${toneClasses} p-4 shadow-sm`}
    >
      <div className="text-xs font-semibold text-slate-600">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </div>
      {helper && (
        <div className="mt-1 text-xs text-slate-500">{helper}</div>
      )}
    </div>
  );
}