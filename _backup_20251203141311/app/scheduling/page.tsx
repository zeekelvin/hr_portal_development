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

type Shift = {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
};

type ShiftWithName = Shift & {
  employee_name: string;
};

export default function SchedulingPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shifts, setShifts] = useState<ShiftWithName[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "canceled">("all");
  const [searchName, setSearchName] = useState("");

  // Form
  const [employeeId, setEmployeeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
    loadShifts();
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

  async function loadShifts() {
    const [{ data: sh, error: shErr }, { data: emps, error: empErr }] =
      await Promise.all([
        supabase
          .from("shifts")
          .select("id, employee_id, start_time, end_time, status, notes")
          .order("start_time", { ascending: true }),
        supabase
          .from("employees")
          .select("id, first_name, last_name")
      ]);

    if (shErr) console.error("Error loading shifts:", shErr);
    if (empErr) console.error("Error loading employees:", empErr);

    const empMap = new Map<string, string>();
    (emps || []).forEach((e: any) => {
      empMap.set(e.id, `${e.first_name} ${e.last_name}`);
    });

    const withNames: ShiftWithName[] = (sh || []).map((s: any) => ({
      ...s,
      employee_name: empMap.get(s.employee_id) ?? "Unknown"
    }));

    setShifts(withNames);
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
    if (!start || !end) {
      setErrorMsg("Start and end time are required.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("shifts").insert({
      employee_id: employeeId,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      status,
      notes: notes || null
    });

    setSaving(false);

    if (error) {
      console.error("Error creating shift:", error);
      setErrorMsg(error.message);
      return;
    }

    setEmployeeId("");
    setStart("");
    setEnd("");
    setStatus("scheduled");
    setNotes("");

    await loadShifts();
  }

  async function changeStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from("shifts")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating shift status:", error);
      return;
    }

    await loadShifts();
  }

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (
        searchName.trim() &&
        !s.employee_name.toLowerCase().includes(searchName.toLowerCase())
      )
        return false;
      return true;
    });
  }, [shifts, statusFilter, searchName]);

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Scheduling"
          description="View and manage shifts for caregivers across all clients."
        />

        <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row">
          {/* LEFT: Add shift */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              Add Shift
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Assign a scheduled visit or shift to an employee.
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
                  Start time
                </label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  End time
                </label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
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
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Client name, address, visit details..."
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
                {saving ? "Saving..." : "Add shift"}
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
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
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
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredShifts.map((s) => (
                    <tr key={s.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{s.employee_name}</td>
                      <td className="px-3 py-2">
                        {new Date(s.start_time).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {new Date(s.end_time).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{s.status}</td>
                      <td className="px-3 py-2 max-w-xs">
                        {s.notes || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {s.status !== "completed" && (
                          <button
                            onClick={() =>
                              changeStatus(s.id, "completed")
                            }
                            className="mr-2 text-emerald-700 hover:underline"
                          >
                            Mark completed
                          </button>
                        )}
                        {s.status !== "canceled" && (
                          <button
                            onClick={() =>
                              changeStatus(s.id, "canceled")
                            }
                            className="text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredShifts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-sm text-slate-500"
                      >
                        No shifts match your filters.
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