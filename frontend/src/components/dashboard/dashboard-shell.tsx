"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { PerfilProvider } from "@/components/dashboard/perfil-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { ProveedorTitulo } from "@/components/dashboard/topbar-titulo";
import { cn } from "cn";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const pathname = usePathname();

  // El detalle de producto y la bandeja de conversaciones aprovechan todo el ancho
  // disponible; el resto del dashboard se mantiene centrado y legible en max-w-6xl.
  const detalleProducto =
    !!pathname &&
    pathname.startsWith("/dashboard/productos/") &&
    pathname !== "/dashboard/productos/";

  const esConversaciones = pathname === "/dashboard/conversaciones";

  return (
    <PerfilProvider>
      <ProveedorTitulo>
        <div className="min-h-svh bg-background lg:flex">
          <Sidebar variant="desktop" />
          <Sidebar
            variant="mobile"
            abierto={sidebarAbierto}
            onClose={() => setSidebarAbierto(false)}
          />
          <div className="flex min-h-svh min-w-0 flex-1 flex-col">
            <Topbar onMenu={() => setSidebarAbierto(true)} />
            <main className={cn("flex-1", esConversaciones && "flex flex-col min-h-0")}>
              <div
                className={cn(
                  "mx-auto w-full",
                  esConversaciones
                    ? "flex-1 flex flex-col min-h-0 max-w-none px-3 sm:px-5 lg:px-6 py-3 sm:py-4"
                    : detalleProducto
                      ? "max-w-[1800px] px-5 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10"
                      : "max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-8",
                )}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </ProveedorTitulo>
    </PerfilProvider>
  );
}