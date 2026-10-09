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

  // El detalle de producto aprovecha todo el ancho disponible (imágenes +
  // variantes + info en paralelo); el resto del dashboard se mantiene
  // centrado y legible en el ancho por defecto.
  const detalleProducto =
    !!pathname &&
    pathname.startsWith("/dashboard/productos/") &&
    pathname !== "/dashboard/productos/";

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
            <main className="flex-1">
              <div
                className={cn(
                  "mx-auto w-full py-6 sm:py-8 lg:py-8",
                  detalleProducto
                    ? "max-w-[1800px] px-5 sm:px-8 lg:px-12 lg:py-10"
                    : "max-w-6xl px-4 sm:px-6 lg:px-8",
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