// app/my/credentials/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";

export default function MyCredentialsPage() {
  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="My Credentials"
          description="View your licenses, certifications, and expiration dates."
        />
        <div className="px-6 py-4">
          <p className="text-sm text-slate-500">
            This is a placeholder for the employee credentials view. Later, we’ll
            pull all credentials linked to the logged-in employee.
          </p>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
