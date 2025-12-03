"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import RequireHR from "@/components/RequireHR";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";

type Mode = "combined" | "dual";

type IngestResult = {
  runId: string;
  summary: {
    totalCarecentaHours: number;
    totalHhaHours: number;
    varianceHours: number;
    variancePercent: number | null;
    rowCount: number;
  };
};

export default function ReconciliationUploadPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("combined");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [combinedFile, setCombinedFile] = useState<File | null>(null);
  const [careFile, setCareFile] = useState<File | null>(null);
  const [hhaFile, setHhaFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!periodStart || !periodEnd) {
      setError("Please select a billing period start and end date.");
      return;
    }

    if (mode === "combined" && !combinedFile) {
      setError("Please upload a combined CareCenta + HHAeX file.");
      return;
    }

    if (mode === "dual" && (!careFile || !hhaFile)) {
      setError("Please upload both CareCenta and HHAeX files.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("period_start", periodStart);
      formData.append("period_end", periodEnd);

      if (mode === "combined" && combinedFile) {
        formData.append("combined_file", combinedFile);
      } else if (mode === "dual" && careFile && hhaFile) {
        formData.append("carecenta_file", careFile);
        formData.append("hha_file", hhaFile);
      }

      const res = await fetch("/api/reconciliation/ingest", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let body: any = null;
        try {
          body = await res.json();
        } catch {
          // ignore
        }
        console.error("Upload error", body || (await res.text()));
        setError(
          body?.error ||
            "Failed to process reconciliation file. Please confirm format and try again."
        );
        return;
      }

      const json = (await res.json()) as IngestResult;
      setResult(json);
    } catch (err) {
      console.error("Unexpected error uploading reconciliation file", err);
      setError("Unexpected error while uploading file. Check console logs.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoToDashboard() {
    router.push("/reconciliation");
  }

  return (
    <RequireAuth>
      <RequireHR>
        <AppLayout>
          <Topbar
            title="New reconciliation upload"
            subtitle="Ingest CareCenta and HHAeX exports to generate a bi-weekly hours reconciliation run."
          />

          <div className="px-6 py-4 space-y-6">
            {/* Help / instructions */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                How this reconciliation upload works
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <span className="font-semibold">Combined mode</span> – upload
                  a single file where each row has{" "}
                  <span className="font-mono">
                    Client, CareCenta hours, HHAeX hours
                  </span>{" "}
                  and (optionally) <span className="font-mono"># of Appts</span>.
                </li>
                <li>
                  <span className="font-semibold">Dual mode</span> – upload
                  separate CareCenta and HHAeX exports. The system will align
                  rows by client / employee / service date.
                </li>
                <li>
                  All rows are stored as a{" "}
                  <span className="font-semibold">reconciliation run</span> so
                  you can switch between periods later in the reconciliation
                  dashboard.
                </li>
              </ul>
            </div>

            {/* Upload form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 text-sm"
            >
              {/* Period selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Billing period start
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Billing period end
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Mode selector */}
              <div>
                <p className="text-xs font-medium text-slate-700">
                  Source file mode
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      value="combined"
                      checked={mode === "combined"}
                      onChange={() => setMode("combined")}
                    />
                    <span>
                      <span className="font-semibold">Combined file</span> – one
                      file with both CareCenta + HHA hours.
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      value="dual"
                      checked={mode === "dual"}
                      onChange={() => setMode("dual")}
                    />
                    <span>
                      <span className="font-semibold">Dual files</span> – one
                      file for CareCenta, one for HHAeX.
                    </span>
                  </label>
                </div>
              </div>

              {/* File inputs */}
              {mode === "combined" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Combined CareCenta + HHAeX file
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="mt-1 block w-full text-xs"
                    onChange={(e) =>
                      setCombinedFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Use the bi-weekly export where each client row includes
                    CareCenta hours and HHAeX hours side by side (like the EVV
                    summary you shared).
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      CareCenta export
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="mt-1 block w-full text-xs"
                      onChange={(e) =>
                        setCareFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Export of visits / hours from CareCenta for the selected
                      period.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      HHAeX export
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="mt-1 block w-full text-xs"
                      onChange={(e) =>
                        setHhaFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Matching period export from HHAeX with EVV hours.
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg bg-tinash-navy px-4 py-2 text-xs font-semibold text-white hover:bg-tinash-navy/90 disabled:opacity-60"
                >
                  {submitting ? "Processing..." : "Create reconciliation run"}
                </button>

                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to reconciliation dashboard
                </button>
              </div>

              {/* Result summary */}
              {result && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
                  <p className="font-semibold">
                    Reconciliation run created successfully.
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">
                      CareCenta hours (filtered file):
                    </span>{" "}
                    {result.summary.totalCarecentaHours.toFixed(2)} hrs
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">
                      HHAeX hours (filtered file):
                    </span>{" "}
                    {result.summary.totalHhaHours.toFixed(2)} hrs
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Variance:</span>{" "}
                    {result.summary.varianceHours.toFixed(2)} hrs{" "}
                    {result.summary.variancePercent !== null &&
                      `(${result.summary.variancePercent.toFixed(1)}%)`}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Rows ingested:</span>{" "}
                    {result.summary.rowCount}
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleGoToDashboard}
                      className="inline-flex items-center rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-800"
                    >
                      View this run in reconciliation dashboard
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </AppLayout>
      </RequireHR>
    </RequireAuth>
  );
}
