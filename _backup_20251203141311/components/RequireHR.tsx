// components/RequireHR.tsx
"use client";

import type { ReactNode } from "react";

/**
 * DEV VERSION – NO HR GATING
 *
 * This bypasses HR/employee role checks completely so
 * pages wrapped in <RequireHR> just render normally.
 *
 * We'll reintroduce real HR-only enforcement once
 * the rest of the app is stable.
 */
export default function RequireHR({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
