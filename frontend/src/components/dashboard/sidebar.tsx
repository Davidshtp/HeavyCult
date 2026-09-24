"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cerrarSesion, usePerfil } from "@/components/dashboard/perfil-context";
import { esActivo, NAV_SECTIONS } from "@/components/dashboard/sidebar-nav";
import { cn } from "cn";

function Marca() {
  return (
    <Link
      href="/dashboard"
      className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="size-8 rounded-[0.4rem]" />
      <div>
        <p className="font-heading text-base font-bold tracking-[0.18em] text-white">
          Heavy<span className="text-brand-400">Cult</span>
        </p>
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          Sistema · ERP
        </p>
      </div>
    </Link>
  );
}

function CargandoNav() {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          {[0, 1, 2].map((j) => (
            <Skeleton key={j} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, cargando } = usePerfil();
  const esAdmin = usuario?.rol === "ADMIN";

  async function salir() {
    onNavigate?.();
    await cerrarSesion(router);
  }

  return (
    <div className="flex h-full flex-col">
      <Marca />
      {cargando ? (
        <CargandoNav />
      ) : (
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((seccion) => {
            const items = seccion.items.filter(
              (item) => !item.adminOnly || esAdmin,
            );
            if (items.length === 0) return null;
            return (
              <div key={seccion.label}>
                <p className="mb-1.5 px-2 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-white/25">
                  {seccion.label}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const activo = esActivo(pathname, item.href);
                    const Icon = item.icon;
                    if (item.pronto || !item.href) {
                      return (
                        <li key={item.label}>
                          <span className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-base text-white/25 select-none">
                            <Icon className="size-4 shrink-0" />
                            <span>{item.label}</span>
                            <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.7rem] tracking-wider text-white/30 uppercase">
                              pronto
                            </span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-base transition-colors",
                            activo
                              ? "border-white/10 bg-brand-500/10 text-brand-200"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-white",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              activo && "text-brand-400",
                            )}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      )}
      <div className="border-t border-white/10 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 text-muted-foreground"
          onClick={salir}
        >
          <LogOutIcon className="size-4" />
          Cerrar sesión
        </Button>
        <p className="mt-1.5 px-2 font-mono text-[0.7rem] tracking-[0.2em] text-white/20 uppercase">
          v0.1 · maquetación
        </p>
      </div>
    </div>
  );
}

export function Sidebar({
  variant = "desktop",
  abierto = false,
  onClose,
}: {
  variant?: "desktop" | "mobile";
  abierto?: boolean;
  onClose?: () => void;
}) {
  if (variant === "mobile") {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden",
            abierto ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={onClose}
          aria-hidden
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-background ring-1 ring-white/10 transition-transform duration-200 lg:hidden",
            abierto ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody onNavigate={onClose} />
        </aside>
      </>
    );
  }
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r border-white/10 bg-card/40 lg:block">
      <SidebarBody />
    </aside>
  );
}