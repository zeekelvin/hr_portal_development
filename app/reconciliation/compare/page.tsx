"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

type Agg = {
  key: string;
  care: number;
  hha: number;
  variance: number;
};

type DiffRow = {
  key: string;
  a?: Agg;
  b?: Agg;
  delta: Agg;
  status: "added" | "removed" | "changed" | "unchanged";
};

function summarize(rows: Row[]) {
  let care = 0;
  let hha = 0;
  let appts = 0;

  for (const r of rows) {
    care += r.carecenta_hours || 0;
    hha += r.hha_hours || 0;
    appts += Number(r.confirmed_appts || 0);
  }

  const variance = hha - care;
  const variancePct = care > 0 ? (variance / care) * 100 : null;

  return { care, hha, variance, variancePct, appts, rows: rows.length };
}

function aggregateBy(rows: Row[], keySelector: (r: Row) => string) {
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const key = keySelector(r) || "Unknown";
    const agg = map.get(key) ?? { key, care: 0, hha: 0, variance: 0 };
    agg.care += r.carecenta_hours || 0;
    agg.hha += r.hha_hours || 0;
    agg.variance = agg.hha - agg.care;
    map.set(key, agg);
  }
  return map;
}

function buildDiff(aMap: Map<string, Agg>, bMap: Map<string, Agg>): DiffRow[] {
  const keys = new Set<string>([...aMap.keys(), ...bMap.keys()]);
  const rows: DiffRow[] = [];
  for (const key of keys) {
    const a = aMap.get(key);
    const b = bMap.get(key);
    const delta: Agg = {
      key,
      care: (b?.care || 0) - (a?.care || 0),
      hha: (b?.hha || 0) - (a?.hha || 0),
      variance: (b?.variance || 0) - (a?.variance || 0),
    };

    let status: DiffRow["status"] = "unchanged";
    if (a && !b) status = "removed";
    else if (!a && b) status = "added";
    else if (
      Math.abs(delta.care) > 0.0001 ||
      Math.abs(delta.hha) > 0.0001 ||
      Math.abs(delta.variance) > 0.0001
    ) {
      status = "changed";
    }

    rows.push({ key, a, b, delta, status });
  }

  return rows.sort((x, y) => Math.abs(y.delta.variance) - Math.abs(x.delta.variance));
}

function formatHours(value: number) {
  return value.toFixed(2);
}

function Badge({ status }: { status: DiffRow["status"] }) {
  const styles: Record<DiffRow["status"], string> = {
    added: "bg-emerald-50 text-emerald-700 border-emerald-200",
    removed: "bg-red-50 text-red-700 border-red-200",
    changed: "bg-amber-50 text-amber-700 border-amber-200",
    unchanged: "bg-slate-50 text-slate-500 border-slate-200",
  };
  const label: Record<DiffRow["status"], string> = {
    added: "Added",
    removed: "Removed",
    changed: "Changed",
    unchanged: "No change",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
      {label[status]}
    </span>
  );
}

export default function ReconciliationComparePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [runA, setRunA] = useState<string>("");
  const [runB, setRunB] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load runs on mount
  useEffect(() => {
    async function loadRuns() {
      setLoading(true);
      setError(null);
      const { data, error: runErr } = await supabase
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

      const list = (data || []) as Run[];
      setRuns(list);

      // Default selection: newest as B, previous as A
      if (list.length > 0) {
        setRunB(list[0].id);
        if (list.length > 1) {
          setRunA(list[1].id);
        }
      }
      setLoading(false);
    }
    loadRuns();
  }, []);

  // Load rows for selected runs
  useEffect(() => {
    async function loadRows() {
      const ids = [runA, runB].filter(Boolean);
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      setLoading(true);
      setError(null);

      const { data, error: rowErr } = await supabase
        .from("reconciliation_rows")
        .select(
          "id, run_id, client_name, employee_name, service_date, carecenta_hours, hha_hours, variance_hours, confirmed_appts, units, notes"
        )
        .in("run_id", ids);

      if (rowErr) {
        console.error("load rows error", rowErr);
        setError("Failed to load reconciliation rows");
        setLoading(false);
        return;
      }

      setRows((data || []) as Row[]);
      setLoading(false);
    }
    loadRows();
  }, [runA, runB]);

  const runMetaA = useMemo(() => runs.find((r) => r.id === runA), [runs, runA]);
  const runMetaB = useMemo(() => runs.find((r) => r.id === runB), [runs, runB]);

  const rowsA = useMemo(() => rows.filter((r) => r.run_id === runA), [rows, runA]);
  const rowsB = useMemo(() => rows.filter((r) => r.run_id === runB), [rows, runB]);

  const summaryA = useMemo(() => summarize(rowsA), [rowsA]);
  const summaryB = useMemo(() => summarize(rowsB), [rowsB]);

  // Aggregations
  const clientDiff = useMemo(() => {
    const a = aggregateBy(rowsA, (r) => r.client_name || "Unknown");
    const b = aggregateBy(rowsB, (r) => r.client_name || "Unknown");
    return buildDiff(a, b);
  }, [rowsA, rowsB]);

  const employeeDiff = useMemo(() => {
    const a = aggregateBy(rowsA, (r) => r.employee_name || "Unknown");
    const b = aggregateBy(rowsB, (r) => r.employee_name || "Unknown");
    return buildDiff(a, b);
  }, [rowsA, rowsB]);

  const dateDiff = useMemo(() => {
    const a = aggregateBy(rowsA, (r) => r.service_date || "Unknown date");
    const b = aggregateBy(rowsB, (r) => r.service_date || "Unknown date");
    return buildDiff(a, b);
  }, [rowsA, rowsB]);

  const hasSelections = runA && runB;

  const RunSummaryCard = ({
    title,
    run,
    summary,
  }: {
    title: string;
    run?: Run;
    summary: ReturnType<typeof summarize>;
  }) => (
    <div className="rounded-lg border bg-white p-4 shadow-sm text-xs">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-700">{title}</div>
        {run && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
            {run.period_start} → {run.period_end} ({run.source_mode || "combined"})
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1 text-slate-900">
        <div className="flex justify-between">
          <span className="text-[11px] text-slate-500">CareCenta hours</span>
          <span className="font-semibold">{formatHours(summary.care)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[11px] text-slate-500">HHAeX hours</span>
          <span className="font-semibold">{formatHours(summary.hha)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[11px] text-slate-500">Variance (HHAeX − CareCenta)</span>
          <span
            className={`font-semibold ${
              summary.variance > 0
                ? "text-emerald-600"
                : summary.variance < 0
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {formatHours(summary.variance)}
            {summary.variancePct != null ? ` (${summary.variancePct.toFixed(1)}%)` : ""}
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>Rows</span>
          <span>{summary.rows}</span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>Confirmed appts</span>
          <span>{summary.appts}</span>
        </div>
        {run && (
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Created</span>
            <span>{new Date(run.created_at).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );

  const DiffTable = ({ title, rows }: { title: string; rows: DiffRow[] }) => (
    <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="text-[11px] text-slate-500">
          Showing changes between Run A and Run B.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b bg-slate-50 text-[11px] text-slate-600">
              <th className="px-2 py-1 text-left font-medium">Key</th>
              <th className="px-2 py-1 text-right font-medium">Run A (Care / HHA / Var)</th>
              <th className="px-2 py-1 text-right font-medium">Run B (Care / HHA / Var)</th>
              <th className="px-2 py-1 text-right font-medium">Δ (B − A)</th>
              <th className="px-2 py-1 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-xs text-slate-500">
                  No data for selected runs.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-b last:border-b-0">
                  <td className="px-2 py-1 text-left">{row.key}</td>
                  <td className="px-2 py-1 text-right text-slate-700">
                    {row.a
                      ? `${formatHours(row.a.care)} / ${formatHours(row.a.hha)} / ${formatHours(row.a.variance)}`
                      : "—"}
                  </td>
                  <td className="px-2 py-1 text-right text-slate-700">
                    {row.b
                      ? `${formatHours(row.b.care)} / ${formatHours(row.b.hha)} / ${formatHours(row.b.variance)}`
                      : "—"}
                  </td>
                  <td
                    className={`px-2 py-1 text-right ${
                      row.delta.variance > 0
                        ? "text-emerald-600"
                        : row.delta.variance < 0
                        ? "text-red-600"
                        : "text-slate-700"
                    }`}
                  >
                    {`${formatHours(row.delta.care)} / ${formatHours(row.delta.hha)} / ${formatHours(row.delta.variance)}`}
                  </td>
                  <td className="px-2 py-1 text-left">
                    <Badge status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <RequireAuth>
      <RequireHR>
        <AppLayout>
          <Topbar
            title="Compare reconciliation runs"
            subtitle="Select two runs to see GitHub-style diffs across clients, employees, and dates."
            rightSlot={
              <Link
                href="/reconciliation"
                className="text-xs font-semibold text-sky-700 underline"
              >
                Back to reconciliation dashboard
              </Link>
            }
          />

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Select runs to compare
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Run A (left) is treated as the base; Run B (right) is the target for deltas.
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Link
                    href="/reconciliation/upload"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    New reconciliation upload
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Run A (base)
                  </label>
                  <select
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    value={runA}
                    onChange={(e) => setRunA(e.target.value)}
                  >
                    <option value="">Select run</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.period_start} → {r.period_end} ({r.source_mode || "combined"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Run B (target)
                  </label>
                  <select
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    value={runB}
                    onChange={(e) => setRunB(e.target.value)}
                  >
                    <option value="">Select run</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.period_start} → {r.period_end} ({r.source_mode || "combined"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
                <RunSummaryCard title="Run A (base)" run={runMetaA} summary={summaryA} />
                <RunSummaryCard title="Run B (target)" run={runMetaB} summary={summaryB} />
                <div className="rounded-lg border bg-slate-50 p-4 shadow-inner">
                  <div className="text-[11px] font-semibold text-slate-700">Headline deltas (B − A)</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500">CareCenta hours</span>
                      <span
                        className={`font-semibold ${
                          summaryB.care - summaryA.care > 0
                            ? "text-emerald-600"
                            : summaryB.care - summaryA.care < 0
                            ? "text-red-600"
                            : "text-slate-900"
                        }`}
                      >
                        {formatHours(summaryB.care - summaryA.care)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500">HHAeX hours</span>
                      <span
                        className={`font-semibold ${
                          summaryB.hha - summaryA.hha > 0
                            ? "text-emerald-600"
                            : summaryB.hha - summaryA.hha < 0
                            ? "text-red-600"
                            : "text-slate-900"
                        }`}
                      >
                        {formatHours(summaryB.hha - summaryA.hha)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500">Variance</span>
                      <span
                        className={`font-semibold ${
                          summaryB.variance - summaryA.variance > 0
                            ? "text-emerald-600"
                            : summaryB.variance - summaryA.variance < 0
                            ? "text-red-600"
                            : "text-slate-900"
                        }`}
                      >
                        {formatHours(summaryB.variance - summaryA.variance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Rows</span>
                      <span>{summaryB.rows - summaryA.rows}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Confirmed appts</span>
                      <span>{summaryB.appts - summaryA.appts}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {!hasSelections ? (
              <div className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                Select two runs to see the diff.
              </div>
            ) : loading ? (
              <div className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                Loading comparison…
              </div>
            ) : (
              <>
                <DiffTable title="Clients" rows={clientDiff} />
                <DiffTable title="Employees" rows={employeeDiff} />
                <DiffTable title="By service date" rows={dateDiff} />
              </>
            )}
          </div>
        </AppLayout>
      </RequireHR>
    </RequireAuth>
  );
}
