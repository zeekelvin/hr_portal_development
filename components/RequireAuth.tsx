// components/RequireAuth.tsx
"use client";

import type { ReactNode } from "react";

/**
 * DEV VERSION – NO AUTH ENFORCEMENT
 *
 * We are disabling auth gating entirely for now
 * so you can keep building the HR system without
 * getting stuck on loaders or redirects.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
