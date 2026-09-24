"use client";

import { useState } from "react";
import { PerfilProvider } from "@/components/dashboard/perfil-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  return (
    <PerfilProvider>
      <div className="min-h-svh bg-background lg:flex">
        <Sidebar variant="desktop" />
        <Sidebar
          variant="mobile"
          abierto={sidebarAbierto}
          onClose={() => setSidebarAbierto(false)}
        />
        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setSidebarAbierto(true)} />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </PerfilProvider>
  );
}