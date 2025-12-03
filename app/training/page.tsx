"use client";

import { FormEvent, useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";

type Training = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  content_url: string | null;
  created_at: string;
};

type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // create/edit form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contentUrl, setContentUrl] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // assign training state
  const [assigningTraining, setAssigningTraining] = useState<Training | null>(
    null
  );
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignStatus, setAssignStatus] = useState("assigned");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTrainings();
    loadEmployees();
  }, []);

  async function loadTrainings() {
    const { data, error } = await supabase
      .from("trainings")
      .select("id, code, name, description, content_url, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading trainings:", error);
      return;
    }

    setTrainings((data || []) as Training[]);
  }

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

  function resetForm() {
    setCode("");
    setName("");
    setDescription("");
    setContentUrl("");
    setEditingId(null);
    setErrorMsg(null);
  }

  function startEdit(t: Training) {
    setEditingId(t.id);
    setCode(t.code);
    setName(t.name);
    setDescription(t.description || "");
    setContentUrl(t.content_url || "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Training name is required.");
      setSaving(false);
      return;
    }

    if (!code.trim()) {
      setErrorMsg("Training code is required.");
      setSaving(false);
      return;
    }

    if (editingId) {
      // UPDATE
      const { error } = await supabase
        .from("trainings")
        .update({
          code,
          name,
          description: description || null,
          content_url: contentUrl || null
        })
        .eq("id", editingId);

      setSaving(false);

      if (error) {
        console.error("Error updating training:", error);
        setErrorMsg(error.message);
        return;
      }

      await loadTrainings();
      resetForm();
    } else {
      // INSERT
      const { error } = await supabase.from("trainings").insert({
        code,
        name,
        description: description || null,
        content_url: contentUrl || null
      });

      setSaving(false);

      if (error) {
        console.error("Error creating training:", error);
        setErrorMsg(error.message);
        return;
      }

      await loadTrainings();
      resetForm();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this training item? This cannot be undone.")) return;

    const { error } = await supabase.from("trainings").delete().eq("id", id);
    if (error) {
      console.error("Error deleting training:", error);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadTrainings();
  }

  function handleOpenContent(url: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function startAssign(t: Training) {
    setAssigningTraining(t);
    setAssignEmployeeId("");
    setAssignStatus("assigned");
    setAssignError(null);
    setAssignSuccess(null);
  }

  async function handleAssignSubmit(e: FormEvent) {
    e.preventDefault();
    setAssignSaving(true);
    setAssignError(null);
    setAssignSuccess(null);

    if (!assigningTraining) {
      setAssignError("No training selected.");
      setAssignSaving(false);
      return;
    }

    if (!assignEmployeeId) {
      setAssignError("Please select an employee.");
      setAssignSaving(false);
      return;
    }

    const { error } = await supabase.from("employee_trainings").insert({
      employee_id: assignEmployeeId,
      training_id: assigningTraining.id,
      status: assignStatus
    });

    setAssignSaving(false);

    if (error) {
      console.error("Error assigning training:", error);
      setAssignError(error.message);
      return;
    }

    setAssignSuccess("Training assigned successfully.");
    setAssignEmployeeId("");
    setAssignStatus("assigned");
  }

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Training"
          description="Create and manage Tinash training modules and assign them to employees."
        />

        <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row">
          {/* LEFT: Create / edit training */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              {editingId ? "Edit Training" : "Create Training"}
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Define training items (e.g., “HHA Orientation”, “Infection
              Control”) with links to PDFs, videos, or slide decks.
            </p>

            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Training code
                </label>
                <input
                  placeholder="e.g., HHA_ORIENT"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Name
                </label>
                <input
                  placeholder="e.g., HHA Orientation & Safety"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Description
                </label>
                <textarea
                  placeholder="Short summary of what this training covers."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Content URL (PDF, Word, video, slides)
                </label>
                <input
                  placeholder="https://... (link to PDF, Word doc, YouTube, Google Slides, etc.)"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Store files in Supabase Storage, Google Drive, etc. and paste
                  the share link here.
                </p>
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
                      ? "Saving changes..."
                      : "Creating..."
                    : editingId
                    ? "Save changes"
                    : "Create training"}
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

          {/* RIGHT: Training list + assign panel */}
          <div className="flex-1 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Training Library ({trainings.length})
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                These trainings can be assigned to employees either from this
                page or from the employee&apos;s profile.
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Content</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainings.map((t) => (
                      <tr key={t.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs">
                          {t.code}
                        </td>
                        <td className="px-3 py-2">{t.name}</td>
                        <td className="px-3 py-2">
                          {t.content_url ? (
                            <button
                              type="button"
                              onClick={() => handleOpenContent(t.content_url)}
                              className="text-xs text-sky-700 underline"
                            >
                              Open content
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              No link
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          <button
                            type="button"
                            onClick={() => startEdit(t)}
                            className="mr-2 text-sky-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => startAssign(t)}
                            className="mr-2 text-emerald-700 hover:underline"
                          >
                            Assign
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {trainings.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-sm text-slate-500"
                        >
                          No trainings created yet. Add your first Tinash
                          training on the left.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ASSIGN PANEL */}
            {assigningTraining && (
              <form
                onSubmit={handleAssignSubmit}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-emerald-900">
                    Assign Training to Employee
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningTraining(null);
                      setAssignError(null);
                      setAssignSuccess(null);
                    }}
                    className="text-xs text-emerald-700 hover:underline"
                  >
                    Close
                  </button>
                </div>
                <p className="mb-2 text-xs text-emerald-800">
                  Training:{" "}
                  <span className="font-semibold">
                    {assigningTraining.code} – {assigningTraining.name}
                  </span>
                </p>

                <div className="grid gap-2 text-sm md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-emerald-800">
                      Employee
                    </label>
                    <select
                      value={assignEmployeeId}
                      onChange={(e) => setAssignEmployeeId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-emerald-300 px-3 py-2 text-sm"
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
                    <label className="block text-xs font-semibold text-emerald-800">
                      Status
                    </label>
                    <select
                      value={assignStatus}
                      onChange={(e) => setAssignStatus(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-emerald-300 px-3 py-2 text-sm"
                    >
                      <option value="assigned">Assigned</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {assignError && (
                  <p className="mt-2 text-xs text-red-700">{assignError}</p>
                )}
                {assignSuccess && (
                  <p className="mt-2 text-xs text-emerald-800">
                    {assignSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={assignSaving}
                  className="mt-3 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {assignSaving ? "Assigning..." : "Assign training"}
                </button>
              </form>
            )}
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
