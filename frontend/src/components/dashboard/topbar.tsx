"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, MenuIcon } from "lucide-react";
import { Avatar } from "@/components/dashboard/avatar";
import { cerrarSesion, usePerfil } from "@/components/dashboard/perfil-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

const TITULOS: Record<string, string> = {
  "/dashboard": "Visión general",
  "/dashboard/productos": "Productos · Dropi",
  "/dashboard/configuraciones/perfil": "Configuraciones · Mi perfil",
  "/dashboard/configuraciones/usuarios": "Configuraciones · Usuarios y roles",
  "/dashboard/configuraciones/integraciones": "Configuraciones · Conexiones",
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cargando } = usePerfil();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const titulo = TITULOS[pathname] ?? "Dashboard";

  async function salir() {
    setMenuAbierto(false);
    await cerrarSesion(router);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenu}
          aria-label="Abrir menú"
        >
          <MenuIcon className="size-5" />
        </Button>

        <div className="flex items-center gap-2.5 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="size-7 rounded-[0.35rem]" />
          <span className="font-heading text-base font-bold tracking-[0.18em]">
            Heavy<span className="text-brand-400">Cult</span>
          </span>
        </div>

        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <span className="font-mono text-[0.85rem] uppercase tracking-[0.2em] text-brand-400">
            {"//"}
          </span>
          <span className="truncate font-mono text-sm font-semibold tracking-[0.18em] text-white/80 uppercase">
            {titulo}
          </span>
        </div>

        <div className="ml-auto flex items-center">
          {cargando ? (
            <Skeleton className="h-9 w-48" />
          ) : usuario ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuAbierto((a) => !a)}
                aria-expanded={menuAbierto}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pr-2.5 pl-1.5 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Avatar
                  nombre={usuario.nombre}
                  apellido={usuario.apellido}
                  urlImagen={usuario.url_imagen}
                />
                <span className="hidden text-left sm:block">
                  <span className="block max-w-40 truncate text-base font-medium text-foreground">
                    {usuario.nombre} {usuario.apellido}
                  </span>
                  <span className="block max-w-40 truncate text-[0.8rem] text-muted-foreground">
                    {usuario.correo}
                  </span>
                </span>
                <ChevronDownIcon
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    menuAbierto && "rotate-180",
                  )}
                />
              </button>

              {menuAbierto && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuAbierto(false)}
                    aria-hidden
                  />
                  <div
                    role="menu"
                    className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-popover p-1.5 shadow-2xl"
                  >
                    <Link
                      href="/dashboard/configuraciones/perfil"
                      onClick={() => setMenuAbierto(false)}
                      role="menuitem"
                      className="block rounded-lg px-3 py-2 text-base text-foreground transition-colors hover:bg-muted"
                    >
                      Mi perfil
                    </Link>
                    <Link
                      href="/dashboard/configuraciones/integraciones"
                      onClick={() => setMenuAbierto(false)}
                      role="menuitem"
                      className={cn(
                        "block rounded-lg px-3 py-2 text-base transition-colors hover:bg-muted",
                        usuario.rol !== "ADMIN" && "hidden",
                      )}
                    >
                      Conexiones (API keys)
                    </Link>
                    <Separator className="my-1" />
                    <button
                      type="button"
                      onClick={salir}
                      role="menuitem"
                      className="block w-full rounded-lg px-3 py-2 text-left text-base text-destructive transition-colors hover:bg-destructive/10"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}