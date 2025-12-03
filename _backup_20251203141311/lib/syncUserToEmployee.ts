// lib/syncUserToEmployee.ts
import { supabase } from "@/lib/supabaseClient";

/**
 * Ensure that there is an employees row linked to the currently logged-in Supabase user.
 * If it already exists, do nothing.
 * If not, create a new employee using user_metadata and email.
 */
export async function ensureEmployeeForCurrentUser() {
  // 1) Get the current user
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr) {
    console.error("ensureEmployeeForCurrentUser: error getting user:", userErr);
    return;
  }

  const user = userData.user;
  if (!user) {
    // No user logged in — nothing to sync
    return;
  }

  // 2) Check if an employee row already exists for this auth_user_id
  const { data: existingEmp, error: existingErr } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingErr && existingErr.code !== "PGRST116") {
    // PGRST116 = no rows returned; that's fine, means no employee yet
    console.error(
      "ensureEmployeeForCurrentUser: error checking existing employee:",
      existingErr
    );
    return;
  }

  if (existingEmp) {
    // Already linked to an employee – nothing to do
    return;
  }

  // 3) Build the employee payload from user_metadata + email
  const meta: any = user.user_metadata || {};

  const firstName =
    meta.first_name || meta.given_name || (meta.full_name || "").split(" ")[0] || "Unknown";

  const lastName =
    meta.last_name ||
    meta.family_name ||
    (meta.full_name || "").split(" ").slice(1).join(" ");

  const fullName = meta.full_name || `${firstName} ${lastName}`.trim();

  // Default role / status – adjust to your Tinash HR semantics
  const defaultRole = meta.role || "Caregiver"; // could be "HR", "Admin", "Caregiver"
  const defaultStatus = "active";

  const payload: Record<string, any> = {
    auth_user_id: user.id,
    email: user.email,
    first_name: firstName,
    last_name: lastName,
    role: defaultRole,
    status: defaultStatus
  };

  // If your employees table has more columns, you can add defaults here, e.g.:
  // payload.phone = meta.phone || null;
  // payload.hire_date = new Date().toISOString().slice(0, 10);

  const { error: insertErr } = await supabase.from("employees").insert(payload);

  if (insertErr) {
    console.error(
      "ensureEmployeeForCurrentUser: error inserting employee:",
      insertErr
    );
  }
}
