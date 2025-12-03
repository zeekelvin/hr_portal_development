"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";

type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type Incident = {
  id: string;
  employee_id: string;
  type: string | null;
  severity: string | null;
  description: string | null;
  status: string;
  occurred_at: string | null;
};

type IncidentWithName = Incident & {
  employee_name: string;
};

export default function IncidentsPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [incidents, setIncidents] = useState<IncidentWithName[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [searchName, setSearchName] = useState("");

  // Form
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("Performance");
  const [severity, setSeverity] = useState("low");
  const [occurredAt, setOccurredAt] = useState("");
  const [status, setStatus] = useState("open");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
    loadIncidents();
  }, []);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error loading employees:", error);
      return;
    }

    setEmployees((data || []) as EmployeeOption[]);
  }

  async function loadIncidents() {
    const [{ data: inc, error: incErr }, { data: emps, error: empErr }] =
      await Promise.all([
        supabase
          .from("incidents")
          .select("id, employee_id, type, severity, description, status, occurred_at")
          .order("occurred_at", { ascending: false }),
        supabase
          .from("employees")
          .select("id, first_name, last_name")
      ]);

    if (incErr) console.error("Error loading incidents:", incErr);
    if (empErr) console.error("Error loading employees:", empErr);

    const empMap = new Map<string, string>();
    (emps || []).forEach((e: any) => {
      empMap.set(e.id, `${e.first_name} ${e.last_name}`);
    });

    const withNames: IncidentWithName[] = (inc || []).map((i: any) => ({
      ...i,
      employee_name: empMap.get(i.employee_id) ?? "Unknown"
    }));

    setIncidents(withNames);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    if (!employeeId) {
      setErrorMsg("Please select an employee.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("incidents").insert({
      employee_id: employeeId,
      type,
      severity,
      description: description || null,
      status,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null
    });

    setSaving(false);

    if (error) {
      console.error("Error logging incident:", error);
      setErrorMsg(error.message);
      return;
    }

    setEmployeeId("");
    setType("Performance");
    setSeverity("low");
    setOccurredAt("");
    setStatus("open");
    setDescription("");

    await loadIncidents();
  }

  async function changeStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from("incidents")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating incident status:", error);
      return;
    }

    await loadIncidents();
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (
        severityFilter !== "all" &&
        (i.severity || "low") !== severityFilter
      )
        return false;
      if (
        searchName.trim() &&
        !i.employee_name.toLowerCase().includes(searchName.toLowerCase())
      )
        return false;
      return true;
    });
  }, [incidents, statusFilter, severityFilter, searchName]);

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Incidents"
          description="Central log for performance, safety, and client-related incidents."
        />

        <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row">
          {/* LEFT: Log incident */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              Log Incident
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Record issues like no-shows, late arrivals, client complaints, or safety events.
            </p>

            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Employee
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Type
                </label>
                <input
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Performance, Client complaint, Safety, etc."
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Occurred at
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="What happened, who was involved, actions taken..."
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-3 w-full rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Log incident"}
              </button>
            </div>
          </form>

          {/* RIGHT: List + filters */}
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">
                Filters
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as any)
                }
                className="rounded-full border border-slate-300 px-3 py-1"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as any)
                }
                className="rounded-full border border-slate-300 px-3 py-1"
              >
                <option value="all">All severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input
                placeholder="Search by employee..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="min-w-[180px] flex-1 rounded-full border border-slate-300 px-3 py-1"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Occurred</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((i) => (
                    <tr key={i.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{i.employee_name}</td>
                      <td className="px-3 py-2">{i.type || "—"}</td>
                      <td className="px-3 py-2">{i.severity || "—"}</td>
                      <td className="px-3 py-2">{i.status}</td>
                      <td className="px-3 py-2">
                        {i.occurred_at
                          ? new Date(i.occurred_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-xs">
                        <span className="line-clamp-2">
                          {i.description || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {i.status === "open" ? (
                          <button
                            onClick={() =>
                              changeStatus(i.id, "resolved")
                            }
                            className="text-emerald-700 hover:underline"
                          >
                            Mark resolved
                          </button>
                        ) : (
                          <button
                            onClick={() => changeStatus(i.id, "open")}
                            className="text-sky-700 hover:underline"
                          >
                            Re-open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-sm text-slate-500"
                      >
                        No incidents match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}