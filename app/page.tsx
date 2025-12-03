"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import RequireHR from "@/components/RequireHR";
import { supabase } from "@/lib/supabaseClient";

type MetricNumber = {
  value: number | null;
  loading: boolean;
  error?: string | null;
};

type CredentialRow = {
  id: string;
  employee_id: string | null;
  name: string | null;
  type: string | null;
  expiry_date: string | null;
};

export default function DashboardPage() {
  const [activeEmployees, setActiveEmployees] = useState<MetricNumber>({
    value: null,
    loading: true,
  });
  const [openSchedules, setOpenSchedules] = useState<MetricNumber>({
    value: null,
    loading: true,
  });
  const [openIncidents, setOpenIncidents] = useState<MetricNumber>({
    value: null,
    loading: true,
  });
  const [expiringCreds, setExpiringCreds] = useState<CredentialRow[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      // ACTIVE EMPLOYEES
      try {
        const { count, error } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("status", "active");

        if (error) {
          console.error("Dashboard: active employees error", error);
          setActiveEmployees({ value: null, loading: false, error: error.message });
        } else {
          setActiveEmployees({
            value: typeof count === "number" ? count : null,
            loading: false,
          });
        }
      } catch (err: any) {
        console.error("Dashboard: active employees crashed", err);
        setActiveEmployees({
          value: null,
          loading: false,
          error: err.message ?? "Unknown error",
        });
      }

      // OPEN SCHEDULES (shifts with status = 'open')
      try {
        const { count, error } = await supabase
          .from("shifts")
          .select("id", { count: "exact", head: true })
          .eq("status", "open");

        if (error) {
          console.error("Dashboard: open schedules error", error);
          setOpenSchedules({ value: null, loading: false, error: error.message });
        } else {
          setOpenSchedules({
            value: typeof count === "number" ? count : null,
            loading: false,
          });
        }
      } catch (err: any) {
        console.error("Dashboard: open schedules crashed", err);
        setOpenSchedules({
          value: null,
          loading: false,
          error: err.message ?? "Unknown error",
        });
      }

      // OPEN INCIDENTS (status = 'open')
      try {
        const { count, error } = await supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("status", "open");

        if (error) {
          console.error("Dashboard: open incidents error", error);
          setOpenIncidents({ value: null, loading: false, error: error.message });
        } else {
          setOpenIncidents({
            value: typeof count === "number" ? count : null,
            loading: false,
          });
        }
      } catch (err: any) {
        console.error("Dashboard: open incidents crashed", err);
        setOpenIncidents({
          value: null,
          loading: false,
          error: err.message ?? "Unknown error",
        });
      }

      // CREDENTIALS expiring in next 60 days
      try {
        const today = new Date();
        const in60 = new Date();
        in60.setDate(today.getDate() + 60);

        const { data, error } = await supabase
          .from("credentials")
          .select("id, employee_id, name, type, expiry_date")
          .gte("expiry_date", today.toISOString().slice(0, 10))
          .lte("expiry_date", in60.toISOString().slice(0, 10))
          .order("expiry_date", { ascending: true });

        if (error) {
          console.error("Dashboard: expiring credentials error", error);
          setExpiringCreds([]);
        } else {
          setExpiringCreds((data || []) as CredentialRow[]);
        }
      } catch (err) {
        console.error("Dashboard: expiring credentials crashed", err);
        setExpiringCreds([]);
      } finally {
        setLoadingCreds(false);
      }
    }

    loadMetrics();
  }, []);

  const formatMetric = (m: MetricNumber) => {
    if (m.loading) return "…";
    if (m.value === null) return "—";
    return m.value.toString();
  };

  return (
    <RequireAuth>
      <RequireHR>
        <AppLayout>
          <Topbar
            title="Tinash HR Dashboard"
            description="Quick view of workforce, compliance, training, and coverage."
          />

          <div className="px-6 py-6 space-y-8">
            {/* High-level metric cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Active Employees */}
              <div className="rounded-2xl border border-tinash-border bg-white p-4">
                <div className="text-xs font-medium uppercase text-slate-500">
                  Active Employees
                </div>
                <div className="mt-2 text-2xl font-semibold text-tinash-text">
                  {formatMetric(activeEmployees)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Total caregivers & staff currently marked as active.
                </p>
              </div>

              {/* Open Schedules */}
              <div className="rounded-2xl border border-tinash-border bg-white p-4">
                <div className="text-xs font-medium uppercase text-slate-500">
                  Open Schedules
                </div>
                <div className="mt-2 text-2xl font-semibold text-tinash-text">
                  {formatMetric(openSchedules)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Shifts that are not yet assigned or confirmed.
                </p>
              </div>

              {/* Open Incidents */}
              <div className="rounded-2xl border border-tinash-border bg-white p-4">
                <div className="text-xs font-medium uppercase text-slate-500">
                  Open Incidents
                </div>
                <div className="mt-2 text-2xl font-semibold text-tinash-text">
                  {formatMetric(openIncidents)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Active issues still under review or follow-up.
                </p>
              </div>

              {/* Turnover (90D) placeholder */}
              <div className="rounded-2xl border border-dashed border-tinash-border bg-white p-4">
                <div className="text-xs font-medium uppercase text-slate-500">
                  Turnover (90D)
                </div>
                <div className="mt-2 text-2xl font-semibold text-tinash-text">
                  —
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Turnover metrics will appear here once reporting is wired to
                  historical hire/termination data.
                </p>
              </div>
            </div>

            {/* Second row: Training & Coverage placeholders */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Training Compliance placeholder */}
              <div className="rounded-2xl border border-dashed border-tinash-border bg-white p-4">
                <div className="text-xs font-medium uppercase text-slate-500">
                  Training Compliance
                </div>
                <div className="mt-2 text-xl font-semibold text-tinash-text">
                  Coming soon
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Training completion rates will appear here once training
                  assignments and completions are fully wired.
                </p>
              </div>

              {/* Coverage Gaps placeholder */}
              <div className="rounded-2xl border border-dashed border-tinash-border bg-white p-4">
                <div className="text-xs font-medium uppercase text-slate-500">
                  Coverage Gaps &amp; Open Shifts
                </div>
                <div className="mt-2 text-xl font-semibold text-tinash-text">
                  Coming soon
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Open shifts and coverage gaps will be highlighted here as
                  scheduling data is fully wired. Use this view to spot
                  under-staffed cases before they become issues.
                </p>
              </div>
            </div>

            {/* Credential expirations list */}
            <div className="rounded-2xl border border-tinash-border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500">
                    Credential Expirations (Next 60 days)
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Track licenses and clearances that will expire soon so you
                    can keep caregivers compliant and avoid service disruption.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {loadingCreds ? (
                  <p className="text-xs text-slate-500">Loading expirations…</p>
                ) : expiringCreds.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No upcoming credential expirations within 60 days.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 pr-4 font-medium text-slate-600">
                            Credential
                          </th>
                          <th className="py-2 pr-4 font-medium text-slate-600">
                            Type
                          </th>
                          <th className="py-2 pr-4 font-medium text-slate-600">
                            Employee ID
                          </th>
                          <th className="py-2 pr-4 font-medium text-slate-600">
                            Expiry Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiringCreds.map((c) => (
                          <tr key={c.id} className="border-b border-slate-100">
                            <td className="py-2 pr-4">
                              {c.name || "(Unnamed)"}
                            </td>
                            <td className="py-2 pr-4">
                              {c.type || "—"}
                            </td>
                            <td className="py-2 pr-4">
                              {c.employee_id || "—"}
                            </td>
                            <td className="py-2 pr-4">
                              {c.expiry_date
                                ? new Date(c.expiry_date).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AppLayout>
      </RequireHR>
    </RequireAuth>
  );
}
