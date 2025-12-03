// components/Topbar.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentEmployee } from "@/lib/useCurrentEmployee";

type TopbarProps = {
  title: string;
  description?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

type CurrentUser = {
  email: string | null;
  fullName: string | null;
};

const HR_ROLES = ["hr", "admin", "chro", "scheduler", "manager"];

export default function Topbar({
  title,
  description,
  subtitle,
  rightSlot,
}: TopbarProps) {
  const { employee } = useCurrentEmployee();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        setUser(null);
        return;
      }
      const meta = (u.user_metadata || {}) as any;
      setUser({
        email: u.email ?? null,
        fullName: meta.full_name ?? null,
      });
    }
    loadUser();
  }, []);

  const email = user?.email ?? "";
  const role = (employee?.role || "").toString().toLowerCase();
  const isTinashStaff = email.endsWith("@tinashhomecareservices.com");
  const isHRRole = HR_ROLES.includes(role);

  let rightLabel = "";
  if (isTinashStaff || isHRRole) {
    if (role === "chro") {
      rightLabel = "CHRO • Signed in";
    } else {
      rightLabel = "Admin • Signed in";
    }
  } else if (user) {
    rightLabel = "User • Signed in";
  }

  return (
    <header className="flex items-center justify-between border-b border-tinash-border bg-white px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-tinash-text">{title}</h1>
        {(description || subtitle) && (
          <p className="text-sm text-tinash-muted">
            {description || subtitle}
          </p>
        )}
      </div>
      {(rightSlot || rightLabel) && (
        <div className="text-sm text-tinash-muted">
          {rightSlot ?? rightLabel}
        </div>
      )}
    </header>
  );
}
