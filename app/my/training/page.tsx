// app/training/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import { supabase } from "@/lib/supabaseClient";

type Training = {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
};

export default function TrainingAdminPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadTrainings();
  }, []);

  async function loadTrainings() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("trainings")
      .select("id, name, description, active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading trainings:", error);
      setErrorMsg(error.message);
      setTrainings([]);
    } else {
      setTrainings((data || []) as Training[]);
    }

    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Training name is required.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      active,
    };

    const { error } = await supabase
      .from("trainings")
      .insert(payload);

    if (error) {
      console.error("Error creating training:", error);
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setDescription("");
    setActive(true);
    setSaving(false);
    await loadTrainings();
  }

  return (
    <RequireAuth>
      <AppLayout>
        <Topbar
          title="Training Catalog"
          description="Manage the list of trainings that can be assigned to employees."
        />

        <div className="px-6 py-4 space-y-6">
          {/* FORM: New training */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Add training to catalog
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Trainings defined here will appear in the dropdown on the
              Employees page when you assign training to caregivers.
            </p>

            {errorMsg && (
              <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Training name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. HIPAA Basics, Elder Abuse Prevention"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Active
                </label>
                <select
                  value={active ? "true" : "false"}
                  onChange={(e) => setActive(e.target.value === "true")}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="mt-2 flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Add training"}
                </button>
              </div>
            </form>
          </div>

          {/* TABLE: Trainings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Training list
            </h2>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">
                Loading trainings...
              </p>
            ) : trainings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No trainings yet. Add your first one above.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto text-sm">
                <table className="min-w-full text-left">
                  <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainings.map((t) => (
                      <tr key={t.id} className="border-b text-xs">
                        <td className="px-3 py-2">{t.name}</td>
                        <td className="px-3 py-2">
                          {t.description || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {t.active === false ? "No" : "Yes"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
