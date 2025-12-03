import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Tinash HR Portal",
  description: "Tinash Homecare Services – HR Web Portal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-tinash-bg text-tinash-text">
        {children}
      </body>
    </html>
  );
}