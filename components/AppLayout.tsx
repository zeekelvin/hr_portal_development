import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-tinash-bg md:flex-row">
      <Sidebar />
      <main className="flex flex-1 flex-col md:min-h-screen">
        {children}
      </main>
    </div>
  );
}
