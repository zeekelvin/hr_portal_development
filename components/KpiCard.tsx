import React from "react";

type KpiCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

export default function KpiCard({ label, value, helper }: KpiCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-tinash-border/60">
      <div className="text-xs font-semibold uppercase tracking-wide text-tinash-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-tinash-text">{value}</div>
      {helper && (
        <div className="mt-1 text-xs text-tinash-muted">{helper}</div>
      )}
    </div>
  );
}
