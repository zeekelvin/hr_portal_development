"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";
import Topbar from "@/components/Topbar";
import RequireAuth from "@/components/RequireAuth";
import { useCurrentEmployee } from "@/lib/useCurrentEmployee";

type MyApplication = {
  id: string;
  status: string;
  assigned_at: string;
  submitted_at: string | null;
  submitted_storage_path: string | null;
  application: {
    id: string;
    title: string;
    description: string | null;
    storage_path: string | null;
    form_url: string | null;
  } | null;
};

export default function MyApplicationsPage() {
  const { employee } = useCurrentEmployee();
  const [authLoaded, setAuthLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [apps, setApps] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [fileMap, setFileMap] = useState<Record<string, File | null>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
      setAuthLoaded(true);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (!employee) return;
    loadMyApps();
  }, [authLoaded, employee?.id]);

  async function loadMyApps() {
    if (!employee) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("employee_applications")
      .select(
        "id, status, assigned_at, submitted_at, submitted_storage_path, application:applications(id, title, description, storage_path, form_url)"
      )
      .eq("employee_id", employee.id)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error loading my apps:", error);
      setErrorMsg(error.message);
      setApps([]);
    } else {
      setApps((data || []) as any);
    }
    setLoading(false);
  }

  function getPublicUrl(path: string | null): string | null {
    if (!path) return null;
    const { data } = supabase.storage.from("applications").getPublicUrl(path);
    return data.publicUrl ?? null;
  }

  function onFileChange(appId: string, file: File | null) {
    setFileMap((prev) => ({ ...prev, [appId]: file }));
  }

  async function handleUpload(app: MyApplication, e: FormEvent) {
    e.preventDefault();
    const file = fileMap[app.id];
    if (!file) {
      alert("Please choose a file to upload.");
      return;
    }
    if (!employee) return;

    setUploadingId(app.id);
    setErrorMsg(null);

    try {
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `completed/${employee.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("applications")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        setErrorMsg(uploadErr.message);
        setUploadingId(null);
        return;
      }

      const { error: updateErr } = await supabase
        .from("employee_applications")
        .update({
          submitted_storage_path: storagePath,
          submitted_at: new Date().toISOString(),
          status: "submitted",
        })
        .eq("id", app.id);

      if (updateErr) {
        console.error("Update employee_applications error:", updateErr);
        setErrorMsg(updateErr.message);
        setUploadingId(null);
        return;
      }

      await loadMyApps();
      setFileMap((prev) => ({ ...prev, [app.id]: null }));
    } finally {
      setUploadingId(null);
    }
  }

  if (!authLoaded) {
    return (
      <RequireAuth>
        <AppLayout>
          <Topbar title="My Applications" description="Loading..." />
          <div className="px-6 py-4">
            <p className="text-sm text-slate-500">
              Loading your applications...
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
          title="My Applications"
          description="View assigned application forms, open or download them, and upload your completed copies."
        />

        <div className="px-6 py-4 space-y-4">
          {errorMsg && (
            <p className="text-xs text-red-600">{errorMsg}</p>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">
              Loading your applications...
            </p>
          ) : apps.length === 0 ? (
            <p className="text-sm text-slate-500">
              You currently have no assigned applications.
            </p>
          ) : (
            <div className="space-y-3">
              {apps.map((a) => {
                const appMeta = a.application;
                const fileUrl = getPublicUrl(appMeta?.storage_path ?? null);
                const onlineUrl = appMeta?.form_url || null;
                const submittedUrl = getPublicUrl(a.submitted_storage_path);
                const isUploading = uploadingId === a.id;

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {appMeta?.title ?? "Application form"}
                        </div>
                        {appMeta?.description && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {appMeta.description}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-500">
                          Status:{" "}
                          <span className="font-semibold">
                            {a.status}
                          </span>
                        </div>
                        {a.submitted_at && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Submitted:{" "}
                            {new Date(
                              a.submitted_at
                            ).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 text-[11px]">
                        {onlineUrl && (
                          <a
                            href={onlineUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Open fillable form
                          </a>
                        )}
                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Download fillable form
                          </a>
                        )}
                        {submittedUrl && (
                          <a
                            href={submittedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-sky-700 underline"
                          >
                            View my uploaded form
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Upload completed form */}
                    <form
                      onSubmit={(e) => handleUpload(a, e)}
                      className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Upload completed form
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) =>
                            onFileChange(
                              a.id,
                              e.target.files?.[0] ?? null
                            )
                          }
                          className="mt-1 text-[11px]"
                        />
                        <p className="mt-1 text-[10px] text-slate-500">
                          On mobile: tap “Open fillable form” or “Download
                          fillable form”, complete it, save or share it to your
                          device, then upload the finished file here.
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="mt-2 w-full rounded-xl bg-sky-700 px-4 py-2 text-[11px] font-semibold text-white hover:bg-sky-800 disabled:opacity-60 md:mt-0 md:w-auto"
                      >
                        {isUploading
                          ? "Uploading..."
                          : "Submit completed form"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
