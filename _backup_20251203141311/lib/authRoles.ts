// lib/authRoles.ts
import type { User } from "@supabase/supabase-js";

export type AppRole = "hr" | "employee";

export function getUserRole(user: User | null): AppRole | null {
  if (!user) return null;
  const email = user.email ?? "";
  if (email.endsWith("@tinashhomecareservices.com")) {
    return "hr";
  }
  return "employee";
}