"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";

type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type Credential = {
  id: string;
  employee_id: string;
  type: string;
  number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string | null;
};

type CredentialWithName = Credential & {
  employee_name: string;
};

const CRED_TYPES = [
  "HHA_LICENSE",
  "CNA_LICENSE",
  "RN_LICENSE",
  "LPN_LICENSE",
  "CPR",
  "TB",
  "PHYSICAL"
];

export default function CredentialsPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [credentials, setCredentials] = useState<CredentialWithName[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "valid" | "expiring_soon" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | string>("all");
  const [searchName, setSearchName] = useState("");

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [credType, setCredType] = useState("HHA_LICENSE");
  const [credNumber, setCredNumber] = useState("");
  const [credIssueDate, setCredIssueDate] = useState("");
  const [credExpiryDate, setCredExpiryDate] = useState("");
  const [credStatus, setCredStatus] = useState("valid");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
    loadCredentials();
  }, []);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error loading employees:", error);
      return;
    }

    setEmployees((data || []) as EmployeeOption[]);
  }

  async function loadCredentials() {
    const [{ data: creds, error: credErr }, { data: emps, error: empErr }] =
      await Promise.all([
        supabase
          .from("credentials")
          .select("id, employee_id, type, number, issue_date, expiry_date, status")
          .order("expiry_date", { ascending: true }),
        supabase
          .from("employees")
          .select("id, first_name, last_name")
      ]);

    if (credErr) console.error("Error loading credentials:", credErr);
    if (empErr) console.error("Error loading employees:", empErr);

    const empMap = new Map<string, string>();
    (emps || []).forEach((e: any) => {
      empMap.set(e.id, `${e.first_name} ${e.last_name}`);
    });

    const withNames: CredentialWithName[] = (creds || []).map((c: any) => ({
      ...c,
      employee_name: empMap.get(c.employee_id) ?? "Unknown"
    }));

    setCredentials(withNames);
  }

  function resetForm() {
    setEditingId(null);
    setEmployeeId("");
    setCredType("HHA_LICENSE");
    setCredNumber("");
    setCredIssueDate("");
    setCredExpiryDate("");
    setCredStatus("valid");
    setErrorMsg(null);
  }

  function startEdit(c: CredentialWithName) {
    setEditingId(c.id);
    setEmployeeId(c.employee_id);
    setCredType(c.type || "HHA_LICENSE");
    setCredNumber(c.number || "");
    setCredIssueDate(c.issue_date || "");
    setCredExpiryDate(c.expiry_date || "");
    setCredStatus(c.status || "valid");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    if (!employeeId) {
      setErrorMsg("Please select an employee.");
      setSaving(false);
      return;
    }

    const payload = {
      employee_id: employeeId,
      type: credType,
      number: credNumber || null,
      issue_date: credIssueDate || null,
      expiry_date: credExpiryDate || null,
      status: credStatus
    };

    if (editingId) {
      const { error } = await supabase
        .from("credentials")
        .update(payload)
        .eq("id", editingId);

      setSaving(false);

      if (error) {
        console.error("Error updating credential:", error);
        setErrorMsg(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("credentials").insert(payload);
      setSaving(false);

      if (error) {
        console.error("Error creating credential:", error);
        setErrorMsg(error.message);
        return;
      }
    }

    await loadCredentials();
    resetForm();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this credential?")) return;
    const { error } = await supabase.from("credentials").delete().eq("id", id);
    if (error) {
      console.error("Error deleting credential:", error);
      return;
    }
    await loadCredentials();
  }

  const filteredCredentials = useMemo(() => {
    return credentials.filter((c) => {
      if (statusFilter !== "all" && (c.status || "valid") !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && c.type !== typeFilter) {
        return false;
      }
      if (
        searchName.trim() &&
        !c.employee_name.toLowerCase().includes(searchName.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [credentials, statusFilter, typeFilter, searchName]);

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Credentials"
          description="Track license expirations and compliance across all caregivers."
        />

        <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row">
          {/* LEFT: Create / edit credential */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              {editingId ? "Edit Credential" : "Add Credential"}
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Assign licenses and medical clearances to employees and track their expiry dates.
            </p>

            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Employee
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Credential type
                </label>
                <select
                  value={credType}
                  onChange={(e) => setCredType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {CRED_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Number
                </label>
                <input
                  value={credNumber}
                  onChange={(e) => setCredNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Issue date
                  </label>
                  <input
                    type="date"
                    value={credIssueDate}
                    onChange={(e) => setCredIssueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Expiry date
                  </label>
                  <input
                    type="date"
                    value={credExpiryDate}
                    onChange={(e) => setCredExpiryDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  value={credStatus}
                  onChange={(e) => setCredStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="valid">Valid</option>
                  <option value="expiring_soon">Expiring soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600">{errorMsg}</p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Creating..."
                    : editingId
                    ? "Save changes"
                    : "Add credential"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* RIGHT: List + filters */}
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">
                Filters
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as any)
                }
                className="rounded-full border border-slate-300 px-3 py-1"
              >
                <option value="all">All statuses</option>
                <option value="valid">Valid</option>
                <option value="expiring_soon">Expiring soon</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-full border border-slate-300 px-3 py-1"
              >
                <option value="all">All types</option>
                {CRED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                placeholder="Search by employee name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="min-w-[180px] flex-1 rounded-full border border-slate-300 px-3 py-1"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Number</th>
                    <th className="px-3 py-2">Issue</th>
                    <th className="px-3 py-2">Expiry</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredCredentials.map((c) => (
                    <tr key={c.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{c.employee_name}</td>
                      <td className="px-3 py-2">{c.type}</td>
                      <td className="px-3 py-2">{c.number || "—"}</td>
                      <td className="px-3 py-2">{c.issue_date || "—"}</td>
                      <td className="px-3 py-2">{c.expiry_date || "—"}</td>
                      <td className="px-3 py-2">
                        {c.status || "valid"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <button
                          onClick={() => startEdit(c)}
                          className="mr-2 text-sky-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCredentials.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-sm text-slate-500"
                      >
                        No credentials match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}