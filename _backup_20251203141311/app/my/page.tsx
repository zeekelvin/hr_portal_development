// app/my/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import { useCurrentEmployee } from "@/lib/useCurrentEmployee";

export default function MyProfilePage() {
  const { employee, loading, error } = useCurrentEmployee();

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="My Profile"
          description="View and update your basic employee information."
        />

        <div className="px-6 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading your profile...</p>
          ) : error ? (
            <p className="text-sm text-red-600">
              Unable to load profile: {error}
            </p>
          ) : !employee ? (
            <p className="text-sm text-slate-500">
              No employee record is linked to this login yet.
            </p>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-sm">
              <p>
                <span className="font-semibold">Name:</span>{" "}
                {employee.first_name} {employee.last_name}
              </p>
              <p>
                <span className="font-semibold">Role:</span> {employee.role}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {employee.status}
              </p>
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {employee.email || "—"}
              </p>
              <p>
                <span className="font-semibold">Phone:</span>{" "}
                {employee.phone || "—"}
              </p>
              <p>
                <span className="font-semibold">Location:</span>{" "}
                {employee.location || "—"}
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
