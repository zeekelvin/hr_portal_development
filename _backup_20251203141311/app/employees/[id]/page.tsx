"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
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
  hire_date: string | null;
};

type Credential = {
  id: string;
  type: string;
  number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string | null;
};

type Incident = {
  id: string;
  type: string | null;
  severity: string | null;
  description: string | null;
  status: string;
  occurred_at: string | null;
};

type EmpTraining = {
  id: string;
  training_name: string;
  status: string;
  assigned_at: string;
  completed_at: string | null;
};

type TrainingOption = {
  id: string;
  name: string;
};

type Shift = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
};

type Tab = "overview" | "credentials" | "incidents" | "training" | "schedule";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("HHA");
  const [status, setStatus] = useState("active");
  const [hireDate, setHireDate] = useState("");

  // Credentials state
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credType, setCredType] = useState("HHA_LICENSE");
  const [credNumber, setCredNumber] = useState("");
  const [credIssueDate, setCredIssueDate] = useState("");
  const [credExpiryDate, setCredExpiryDate] = useState("");
  const [credStatus, setCredStatus] = useState("valid");
  const [savingCredential, setSavingCredential] = useState(false);

  // Incidents state
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incType, setIncType] = useState("Performance");
  const [incSeverity, setIncSeverity] = useState("low");
  const [incDescription, setIncDescription] = useState("");
  const [incStatus, setIncStatus] = useState("open");
  const [incOccurredAt, setIncOccurredAt] = useState("");
  const [savingIncident, setSavingIncident] = useState(false);

  // Training state
  const [trainings, setTrainings] = useState<EmpTraining[]>([]);
  const [trainingOptions, setTrainingOptions] = useState<TrainingOption[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [trainingStatus, setTrainingStatus] = useState("assigned");
  const [savingTraining, setSavingTraining] = useState(false);

  // Shifts state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftStart, setShiftStart] = useState(""); // datetime-local
  const [shiftEnd, setShiftEnd] = useState("");
  const [shiftStatus, setShiftStatus] = useState("scheduled");
  const [shiftNotes, setShiftNotes] = useState("");
  const [savingShift, setSavingShift] = useState(false);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);

      const [
        { data: emp },
        { data: cred },
        { data: inc },
        { data: trn },
        { data: shf },
        { data: trnOptions }
      ] = await Promise.all([
        supabase.from("employees").select("*").eq("id", employeeId).maybeSingle(),
        supabase
          .from("credentials")
          .select("id, type, number, issue_date, expiry_date, status")
          .eq("employee_id", employeeId)
          .order("expiry_date", { ascending: true }),
        supabase
          .from("incidents")
          .select("id, type, severity, description, status, occurred_at")
          .eq("employee_id", employeeId)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("employee_trainings")
          .select(
            "id, status, assigned_at, completed_at, trainings(name)"
          )
          .eq("employee_id", employeeId)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("shifts")
          .select("id, start_time, end_time, status, notes")
          .eq("employee_id", employeeId)
          .order("start_time", { ascending: true }),
        supabase.from("trainings").select("id, name").order("name", { ascending: true })
      ]);

      if (emp) {
        const e = emp as Employee;
        setEmployee(e);
        setFirstName(e.first_name);
        setLastName(e.last_name);
        setEmail(e.email || "");
        setPhone(e.phone || "");
        setLocation(e.location || "");
        setRole(e.role);
        setStatus(e.status);
        setHireDate(e.hire_date || "");
      }

      setCredentials((cred || []) as Credential[]);
      setIncidents((inc || []) as Incident[]);
      setTrainings(
        (trn || []).map((row: any) => ({
          id: row.id,
          status: row.status,
          assigned_at: row.assigned_at,
          completed_at: row.completed_at,
          training_name: row.trainings?.name ?? ""
        })) as EmpTraining[]
      );
      setShifts((shf || []) as Shift[]);
      setTrainingOptions((trnOptions || []) as TrainingOption[]);

      setLoading(false);
    }

    loadAll();
  }, [employeeId]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!employee) return;
    setSavingProfile(true);

    const { error } = await supabase
      .from("employees")
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        location: location || null,
        role,
        status,
        hire_date: hireDate || null
      })
      .eq("id", employee.id);

    setSavingProfile(false);

    if (!error) {
      setEmployee({
        ...employee,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        location: location || null,
        role,
        status,
        hire_date: hireDate || null
      });
    } else {
      console.error("Error updating profile:", error);
    }
  }

  async function handleAddCredential(e: FormEvent) {
    e.preventDefault();
    setSavingCredential(true);

    const { data, error } = await supabase
      .from("credentials")
      .insert({
        employee_id: employeeId,
        type: credType,
        number: credNumber || null,
        issue_date: credIssueDate || null,
        expiry_date: credExpiryDate || null,
        status: credStatus
      })
      .select();

    setSavingCredential(false);

    if (error) {
      console.error("Error adding credential:", error);
      return;
    }

    if (data && data[0]) {
      setCredentials(prev => [...prev, data[0] as Credential]);
      setCredNumber("");
      setCredIssueDate("");
      setCredExpiryDate("");
    }
  }

  async function handleDeleteCredential(id: string) {
    const { error } = await supabase.from("credentials").delete().eq("id", id);
    if (error) {
      console.error("Error deleting credential:", error);
      return;
    }
    setCredentials(prev => prev.filter(c => c.id !== id));
  }

  async function handleAddIncident(e: FormEvent) {
    e.preventDefault();
    setSavingIncident(true);

    const occurredAtIso = incOccurredAt
      ? new Date(incOccurredAt).toISOString()
      : null;

    const { data, error } = await supabase
      .from("incidents")
      .insert({
        employee_id: employeeId,
        type: incType,
        severity: incSeverity,
        description: incDescription || null,
        status: incStatus,
        occurred_at: occurredAtIso
      })
      .select();

    setSavingIncident(false);

    if (error) {
      console.error("Error adding incident:", error);
      return;
    }

    if (data && data[0]) {
      setIncidents(prev => [data[0] as Incident, ...prev]);
      setIncDescription("");
      setIncOccurredAt("");
      setIncStatus("open");
    }
  }

  async function handleAssignTraining(e: FormEvent) {
    e.preventDefault();
    if (!selectedTrainingId) return;
    setSavingTraining(true);

    const { data, error } = await supabase
      .from("employee_trainings")
      .insert({
        employee_id: employeeId,
        training_id: selectedTrainingId,
        status: trainingStatus
      })
      .select("id, status, assigned_at, completed_at, trainings(name)");

    setSavingTraining(false);

    if (error) {
      console.error("Error assigning training:", error);
      return;
    }

    if (data && data[0]) {
      const row: any = data[0];
      const newTraining: EmpTraining = {
        id: row.id,
        status: row.status,
        assigned_at: row.assigned_at,
        completed_at: row.completed_at,
        training_name: row.trainings?.name ?? ""
      };
      setTrainings(prev => [newTraining, ...prev]);
      setSelectedTrainingId("");
      setTrainingStatus("assigned");
    }
  }

  async function handleAddShift(e: FormEvent) {
    e.preventDefault();
    if (!shiftStart || !shiftEnd) return;

    setSavingShift(true);

    const { data, error } = await supabase
      .from("shifts")
      .insert({
        employee_id: employeeId,
        start_time: new Date(shiftStart).toISOString(),
        end_time: new Date(shiftEnd).toISOString(),
        status: shiftStatus,
        notes: shiftNotes || null
      })
      .select();

    setSavingShift(false);

    if (error) {
      console.error("Error adding shift:", error);
      return;
    }

    if (data && data[0]) {
      setShifts(prev => [...prev, data[0] as Shift]);
      setShiftStart("");
      setShiftEnd("");
      setShiftStatus("scheduled");
      setShiftNotes("");
    }
  }

  function renderTab() {
    if (!employee) {
      return (
        <p className="text-sm text-slate-500">Loading employee details...</p>
      );
    }

    switch (tab) {
      case "overview":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2"
            >
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Profile
              </h2>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    First name
                  </label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Last name
                  </label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Phone
                  </label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Location
                  </label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
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
                <div>
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Hire date
                  </label>
                  <input
                    type="date"
                    value={hireDate || ""}
                    onChange={e => setHireDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="mt-4 rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Snapshot
              </h2>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>Credentials: {credentials.length}</li>
                <li>Incidents: {incidents.length}</li>
                <li>Trainings assigned: {trainings.length}</li>
                <li>Upcoming shifts: {shifts.length}</li>
              </ul>
            </div>
          </div>
        );

      case "credentials":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <form
              onSubmit={handleAddCredential}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Add Credential
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Type
                  </label>
                  <select
                    value={credType}
                    onChange={e => setCredType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="HHA_LICENSE">HHA License</option>
                    <option value="CNA_LICENSE">CNA License</option>
                    <option value="CPR">CPR</option>
                    <option value="TB">TB Test</option>
                    <option value="PHYSICAL">Physical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Number
                  </label>
                  <input
                    value={credNumber}
                    onChange={e => setCredNumber(e.target.value)}
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
                      onChange={e => setCredIssueDate(e.target.value)}
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
                      onChange={e => setCredExpiryDate(e.target.value)}
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
                    onChange={e => setCredStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="valid">Valid</option>
                    <option value="expiring_soon">Expiring soon</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingCredential}
                  className="mt-2 w-full rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingCredential ? "Saving..." : "Add Credential"}
                </button>
              </div>
            </form>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Credentials
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Number</th>
                    <th className="px-3 py-2">Issue</th>
                    <th className="px-3 py-2">Expiry</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map(c => (
                    <tr key={c.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{c.type}</td>
                      <td className="px-3 py-2">{c.number || "—"}</td>
                      <td className="px-3 py-2">{c.issue_date || "—"}</td>
                      <td className="px-3 py-2">{c.expiry_date || "—"}</td>
                      <td className="px-3 py-2">
                        {c.status || "valid"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDeleteCredential(c.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {credentials.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-sm text-slate-500"
                      >
                        No credentials on file yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "incidents":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <form
              onSubmit={handleAddIncident}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Log Incident
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Type
                  </label>
                  <input
                    value={incType}
                    onChange={e => setIncType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Severity
                  </label>
                  <select
                    value={incSeverity}
                    onChange={e => setIncSeverity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Occurred at
                  </label>
                  <input
                    type="datetime-local"
                    value={incOccurredAt}
                    onChange={e => setIncOccurredAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    value={incStatus}
                    onChange={e => setIncStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Description
                  </label>
                  <textarea
                    value={incDescription}
                    onChange={e => setIncDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingIncident}
                  className="mt-2 w-full rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingIncident ? "Saving..." : "Log Incident"}
                </button>
              </div>
            </form>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Incidents
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Occurred</th>
                    <th className="px-3 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(i => (
                    <tr key={i.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{i.type || "—"}</td>
                      <td className="px-3 py-2">{i.severity || "—"}</td>
                      <td className="px-3 py-2">{i.status}</td>
                      <td className="px-3 py-2">
                        {i.occurred_at
                          ? new Date(i.occurred_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-xs">
                        <span className="line-clamp-2">
                          {i.description || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {incidents.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-4 text-center text-sm text-slate-500"
                      >
                        No incidents logged for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "training":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <form
              onSubmit={handleAssignTraining}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Assign Training
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Training
                  </label>
                  <select
                    value={selectedTrainingId}
                    onChange={e => setSelectedTrainingId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select training</option>
                    {trainingOptions.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    value={trainingStatus}
                    onChange={e => setTrainingStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="assigned">Assigned</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingTraining}
                  className="mt-2 w-full rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingTraining ? "Assigning..." : "Assign Training"}
                </button>
              </div>
            </form>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Training History
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Training</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Assigned</th>
                    <th className="px-3 py-2">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {trainings.map(t => (
                    <tr key={t.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{t.training_name}</td>
                      <td className="px-3 py-2">{t.status}</td>
                      <td className="px-3 py-2">
                        {new Date(t.assigned_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        {t.completed_at
                          ? new Date(t.completed_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {trainings.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-sm text-slate-500"
                      >
                        No trainings assigned yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "schedule":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <form
              onSubmit={handleAddShift}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Add Shift
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={shiftStart}
                    onChange={e => setShiftStart(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={shiftEnd}
                    onChange={e => setShiftEnd(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    value={shiftStatus}
                    onChange={e => setShiftStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Notes
                  </label>
                  <textarea
                    value={shiftNotes}
                    onChange={e => setShiftNotes(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingShift}
                  className="mt-2 w-full rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingShift ? "Saving..." : "Add Shift"}
                </button>
              </div>
            </form>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Upcoming & Past Shifts
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(s => (
                    <tr key={s.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {new Date(s.start_time).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {new Date(s.end_time).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{s.status}</td>
                      <td className="px-3 py-2 max-w-xs">
                        {s.notes || "—"}
                      </td>
                    </tr>
                  ))}
                  {shifts.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-sm text-slate-500"
                      >
                        No shifts scheduled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  }

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title={
            employee
              ? `${employee.first_name} ${employee.last_name}`
              : "Employee Detail"
          }
          description={employee ? `${employee.role} • ${employee.status}` : ""}
        />
        <div className="flex-1 px-6 py-4">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-sky-700 hover:underline"
          >
            ← Back to employees
          </button>

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {(
              [
                ["overview", "Overview"],
                ["credentials", "Credentials"],
                ["incidents", "Incidents"],
                ["training", "Training"],
                ["schedule", "Schedule"]
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`rounded-full px-3 py-1 ${
                  tab === value
                    ? "bg-sky-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            renderTab()
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
