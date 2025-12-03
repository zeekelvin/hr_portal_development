// app/reconciliation/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import RequireAuth from "@/components/RequireAuth";
import RequireHR from "@/components/RequireHR";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import { supabase } from "@/lib/supabaseClient";

type Run = {
  id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  source_mode: string | null;
  total_carecenta_hours: number | null;
  total_hha_hours: number | null;
  variance_hours: number | null;
  variance_percent: number | null;
};

type Row = {
  id: string;
  run_id: string;
  client_name: string | null;
  employee_name: string | null;
  service_date: string | null;
  carecenta_hours: number | null;
  hha_hours: number | null;
  variance_hours: number | null;
  confirmed_appts: number | null;
  units: number | null;
  notes: string | null;
};

type DatePreset = "custom" | "last14" | "last30" | "last60" | "last90";

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function applyDatePreset(preset: DatePreset, maxDate: string | null) {
  if (preset === "custom" || !maxDate) {
    return { start: null, end: null };
  }
  const end = new Date(maxDate);
  const d = new Date(end);
  let days = 14;
  if (preset === "last30") days = 30;
  if (preset === "last60") days = 60;
  if (preset === "last90") days = 90;
  d.setDate(d.getDate() - days);
  return { start: toISO(d), end: toISO(end) };
}

export default function HoursReconciliationPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which run is currently selected in the history dropdown
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  // Filters
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("last30");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");

  // Upload form state
  const [uploadMode, setUploadMode] = useState<"combined" | "dual">("combined");
  const [combinedFile, setCombinedFile] = useState<File | null>(null);
  const [careFile, setCareFile] = useState<File | null>(null);
  const [hhaFile, setHhaFile] = useState<File | null>(null);
  const [uploadPeriodStart, setUploadPeriodStart] = useState<string>("");
  const [uploadPeriodEnd, setUploadPeriodEnd] = useState<string>("");

  // Rows scoped to the selected run (or all if none picked)
  const rowsForSelectedRun = useMemo(
    () =>
      selectedRunId
        ? rows.filter((r) => r.run_id === selectedRunId)
        : rows,
    [rows, selectedRunId]
  );

  // Load all runs + rows
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: runData, error: runErr } = await supabase
          .from("reconciliation_runs")
          .select(
            "id, created_at, period_start, period_end, source_mode, total_carecenta_hours, total_hha_hours, variance_hours, variance_percent"
          )
          .order("created_at", { ascending: false });

        if (runErr) {
          console.error("load runs error", runErr);
          setError("Failed to load reconciliation runs");
          setLoading(false);
          return;
        }

        const runsCast = (runData || []) as Run[];
        setRuns(runsCast);

        const { data: rowData, error: rowErr } = await supabase
          .from("reconciliation_rows")
          .select(
            "id, run_id, client_name, employee_name, service_date, carecenta_hours, hha_hours, variance_hours, confirmed_appts, units, notes"
          );

        if (rowErr) {
          console.error("load rows error", rowErr);
          setError("Failed to load reconciliation rows");
          setLoading(false);
          return;
        }

        const rowsCast = (rowData || []) as Row[];
        setRows(rowsCast);

        // Default selected run = newest, if any
        if (runsCast.length > 0) {
          const initialRunId = runsCast[0].id;
          setSelectedRunId(initialRunId);

          const rowsForRun = rowsCast.filter(
            (r) => r.run_id === initialRunId && r.service_date
          );
          const dates = rowsForRun
            .map((r) => r.service_date as string)
            .sort();

          if (dates.length > 0) {
            const min = dates[0];
            const max = dates[dates.length - 1];

            const presetRange = applyDatePreset("last30", max);
            setDatePreset("last30");
            setDateStart(presetRange.start ?? min);
            setDateEnd(presetRange.end ?? max);

            setUploadPeriodStart(min);
            setUploadPeriodEnd(max);
          }
        }

        setLoading(false);
      } catch (e) {
        console.error("load error", e);
        setError("Unexpected error while loading reconciliation data");
        setLoading(false);
      }
    }

    load();
  }, []);

  // When selected run changes, re-compute date range for that run
  useEffect(() => {
    if (!selectedRunId) return;
    const rowsWithDates = rowsForSelectedRun.filter((r) => r.service_date);
    if (!rowsWithDates.length) return;

    const dates = rowsWithDates
      .map((r) => r.service_date as string)
      .sort();
    const min = dates[0];
    const max = dates[dates.length - 1];

    if (datePreset === "custom") {
      setDateStart(min);
      setDateEnd(max);
    } else {
      const { start, end } = applyDatePreset(datePreset, max);
      setDateStart(start ?? min);
      setDateEnd(end ?? max);
    }
  }, [selectedRunId, rowsForSelectedRun, datePreset]);

  // Unique clients / employees for filters (based on selected run)
  const clients = useMemo(
    () =>
      Array.from(
        new Set(
          rowsForSelectedRun
            .map((r) => r.client_name)
            .filter((c): c is string => !!c && c.trim().length > 0)
        )
      ).sort(),
    [rowsForSelectedRun]
  );

  const employees = useMemo(
    () =>
      Array.from(
        new Set(
          rowsForSelectedRun
            .map((r) => r.employee_name)
            .filter((e): e is string => !!e && e.trim().length > 0)
        )
      ).sort(),
    [rowsForSelectedRun]
  );

  // Apply filters (including selected run)
  const filteredRows = useMemo(() => {
    return rowsForSelectedRun.filter((r) => {
      if (!r.service_date) return false;

      if (dateStart && r.service_date < dateStart) return false;
      if (dateEnd && r.service_date > dateEnd) return false;

      if (clientFilter !== "all") {
        if ((r.client_name || "") !== clientFilter) return false;
      }
      if (employeeFilter !== "all") {
        if ((r.employee_name || "") !== employeeFilter) return false;
      }
      return true;
    });
  }, [rowsForSelectedRun, dateStart, dateEnd, clientFilter, employeeFilter]);

  // Summary metrics
  const summary = useMemo(() => {
    let care = 0;
    let hha = 0;
    let appts = 0;

    filteredRows.forEach((r) => {
      care += r.carecenta_hours || 0;
      hha += r.hha_hours || 0;
      appts += Number(r.confirmed_appts || 0);
    });

    const variance = hha - care;
    const variancePct = care > 0 ? (variance / care) * 100 : null;

    return {
      care,
      hha,
      total: Math.max(care, hha),
      variance,
      variancePct,
      appts,
    };
  }, [filteredRows]);

  // Time-series chart
  const timeSeriesData = useMemo(() => {
    const map = new Map<
      string,
      { date: string; care: number; hha: number }
    >();

    filteredRows.forEach((r) => {
      if (!r.service_date) return;
      const key = r.service_date;
      if (!map.has(key)) {
        map.set(key, { date: key, care: 0, hha: 0 });
      }
      const entry = map.get(key)!;
      entry.care += r.carecenta_hours || 0;
      entry.hha += r.hha_hours || 0;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredRows]);

  // Employee aggregate
  const employeeAgg = useMemo(() => {
    const map = new Map<
      string,
      {
        employee: string;
        clients: Set<string>;
        appts: number;
        units: number;
        care: number;
        hha: number;
      }
    >();

    filteredRows.forEach((r) => {
      const employee = r.employee_name || "Unknown";
      const client = r.client_name || "Unknown";

      if (!map.has(employee)) {
        map.set(employee, {
          employee,
          clients: new Set<string>(),
          appts: 0,
          units: 0,
          care: 0,
          hha: 0,
        });
      }

      const entry = map.get(employee)!;
      entry.clients.add(client);
      entry.appts += Number(r.confirmed_appts || 0);
      entry.units += Number(r.units || 0);
      entry.care += r.carecenta_hours || 0;
      entry.hha += r.hha_hours || 0;
    });

    return Array.from(map.values())
      .map((e) => ({
        employee: e.employee,
        clients: e.clients.size,
        appts: e.appts,
        units: e.units,
        care: e.care,
        hha: e.hha,
        diff: e.hha - e.care,
      }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [filteredRows]);

  // Client aggregate
  const clientAgg = useMemo(() => {
    const map = new Map<
      string,
      {
        client: string;
        employees: Set<string>;
        appts: number;
        units: number;
        care: number;
        hha: number;
      }
    >();

    filteredRows.forEach((r) => {
      const client = r.client_name || "Unknown";
      const employee = r.employee_name || "Unknown";

      if (!map.has(client)) {
        map.set(client, {
          client,
          employees: new Set<string>(),
          appts: 0,
          units: 0,
          care: 0,
          hha: 0,
        });
      }

      const entry = map.get(client)!;
      entry.employees.add(employee);
      entry.appts += Number(r.confirmed_appts || 0);
      entry.units += Number(r.units || 0);
      entry.care += r.carecenta_hours || 0;
      entry.hha += r.hha_hours || 0;
    });

    return Array.from(map.values())
      .map((c) => ({
        client: c.client,
        employees: c.employees.size,
        appts: c.appts,
        units: c.units,
        care: c.care,
        hha: c.hha,
        diff: c.hha - c.care,
      }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [filteredRows]);

  const topClientVarianceData = useMemo(
    () => clientAgg.slice(0, 10),
    [clientAgg]
  );

  const handlePresetChange = (value: DatePreset) => {
    setDatePreset(value);
    if (value === "custom") return;

    const dates = rowsForSelectedRun
      .map((r) => r.service_date as string | null)
      .filter((d): d is string => !!d)
      .sort();
    if (dates.length === 0) return;

    const max = dates[dates.length - 1];
    const { start, end } = applyDatePreset(value, max);
    if (start) setDateStart(start);
    if (end) setDateEnd(end);
  };

  const handleDownloadCsv = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      "run_id",
      "client",
      "employee",
      "service_date",
      "carecenta_hours",
      "hha_hours",
      "variance_hours",
      "confirmed_appts",
      "units",
      "notes",
    ];

    const lines = [
      headers.join(","),
      ...filteredRows.map((r) =>
        [
          r.run_id,
          JSON.stringify(r.client_name || ""),
          JSON.stringify(r.employee_name || ""),
          r.service_date || "",
          r.carecenta_hours ?? "",
          r.hha_hours ?? "",
          r.variance_hours ?? "",
          r.confirmed_appts ?? "",
          r.units ?? "",
          JSON.stringify(r.notes || ""),
        ].join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tinash-hours-reconciliation.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    try {
      setUploading(true);
      setError(null);

      if (!uploadPeriodStart || !uploadPeriodEnd) {
        setError("Please set period start and end for this upload.");
        setUploading(false);
        return;
      }

      const form = new FormData();
      form.append("period_start", uploadPeriodStart);
      form.append("period_end", uploadPeriodEnd);

      if (uploadMode === "combined") {
        if (!combinedFile) {
          setError("Please choose the combined CareCenta + HHAeX file.");
          setUploading(false);
          return;
        }
        form.append("mode", "combined");
        form.append("combined_file", combinedFile);
      } else {
        if (!careFile || !hhaFile) {
          setError("Please choose BOTH CareCenta and HHAeX files.");
          setUploading(false);
          return;
        }
        form.append("mode", "dual");
        form.append("carecenta_file", careFile);
        form.append("hha_file", hhaFile);
      }

      const res = await fetch("/api/reconciliation/ingest", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("ingest error body", body);
        setError(body?.error || "Failed to ingest reconciliation file(s).");
        setUploading(false);
        return;
      }

      // Reload rows
      const { data: rowData, error: rowErr } = await supabase
        .from("reconciliation_rows")
        .select(
          "id, run_id, client_name, employee_name, service_date, carecenta_hours, hha_hours, variance_hours, confirmed_appts, units, notes"
        );

      if (!rowErr && rowData) {
        setRows(rowData as Row[]);
      }

      // Reload runs and default to newest run
      const { data: runData, error: runErr } = await supabase
        .from("reconciliation_runs")
        .select(
          "id, created_at, period_start, period_end, source_mode, total_carecenta_hours, total_hha_hours, variance_hours, variance_percent"
        )
        .order("created_at", { ascending: false });

      if (!runErr && runData) {
        const runsCast = runData as Run[];
        setRuns(runsCast);
        if (runsCast.length > 0) {
          setSelectedRunId(runsCast[0].id);
        }
      }

      setUploading(false);
    } catch (e) {
      console.error("upload error", e);
      setError("Unexpected error while uploading reconciliation file(s).");
      setUploading(false);
    }
  };

  // Delete current run (uses /api/reconciliation/run)
  const handleDeleteRun = async () => {
    if (!selectedRunId) return;
    const confirmed = window.confirm(
      "Delete this reconciliation run and all its rows? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      const res = await fetch(
        `/api/reconciliation/run?id=${encodeURIComponent(selectedRunId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        console.error("delete run failed", await res.text());
        setError("Failed to delete reconciliation run.");
        setDeleting(false);
        return;
      }

      // Remove from local state
      const remainingRuns = runs.filter((r) => r.id !== selectedRunId);
      const remainingRows = rows.filter((r) => r.run_id !== selectedRunId);
      setRuns(remainingRuns);
      setRows(remainingRows);

      // Pick next run (newest) or clear selection
      if (remainingRuns.length > 0) {
        setSelectedRunId(remainingRuns[0].id);
      } else {
        setSelectedRunId("");
      }

      setDeleting(false);
    } catch (e) {
      console.error("delete run error", e);
      setError("Unexpected error while deleting reconciliation run.");
      setDeleting(false);
    }
  };

  // Helper: label for a run option
  const runLabel = (r: Run) => {
    const start = r.period_start || "";
    const end = r.period_end || "";
    const mode = r.source_mode || "combined";
    return `${start} → ${end} (${mode})`;
  };

  return (
    <RequireAuth>
      <RequireHR>
        <AppLayout>
          <Topbar
            title="Homecare Hours Reconciliation"
            subtitle="Compare CareCenta vs HHAeX hours, filter by client/employee, and export discrepancies."
            rightSlot={
              <div className="text-xs text-tinash-muted">
                Admin • Signed in
              </div>
            }
          />

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* FILTERS + SUMMARY + RUN HISTORY */}
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              {/* Run history + delete */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-[11px] font-semibold text-slate-700">
                    Reconciliation run
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Switch between historical uploads. Filters + charts apply
                    to the selected run.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="w-64 rounded-md border px-2 py-1 text-xs"
                    value={selectedRunId}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    disabled={runs.length === 0}
                  >
                    {runs.length === 0 ? (
                      <option value="">No runs yet</option>
                    ) : (
                      runs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {runLabel(r)}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleDeleteRun}
                    disabled={!selectedRunId || deleting}
                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete this run"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {/* Date range */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">
                      Date range
                    </label>
                    <select
                      className="rounded-md border px-1.5 py-0.5 text-[11px]"
                      value={datePreset}
                      onChange={(e) =>
                        handlePresetChange(e.target.value as DatePreset)
                      }
                    >
                      <option value="custom">Custom</option>
                      <option value="last14">Last 14 days</option>
                      <option value="last30">Last 30 days</option>
                      <option value="last60">Last 60 days</option>
                      <option value="last90">Last 90 days</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="w-1/2 rounded-md border px-2 py-1 text-xs"
                      value={dateStart}
                      onChange={(e) => {
                        setDateStart(e.target.value);
                        setDatePreset("custom");
                      }}
                    />
                    <input
                      type="date"
                      className="w-1/2 rounded-md border px-2 py-1 text-xs"
                      value={dateEnd}
                      onChange={(e) => {
                        setDateEnd(e.target.value);
                        setDatePreset("custom");
                      }}
                    />
                  </div>
                </div>

                {/* Client filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Client
                  </label>
                  <select
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    {clients.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Employee
                  </label>
                  <select
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    {employees.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Download CSV */}
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={filteredRows.length === 0}
                    className="inline-flex items-center justify-center rounded-lg bg-tinash-navy px-3 py-2 text-xs font-medium text-white hover:bg-tinash-navy/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Download CSV ({filteredRows.length || 0} rows)
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4 text-xs">
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">Total hours</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {summary.total.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    From filtered rows
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">
                    CareCenta hours
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {summary.care.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">
                    HHAeX hours
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {summary.hha.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">
                    Difference (HHAeX − CareCenta)
                  </div>
                  <div
                    className={`mt-1 text-lg font-semibold ${
                      summary.variance > 0
                        ? "text-emerald-600"
                        : summary.variance < 0
                        ? "text-red-600"
                        : "text-slate-900"
                    }`}
                  >
                    {summary.variance.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {summary.variancePct != null
                      ? `${summary.variancePct.toFixed(1)}%`
                      : "—"}
                  </div>
                </div>
              </div>
            </section>

            {/* HOURS OVER TIME */}
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Hours serviced over time
                </h2>
                <span className="text-[11px] text-slate-500">
                  Daily CareCenta vs HHAeX hours for the current filters.
                </span>
              </div>

              <div className="h-64 w-full">
                {timeSeriesData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    No data for the selected filters.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="care"
                        name="CareCenta hours"
                        fill="#2563eb"
                      />
                      <Bar
                        dataKey="hha"
                        name="HHAeX hours"
                        fill="#f97316"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* TOP CLIENT VARIANCE */}
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Top client variances
                </h2>
                <span className="text-[11px] text-slate-500">
                  Clients with the largest hour mismatches (absolute value).
                </span>
              </div>
              <div className="h-64 w-full">
                {topClientVarianceData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    No variance data for the selected filters.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClientVarianceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="client" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="care" name="CareCenta" fill="#38bdf8" />
                      <Bar dataKey="hha" name="HHAeX" fill="#a855f7" />
                      <Bar
                        dataKey="diff"
                        name="Difference (HHAeX − CareCenta)"
                        fill="#ef4444"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* EMPLOYEE HOURS */}
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Employee hours
              </h2>
              <p className="text-[11px] text-slate-500 mb-2">
                Summed hours, units, and appointment counts per employee for the
                current filters.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50 text-[11px] text-slate-600">
                      <th className="px-2 py-1 text-left font-medium">
                        Employee
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Clients
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Confirmed appts
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Units
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        CareCenta hours
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        HHAeX hours
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Difference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeAgg.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-2 py-4 text-center text-xs text-slate-500"
                        >
                          No employees in the selected filters.
                        </td>
                      </tr>
                    ) : (
                      employeeAgg.map((e) => (
                        <tr
                          key={e.employee}
                          className="border-b last:border-b-0"
                        >
                          <td className="px-2 py-1 text-left">
                            {e.employee}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {e.clients}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {e.appts}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {e.units}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {e.care.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {e.hha.toFixed(2)}
                          </td>
                          <td
                            className={`px-2 py-1 text-right ${
                              e.diff > 0
                                ? "text-emerald-600"
                                : e.diff < 0
                                ? "text-red-600"
                                : "text-slate-700"
                            }`}
                          >
                            {e.diff.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* CLIENT HOURS */}
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Client hours
              </h2>
              <p className="text-[11px] text-slate-500">
                Per-client hours, units, appointments, and mismatches.
              </p>
              {/* Client-hours context snippet: date range + count */}
              <p className="text-[11px] text-slate-500 mb-2">
                Showing {filteredRows.length} row
                {filteredRows.length === 1 ? "" : "s"} between{" "}
                {dateStart || "—"} and {dateEnd || "—"} for the selected run.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50 text-[11px] text-slate-600">
                      <th className="px-2 py-1 text-left font-medium">
                        Client
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Employees
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Confirmed appts
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Units
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        CareCenta hours
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        HHAeX hours
                      </th>
                      <th className="px-2 py-1 text-right font-medium">
                        Difference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientAgg.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-2 py-4 text-center text-xs text-slate-500"
                        >
                          No clients in the selected filters.
                        </td>
                      </tr>
                    ) : (
                      clientAgg.map((c) => (
                        <tr
                          key={c.client}
                          className="border-b last:border-b-0"
                        >
                          <td className="px-2 py-1 text-left">{c.client}</td>
                          <td className="px-2 py-1 text-right">
                            {c.employees}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {c.appts}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {c.units}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {c.care.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {c.hha.toFixed(2)}
                          </td>
                          <td
                            className={`px-2 py-1 text-right ${
                              c.diff > 0
                                ? "text-emerald-600"
                                : c.diff < 0
                                ? "text-red-600"
                                : "text-slate-700"
                            }`}
                          >
                            {c.diff.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* UPLOAD (unchanged) */}
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                New reconciliation upload
              </h2>
              <p className="text-[11px] text-slate-500">
                Upload either two separate exports (CareCenta + HHAeX) or a
                single combined file. The engine will compute per-client and
                per-employee variances and update the dashboard above.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
                {/* Mode */}
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-slate-700">
                    Source mode
                  </div>
                  <div className="inline-flex rounded-lg border bg-slate-50 p-0.5">
                    <button
                      type="button"
                      className={`flex-1 rounded-md px-2 py-1 text-[11px] ${
                        uploadMode === "combined"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600"
                      }`}
                      onClick={() => setUploadMode("combined")}
                    >
                      Combined file
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-md px-2 py-1 text-[11px] ${
                        uploadMode === "dual"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600"
                      }`}
                      onClick={() => setUploadMode("dual")}
                    >
                      Two files
                    </button>
                  </div>
                </div>

                {/* Period start / end */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Period start
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    value={uploadPeriodStart}
                    onChange={(e) => setUploadPeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Period end
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    value={uploadPeriodEnd}
                    onChange={(e) => setUploadPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* File inputs */}
              {uploadMode === "combined" ? (
                <div className="space-y-1 text-xs">
                  <label className="text-[11px] font-medium text-slate-700">
                    Combined CareCenta + HHAeX file
                  </label>
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={(e) =>
                      setCombinedFile(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-[11px]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Use the export you currently download from CareCenta where
                    you paste in HHAeX hours in the last columns.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">
                      CareCenta file
                    </label>
                    <input
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      onChange={(e) =>
                        setCareFile(e.target.files?.[0] ?? null)
                      }
                      className="block w-full text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">
                      HHAeX file
                    </label>
                    <input
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      onChange={(e) =>
                        setHhaFile(e.target.files?.[0] ?? null)
                      }
                      className="block w-full text-[11px]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex items-center rounded-lg bg-tinash-navy px-3 py-2 text-xs font-medium text-white hover:bg-tinash-navy/90 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {uploading
                    ? "Running reconciliation..."
                    : "Run reconciliation"}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Accepted: .xlsx, .xls, .csv. The engine will attempt to map
                client, employee, date, hours, appts, and units automatically
                based on your standard export format.
              </p>
            </section>
          </div>
        </AppLayout>
      </RequireHR>
    </RequireAuth>
  );
}
