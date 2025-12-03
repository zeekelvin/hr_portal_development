"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  email: string | null;
  phone: string | null;
  location: string | null;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("HHA");
  const [status, setStatus] = useState("active");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, first_name, last_name, role, status, email, phone, location"
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEmployees(data as Employee[]);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const { error } = await supabase.from("employees").insert({
      first_name: firstName,
      last_name: lastName,
      role,
      status,
      email: email || null,
      phone: phone || null,
      location: location || null
    });

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // reset form
    setFirstName("");
    setLastName("");
    setRole("HHA");
    setStatus("active");
    setEmail("");
    setPhone("");
    setLocation("");

    await loadEmployees();
  }

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Employees"
          description="Add new caregivers and view your workforce."
        />
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row">
          {/* LEFT: Add employee form */}
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              Add Employee
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Location
                </label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="HHA">HHA</option>
                    <option value="CNA">CNA</option>
                    <option value="RN">RN</option>
                    <option value="LPN">LPN</option>
                    <option value="Office Staff">Office Staff</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </form>

          {/* RIGHT: Employee list */}
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Employees ({employees.length})
              </h2>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="text-sky-700 hover:underline"
                      >
                        {emp.first_name} {emp.last_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{emp.role}</td>
                    <td className="px-3 py-2">{emp.status}</td>
                    <td className="px-3 py-2">
                      {emp.email || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {emp.phone || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {emp.location || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-sm text-slate-500"
                    >
                      No employees yet. Add the first Tinash caregiver.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}