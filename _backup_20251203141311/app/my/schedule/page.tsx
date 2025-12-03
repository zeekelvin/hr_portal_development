// app/my/schedule/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";

export default function MySchedulePage() {
  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="My Schedule"
          description="View your assigned shifts and coverage calendar."
        />
        <div className="px-6 py-4">
          <p className="text-sm text-slate-500">
            This is a placeholder for the employee schedule view. Later, we’ll
            show all shifts assigned to this employee.
          </p>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
