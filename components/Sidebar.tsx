"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentEmployee } from "@/lib/useCurrentEmployee";

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
  if (email) return email[0]?.toUpperCase() ?? "";
  return "?";
}

const HR_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/credentials", label: "Credentials" },
  { href: "/incidents", label: "Incidents" },
  { href: "/training", label: "Training" },
  { href: "/scheduling", label: "Scheduling" },
  { href: "/reports", label: "Reports" },
  { href: "/applications", label: "Applications" },
  { href: "/reconciliation", label: "Reconciliation" },
];

const EMPLOYEE_ITEMS = [
  { href: "/my", label: "My Profile" },
  { href: "/my/training", label: "My Training" },
  { href: "/my/schedule", label: "My Schedule" },
  { href: "/my/credentials", label: "My Credentials" },
  { href: "/my/applications", label: "My Applications" },
];

const HR_ROLES = ["hr", "admin", "chro", "scheduler", "manager"];

function SidebarShell({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-full flex-col bg-tinash-navy text-white md:sticky md:top-0 md:h-screen md:min-h-screen md:w-60 md:shrink-0 md:overflow-y-auto">
      {children}
    </aside>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee } = useCurrentEmployee();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Sidebar: getUser error", error);
          setUser(null);
        } else {
          const u = data.user;
          if (!u) {
            setUser(null);
          } else {
            const meta = (u.user_metadata || {}) as any;
            setUser({
              email: u.email ?? null,
              fullName: meta.full_name ?? null,
              avatarUrl: meta.avatar_url ?? null,
            });
          }
        }
      } catch (err) {
        console.error("Sidebar: crashed while loading user", err);
        setUser(null);
      } finally {
        setUserLoaded(true);
      }
    }

    loadUser();
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sidebar: signOut error", err);
    } finally {
      router.replace("/login");
    }
  }

  if (!userLoaded) {
    return (
      <SidebarShell>
        <div className="flex items-center gap-3 px-5 py-4 md:py-6">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-white">
            <Image
              src="/tinash-logo.png"
              alt="Tinash Homecare logo"
              fill
              className="object-contain p-1"
            />
          </div>
          <div>
            <div className="text-sm font-semibold">Tinash</div>
            <div className="text-xs text-white/70">Homecare Services</div>
          </div>
        </div>
        <div className="flex-1 px-5 pb-4 text-xs text-white/60">
          Loading menu...
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-white/80">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/20">
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                ?
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold">User</span>
              <span className="text-[10px] text-white/70">Loading...</span>
            </div>
          </div>
        </div>
      </SidebarShell>
    );
  }

  const emailRaw = user?.email || "";
  const email = emailRaw.toLowerCase();
  const employeeRole = (employee?.role || "").toString().toLowerCase();

  const isTinashStaff = email.endsWith("@tinashhomecareservices.com");
  const isHRRole = HR_ROLES.includes(employeeRole);
  const isHR = isTinashStaff || isHRRole;

  const navItems = isHR ? HR_ITEMS : EMPLOYEE_ITEMS;
  const initials = getInitials(user?.fullName ?? null, user?.email ?? null);
  const displayName = isHR ? "Admin User" : "Tinash User";

  return (
    <SidebarShell>
      <div className="flex items-center gap-3 px-5 py-4 md:py-6">
        <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-white">
          <Image
            src="/tinash-logo.png"
            alt="Tinash Homecare logo"
            fill
            className="object-contain p-1"
          />
        </div>
        <div>
          <div className="text-sm font-semibold">Tinash</div>
          <div className="text-xs text-white/70">Homecare Services</div>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3 text-sm">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-3 py-2 transition",
                isActive
                  ? "bg-white text-tinash-navy font-semibold"
                  : "text-white/80 hover:bg-white/10"
              )}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4 text-xs text-white/80">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/20">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                {initials}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold">{displayName}</span>
            <span className="text-[10px] text-white/70">
              {user?.email || "No email"}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2 text-left text-[11px] hover:bg-white/20"
        >
          Log out
        </button>
      </div>
    </SidebarShell>
  );
}
