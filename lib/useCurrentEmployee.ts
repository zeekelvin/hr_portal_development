// lib/useCurrentEmployee.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type CurrentEmployee = {
  id: string;
  auth_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;   // 'HR', 'Admin', 'CHRO', 'Caregiver', etc.
  status: string | null;
  phone: string | null;
  location: string | null;
};

export function useCurrentEmployee() {
  const [employee, setEmployee] = useState<CurrentEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (isMounted) {
          setEmployee(null);
          setLoading(false);
        }
        return;
      }

      // Because of RLS + auth_user_id, this will only return the current user's employee row
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, auth_user_id, email, first_name, last_name, role, status, phone, location"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("useCurrentEmployee: error loading employee:", error);
        if (isMounted) {
          setError(error.message);
        }
      }

      if (isMounted) {
        setEmployee((data as any) || null);
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { employee, loading, error };
}
