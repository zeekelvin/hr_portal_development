import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-tinash-bg">
      <Sidebar />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}