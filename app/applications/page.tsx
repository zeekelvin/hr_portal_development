"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import { useCurrentEmployee } from "@/lib/useCurrentEmployee";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
};

type Application = {
  id: string;
  title: string;
  description: string | null;
  storage_path: string | null;
  form_url: string | null;
  created_at: string;
};

type EmployeeApplication = {
  id: string;
  status: string;
  assigned_at: string;
  submitted_at: string | null;
  submitted_storage_path: string | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  application: {
    id: string;
    title: string;
  } | null;
};

const HR_ROLES = ["hr", "admin", "chro", "scheduler", "manager"];

export default function ApplicationsPage() {
  const { employee: currentEmp } = useCurrentEmployee();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [assignments, setAssignments] = useState<EmployeeApplication[]>([]);

  const [loadingLib, setLoadingLib] = useState(true);
  const [loadingAssign, setLoadingAssign] = useState(true);
  const [savingApp, setSavingApp] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New application form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFormUrl, setNewFormUrl] = useState("");

  // Assignment form
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
      setAuthLoaded(true);
    }
    loadUser();
  }, []);

  const email = userEmail || "";
  const role = (currentEmp?.role || "").toLowerCase();
  const isTinashStaff = email.endsWith("@tinashhomecareservices.com");
  const isHRRole = HR_ROLES.includes(role);
  const isHR = isTinashStaff || isHRRole;

  useEffect(() => {
    if (!authLoaded) return;
    if (isHR) {
      loadEmployees();
      loadApplications();
      loadAssignments();
    }
  }, [authLoaded, isHR]);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, role, status")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees((data || []) as Employee[]);
  }

  async function loadApplications() {
    setLoadingLib(true);
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, title, description, storage_path, form_url, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading applications:", error);
      setApplications([]);
    } else {
      setApplications((data || []) as Application[]);
    }
    setLoadingLib(false);
  }

  async function loadAssignments() {
    setLoadingAssign(true);
    const { data, error } = await supabase
      .from("employee_applications")
      .select(
        "id, status, assigned_at, submitted_at, submitted_storage_path, employee:employees(id, first_name, last_name), application:applications(id, title)"
      )
      .order("assigned_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading employee_applications:", error);
      setAssignments([]);
    } else {
      setAssignments((data || []) as any);
    }
    setLoadingAssign(false);
  }

  function getPublicUrl(path: string | null): string | null {
    if (!path) return null;
    const { data } = supabase.storage.from("applications").getPublicUrl(path);
    return data.publicUrl ?? null;
  }

  async function handleNewApplication(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Title is required.");
      return;
    }

    if (!newFile && !newFormUrl.trim()) {
      alert("Provide either a file or an online fillable form URL (or both).");
      return;
    }

    setSavingApp(true);
    setErrorMsg(null);

    try {
      let storagePath: string | null = null;

      // If file is provided, upload it
      if (newFile) {
        const ext = newFile.name.split(".").pop() || "bin";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        storagePath = `templates/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("applications")
          .upload(storagePath, newFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          setErrorMsg(uploadErr.message);
          setSavingApp(false);
          return;
        }
      }

      const trimmedUrl = newFormUrl.trim() || null;

      const { error: insertErr } = await supabase.from("applications").insert({
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        storage_path: storagePath,
        form_url: trimmedUrl,
      });

      if (insertErr) {
        console.error("Insert app error:", insertErr);
        setErrorMsg(insertErr.message);
        setSavingApp(false);
        return;
      }

      // Reset form
      setNewTitle("");
      setNewDesc("");
      setNewFile(null);
      setNewFormUrl("");
      await loadApplications();
    } finally {
      setSavingApp(false);
    }
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert("Choose an employee.");
      return;
    }
    if (!selectedApplicationId) {
      alert("Choose an application.");
      return;
    }

    setSavingAssign(true);

    const { error } = await supabase.from("employee_applications").insert({
      employee_id: selectedEmployeeId,
      application_id: selectedApplicationId,
      status: "assigned",
    });

    if (error) {
      console.error("Assign error:", error);
      alert(error.message);
      setSavingAssign(false);
      return;
    }

    setSelectedEmployeeId("");
    setSelectedApplicationId("");
    await loadAssignments();
    setSavingAssign(false);
  }

  if (!authLoaded) {
    return (
      <RequireAuth>
        <AppLayout>
          <Topbar title="Applications" description="Loading..." />
          <div className="px-6 py-4">
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  if (!isHR) {
    // Non-HR shouldn’t see this page
    return (
      <RequireAuth>
        <AppLayout>
          <Topbar
            title="Access restricted"
            description="This section is for Tinash admin/HR only."
          />
          <div className="px-6 py-4">
            <p className="text-sm text-slate-500">
              Please use your My Applications tab in your employee portal.
            </p>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Applications"
          description="Manage agency application forms and assign them to employees."
        />

        <div className="px-6 py-4 space-y-6">
          {/* Library & creation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Application library
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Upload fillable PDFs or add a link to an online fillable form
                (Adobe, etc.). Employees can open, complete, and upload the
                finished form.
              </p>
              {errorMsg && (
                <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
              )}
            </div>

            <form
              onSubmit={handleNewApplication}
              className="grid gap-3 md:grid-cols-2 text-xs"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. HHA Employment Application"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Description
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional notes"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Upload fillable PDF (optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) =>
                      setNewFile(e.target.files?.[0] ?? null)
                    }
                    className="mt-1 text-xs"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    This file will be stored in Supabase Storage. Employees can
                    download it, fill it, and upload the completed copy.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Online fillable form URL (optional)
                  </label>
                  <input
                    type="url"
                    value={newFormUrl}
                    onChange={(e) => setNewFormUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Paste a link to an Adobe / DocuSign / other online form. On
                    mobile, employees can tap this to open and fill the form.
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={savingApp}
                  className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingApp ? "Saving..." : "Add application form"}
                </button>
              </div>
            </form>

            {/* Library */}
            <div className="border-t border-slate-100 pt-3">
              {loadingLib ? (
                <p className="text-xs text-slate-500">
                  Loading application forms...
                </p>
              ) : applications.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No forms yet. Upload a PDF or add a URL above.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto text-xs">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Title</th>
                        <th className="px-2 py-2">File</th>
                        <th className="px-2 py-2">Online link</th>
                        <th className="px-2 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((a) => {
                        const fileUrl = getPublicUrl(a.storage_path);
                        const hasFile = !!a.storage_path;
                        const hasUrl = !!a.form_url;
                        return (
                          <tr
                            key={a.id}
                            className="border-b text-xs last:border-0"
                          >
                            <td className="px-2 py-2">{a.title}</td>
                            <td className="px-2 py-2">
                              {hasFile && fileUrl ? (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-sky-700 underline"
                                >
                                  Download PDF
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {hasUrl ? (
                                <a
                                  href={a.form_url!}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-sky-700 underline"
                                >
                                  Open fillable form
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {a.description || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Assign to employees */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Assign applications to employees
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Employees will see the assigned form under My Applications and
                can open the link, download the PDF, and upload the completed
                copy.
              </p>
            </div>

            <form
              onSubmit={handleAssign}
              className="grid gap-3 md:grid-cols-2 text-xs"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Application form
                </label>
                <select
                  value={selectedApplicationId}
                  onChange={(e) =>
                    setSelectedApplicationId(e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  <option value="">Select form</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={savingAssign}
                  className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingAssign
                    ? "Assigning..."
                    : "Assign application to employee"}
                </button>
              </div>
            </form>

            {/* Recent assignments */}
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-xs font-semibold text-slate-700">
                Recent assignments
              </h3>
              {loadingAssign ? (
                <p className="mt-1 text-xs text-slate-500">
                  Loading assignments...
                </p>
              ) : assignments.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  No assignments yet.
                </p>
              ) : (
                <div className="mt-2 max-h-64 overflow-y-auto text-xs">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Employee</th>
                        <th className="px-2 py-2">Application</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Employee submission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => {
                        const uploadUrl = getPublicUrl(
                          a.submitted_storage_path
                        );
                        return (
                          <tr
                            key={a.id}
                            className="border-b text-xs last:border-0"
                          >
                            <td className="px-2 py-2">
                              {a.employee
                                ? `${a.employee.first_name} ${a.employee.last_name}`
                                : "—"}
                            </td>
                            <td className="px-2 py-2">
                              {a.application?.title ?? "—"}
                            </td>
                            <td className="px-2 py-2">
                              {a.status || "assigned"}
                            </td>
                            <td className="px-2 py-2">
                              {uploadUrl ? (
                                <a
                                  href={uploadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-sky-700 underline"
                                >
                                  View uploaded form
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  Not submitted yet
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
