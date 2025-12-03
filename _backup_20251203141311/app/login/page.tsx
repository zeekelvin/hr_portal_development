"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type CurrentUser = {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

function getInitials(fullName: string | null, email: string | null): string {
  if (fullName && fullName.trim().length > 0) {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) {
    return email[0]?.toUpperCase() ?? "";
  }
  return "?";
}

export default function LoginPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        setUser(null);
        return;
      }

      const meta = (u.user_metadata || {}) as any;

      setUser({
        email: u.email ?? null,
        fullName: meta.full_name ?? null,
        avatarUrl: meta.avatar_url ?? null
      });
    }

    loadUser();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setSaving(false);

    if (error) {
      console.error("Login error:", error);
      setErrorMsg(error.message);
      return;
    }

    if (data.session) {
      router.push("/");
    }
  }

  function handleBackToDashboard() {
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* TOP BAR: logo + back to dashboard + optional avatar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-white">
            {/* Tinash logo from /public/tinash-logo.png */}
            <Image
              src="/tinash-logo.png"
              alt="Tinash Homecare logo"
              fill
              className="object-contain p-1"
            />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold text-slate-900">
              Tinash HR Portal
            </div>
            <div className="text-[11px] text-slate-500">
              Homecare Services
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="relative h-7 w-7 overflow-hidden rounded-full bg-slate-200">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt="User avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold">
                    {getInitials(user.fullName, user.email)}
                  </div>
                )}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-semibold">
                  {user.fullName || "Tinash User"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {user.email}
                </span>
              </div>
            </div>
          )}

          {/* Return / Back button */}
          <button
            type="button"
            onClick={handleBackToDashboard}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            ← Back to dashboard
          </button>
        </div>
      </header>

      {/* CENTER: login card */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-sm font-semibold text-slate-900">
            Sign in to Tinash HR
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Use your Tinash HR email and password to access the CHRO dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 w-full rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {saving ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-3 text-[11px] text-slate-400">
            Having trouble signing in? Contact the Tinash HR admin to reset
            your account.
          </p>
        </div>
      </main>
    </div>
  );
}
