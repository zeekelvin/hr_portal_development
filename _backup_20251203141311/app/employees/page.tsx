// app/employees/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
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

type Credential = {
  id: string;
  name: string | null;
  type?: string | null;
  status: string | null;
  expiry_date: string | null;
};

type EmployeeTraining = {
  id: string;
  status: string | null;
  training_id: string | null;
  training_name: string | null;
};

type Incident = {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
};

type Shift = {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
};

type TrainingOption = {
  id: string;
  name: string;
};

const TRAINING_STATUSES = ["assigned", "in_progress", "completed"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Employee form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("HHA");
  const [status, setStatus] = useState("active");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // Selected employee
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );

  // Related data
  const [credLoading, setCredLoading] = useState(false);
  const [trainLoading, setTrainLoading] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [trainings, setTrainings] = useState<EmployeeTraining[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Global training catalog
  const [trainingOptions, setTrainingOptions] = useState<TrainingOption[]>([]);

  // Assign forms
  // Credentials
  const [newCredName, setNewCredName] = useState("");
  const [newCredStatus, setNewCredStatus] = useState("valid");
  const [newCredExpiry, setNewCredExpiry] = useState("");

  // Training
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("");
  const [newTrainingStatus, setNewTrainingStatus] = useState("assigned");

  // Incident
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentDescription, setNewIncidentDescription] = useState("");
  const [newIncidentStatus, setNewIncidentStatus] = useState("open");

  // Shift
  const [newShiftStart, setNewShiftStart] = useState("");
  const [newShiftEnd, setNewShiftEnd] = useState("");
  const [newShiftStatus, setNewShiftStatus] = useState("scheduled");

  useEffect(() => {
    loadEmployees();
    loadTrainingOptions();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, first_name, last_name, role, status, email, phone, location"
      )
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Error loading employees:", error);
      setErrorMsg(error.message);
      setEmployees([]);
    } else {
      setEmployees((data || []) as Employee[]);
    }

    setLoading(false);
  }

  async function loadTrainingOptions() {
    const { data, error } = await supabase
      .from("trainings")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading training options:", error);
      setTrainingOptions([]);
    } else {
      setTrainingOptions(
        (data || []).map((t: any) => ({
          id: t.id,
          name: t.name as string,
        }))
      );
    }
  }

  function resetEmployeeForm() {
    setEditingId(null);
    setSelectedEmployeeId(null);
    setFirstName("");
    setLastName("");
    setRole("HHA");
    setStatus("active");
    setEmail("");
    setPhone("");
    setLocation("");
    setErrorMsg(null);

    setCredentials([]);
    setTrainings([]);
    setIncidents([]);
    setShifts([]);
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setSelectedEmployeeId(emp.id);

    setFirstName(emp.first_name);
    setLastName(emp.last_name);
    setRole(emp.role);
    setStatus(emp.status);
    setEmail(emp.email || "");
    setPhone(emp.phone || "");
    setLocation(emp.location || "");
    setErrorMsg(null);

    loadRelatedData(emp.id);
  }

  async function handleEmployeeSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingEmployee(true);
    setErrorMsg(null);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role,
      status,
      email: email.trim() || null,
      phone: phone.trim() || null,
      location: location.trim() || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          console.error("Error updating employee:", error);
          setErrorMsg(error.message);
        } else {
          await loadEmployees();
        }
      } else {
        const { error } = await supabase
          .from("employees")
          .insert(payload);

        if (error) {
          console.error("Error creating employee:", error);
          setErrorMsg(error.message);
        } else {
          await loadEmployees();
        }
      }
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleDeleteEmployee() {
    if (!editingId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this employee? This cannot be undone."
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", editingId);

    if (error) {
      console.error("Error deleting employee:", error);
      alert(
        error.message ||
          "Failed to delete employee. Check foreign key constraints."
      );
      return;
    }

    await loadEmployees();
    resetEmployeeForm();
  }

  // ---- Related loaders ----
  async function loadRelatedData(employeeId: string) {
    loadCredentials(employeeId);
    loadEmployeeTrainings(employeeId);
    loadIncidents(employeeId);
    loadShifts(employeeId);
  }

  async function loadCredentials(employeeId: string) {
    setCredLoading(true);
    const { data, error } = await supabase
      .from("credentials")
      .select("id, name, type, status, expiry_date")
      .eq("employee_id", employeeId)
      .order("expiry_date", { ascending: true });

    if (error) {
      console.error("Error loading credentials:", error);
      setCredentials([]);
    } else {
      setCredentials((data || []) as Credential[]);
    }
    setCredLoading(false);
  }

  async function loadEmployeeTrainings(employeeId: string) {
    setTrainLoading(true);
    const { data, error } = await supabase
      .from("employee_trainings")
      .select("id, status, training_id, trainings ( name )")
      .eq("employee_id", employeeId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error loading employee trainings:", error);
      setTrainings([]);
    } else {
      const rows = (data || []) as any[];
      setTrainings(
        rows.map((r) => ({
          id: r.id as string,
          status: r.status as string | null,
          training_id: r.training_id as string | null,
          training_name: r.trainings?.name ?? null,
        }))
      );
    }
    setTrainLoading(false);
  }

  async function loadIncidents(employeeId: string) {
    setIncidentLoading(true);
    const { data, error } = await supabase
      .from("incidents")
      .select("id, title, description, status")
      .eq("employee_id", employeeId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error loading incidents:", error);
      setIncidents([]);
    } else {
      setIncidents((data || []) as Incident[]);
    }
    setIncidentLoading(false);
  }

  async function loadShifts(employeeId: string) {
    setShiftLoading(true);
    const { data, error } = await supabase
      .from("shifts")
      .select("id, start_time, end_time, status")
      .eq("employee_id", employeeId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error loading shifts:", error);
      setShifts([]);
    } else {
      setShifts((data || []) as Shift[]);
    }
    setShiftLoading(false);
  }

  // ---- Assign handlers ----
  async function handleAssignCredential(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert("Select an employee first.");
      return;
    }
    if (!newCredName.trim()) {
      alert("Credential name is required.");
      return;
    }

    const label = newCredName.trim();

    const payload: any = {
      employee_id: selectedEmployeeId,
      name: label,
      type: label, // satisfy NOT NULL "type" if present
      status: newCredStatus,
      expiry_date: newCredExpiry || null,
    };

    const { error } = await supabase
      .from("credentials")
      .insert(payload);

    if (error) {
      console.error("Error assigning credential:", error);
      alert(error.message);
      return;
    }

    setNewCredName("");
    setNewCredStatus("valid");
    setNewCredExpiry("");
    await loadCredentials(selectedEmployeeId);
  }

  async function handleAssignTraining(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert("Select an employee first.");
      return;
    }
    if (!selectedTrainingId) {
      alert("Select a training from the list.");
      return;
    }

    const payload: any = {
      employee_id: selectedEmployeeId,
      training_id: selectedTrainingId,
      status: newTrainingStatus,
    };

    const { error } = await supabase
      .from("employee_trainings")
      .insert(payload);

    if (error) {
      console.error("Error assigning training:", error);
      alert(error.message);
      return;
    }

    setSelectedTrainingId("");
    setNewTrainingStatus("assigned");
    await loadEmployeeTrainings(selectedEmployeeId);
  }

  async function handleAssignIncident(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert("Select an employee first.");
      return;
    }
    if (!newIncidentTitle.trim()) {
      alert("Incident title is required.");
      return;
    }

    const payload: any = {
      employee_id: selectedEmployeeId,
      title: newIncidentTitle.trim(),
      description: newIncidentDescription.trim() || null,
      status: newIncidentStatus,
    };

    const { error } = await supabase
      .from("incidents")
      .insert(payload);

    if (error) {
      console.error("Error creating incident:", error);
      alert(error.message);
      return;
    }

    setNewIncidentTitle("");
    setNewIncidentDescription("");
    setNewIncidentStatus("open");
    await loadIncidents(selectedEmployeeId);
  }

  async function handleAssignShift(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert("Select an employee first.");
      return;
    }
    if (!newShiftStart || !newShiftEnd) {
      alert("Start and end time are required.");
      return;
    }

    const payload: any = {
      employee_id: selectedEmployeeId,
      start_time: newShiftStart,
      end_time: newShiftEnd,
      status: newShiftStatus,
    };

    const { error } = await supabase.from("shifts").insert(payload);

    if (error) {
      console.error("Error creating shift:", error);
      alert(error.message);
      return;
    }

    setNewShiftStart("");
    setNewShiftEnd("");
    setNewShiftStatus("scheduled");
    await loadShifts(selectedEmployeeId);
  }

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Employees"
          description="Add caregivers and manage all related HR records from one screen."
        />

        <div className="px-6 py-4 space-y-6">
          {/* FORM: Add / Edit Employee */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {editingId ? "Edit employee" : "Add employee"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {editingId
                ? "Update caregiver details and use the panels below to manage credentials, training, incidents, and shifts."
                : "Create a new caregiver or staff profile."}
            </p>

            {errorMsg && (
              <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
            )}

            <form
              onSubmit={handleEmployeeSubmit}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="HHA">HHA</option>
                  <option value="LPN">LPN</option>
                  <option value="RN">RN</option>
                  <option value="Scheduler">Scheduler</option>
                  <option value="HR">HR</option>
                  <option value="Admin">Admin</option>
                  <option value="CHRO">CHRO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="applicant">Applicant</option>
                  <option value="onboarding">Onboarding</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="mt-2 flex gap-2 md:col-span-2">
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingEmployee
                    ? editingId
                      ? "Saving..."
                      : "Creating..."
                    : editingId
                    ? "Save changes"
                    : "Create employee"}
                </button>
                {editingId && (
                  <>
                    <button
                      type="button"
                      onClick={resetEmployeeForm}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteEmployee}
                      className="rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete employee
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>

          {/* TABLE: Employees */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Employees
              </h2>
              <p className="text-xs text-slate-500">
                Click a row to edit the profile and load related records.
              </p>
            </div>

            {loading ? (
              <p className="mt-3 text-sm text-slate-500">
                Loading employees...
              </p>
            ) : employees.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No employees found. Use the form above to add one.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
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
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => startEdit(emp)}
                        className="cursor-pointer border-b text-xs hover:bg-slate-50"
                      >
                        <td className="px-3 py-2">
                          {emp.first_name} {emp.last_name}
                        </td>
                        <td className="px-3 py-2">{emp.role}</td>
                        <td className="px-3 py-2">{emp.status}</td>
                        <td className="px-3 py-2">{emp.email || "—"}</td>
                        <td className="px-3 py-2">{emp.phone || "—"}</td>
                        <td className="px-3 py-2">{emp.location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RELATED SECTION */}
          {editingId && selectedEmployeeId && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Related to this employee
              </h2>

              {/* Credentials + Training */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Credentials */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Credentials
                  </h3>
                  {credLoading ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Loading credentials...
                    </p>
                  ) : credentials.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      No credentials yet.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {credentials.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1"
                        >
                          <div>
                            <div className="font-semibold">
                              {c.name || c.type || "Credential"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Status: {c.status ?? "—"}
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Exp:{" "}
                            {c.expiry_date
                              ? new Date(
                                  c.expiry_date
                                ).toLocaleDateString()
                              : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    onSubmit={handleAssignCredential}
                    className="mt-3 space-y-2 text-xs"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Credential name
                      </label>
                      <input
                        type="text"
                        value={newCredName}
                        onChange={(e) => setNewCredName(e.target.value)}
                        placeholder="e.g. HHA License, CPR"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Status
                        </label>
                        <select
                          value={newCredStatus}
                          onChange={(e) => setNewCredStatus(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="valid">Valid</option>
                          <option value="expiring">Expiring</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Expiry date
                        </label>
                        <input
                          type="date"
                          value={newCredExpiry}
                          onChange={(e) => setNewCredExpiry(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="mt-2 rounded-xl bg-sky-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-800"
                    >
                      Add credential
                    </button>
                  </form>
                </div>

                {/* Training */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Training
                  </h3>

                  {/* Training Library */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600">
                      Training Library (all agency trainings)
                    </div>
                    {trainingOptions.length === 0 ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        No trainings defined yet. Add some in the Training
                        Catalog.
                      </p>
                    ) : (
                      <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[11px] text-slate-700 rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                        {trainingOptions.map((opt) => (
                          <li key={opt.id} className="flex justify-between">
                            <span>{opt.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Assigned Training */}
                  <div>
                    <div className="mt-2 text-[11px] font-semibold text-slate-600">
                      Assigned Training
                    </div>
                    {trainLoading ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Loading training assignments...
                      </p>
                    ) : trainings.length === 0 ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        No training assigned yet.
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-xs text-slate-700">
                        {trainings.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1"
                          >
                            <div>
                              <div className="font-semibold">
                                {t.training_name ||
                                  (t.training_id
                                    ? `Training #${t.training_id}`
                                    : "Training")}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Status: {t.status ?? "—"}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Assign form */}
                  <form
                    onSubmit={handleAssignTraining}
                    className="mt-2 space-y-2 text-xs"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Training
                      </label>
                      <select
                        value={selectedTrainingId}
                        onChange={(e) => setSelectedTrainingId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="">Select training</option>
                        {trainingOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Status
                      </label>
                      <select
                        value={newTrainingStatus}
                        onChange={(e) => setNewTrainingStatus(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      >
                        {TRAINING_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="mt-2 rounded-xl bg-sky-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-800"
                    >
                      Assign training
                    </button>
                  </form>
                </div>
              </div>

              {/* Incidents + Shifts */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Incidents */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Incidents
                  </h3>
                  {incidentLoading ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Loading incidents...
                    </p>
                  ) : incidents.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      No incidents recorded.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {incidents.map((i) => (
                        <li
                          key={i.id}
                          className="rounded-lg bg-slate-50 px-2 py-2"
                        >
                          <div className="font-semibold">
                            {i.title || `Incident #${i.id}`}
                          </div>
                          {i.description && (
                            <div className="mt-1 text-[11px] text-slate-600">
                              {i.description}
                            </div>
                          )}
                          <div className="mt-1 text-[11px] text-slate-500">
                            Status: {i.status ?? "—"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    onSubmit={handleAssignIncident}
                    className="mt-3 space-y-2 text-xs"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Incident title
                      </label>
                      <input
                        type="text"
                        value={newIncidentTitle}
                        onChange={(e) => setNewIncidentTitle(e.target.value)}
                        placeholder="e.g. Client fall, late arrival"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Description
                      </label>
                      <textarea
                        value={newIncidentDescription}
                        onChange={(e) =>
                          setNewIncidentDescription(e.target.value)
                        }
                        placeholder="Add details: what happened, when, where, who was involved..."
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Status
                      </label>
                      <select
                        value={newIncidentStatus}
                        onChange={(e) => setNewIncidentStatus(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="open">Open</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="mt-2 rounded-xl bg-sky-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-800"
                    >
                      Log incident
                    </button>
                  </form>
                </div>

                {/* Shifts / Scheduling */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Shifts / Scheduling
                  </h3>
                  {shiftLoading ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Loading shifts...
                    </p>
                  ) : shifts.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      No shifts scheduled.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {shifts.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1"
                        >
                          <div>
                            <div>
                              {new Date(
                                s.start_time
                              ).toLocaleString()}{" "}
                              -{" "}
                              {new Date(
                                s.end_time
                              ).toLocaleString()}
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {s.status ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    onSubmit={handleAssignShift}
                    className="mt-3 space-y-2 text-xs"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Start time
                      </label>
                      <input
                        type="datetime-local"
                        value={newShiftStart}
                        onChange={(e) => setNewShiftStart(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        End time
                      </label>
                      <input
                        type="datetime-local"
                        value={newShiftEnd}
                        onChange={(e) => setNewShiftEnd(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Status
                      </label>
                      <select
                        value={newShiftStatus}
                        onChange={(e) => setNewShiftStatus(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="filled">Filled</option>
                        <option value="canceled">Canceled</option>
                        <option value="open">Open</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="mt-2 rounded-xl bg-sky-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-800"
                    >
                      Assign shift
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
