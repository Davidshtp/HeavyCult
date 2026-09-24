"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRoundIcon, UserRoundIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { usePerfil } from "@/components/dashboard/perfil-context";
import { cn } from "cn";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const TABS: Tab[] = [
  {
    href: "/dashboard/configuraciones/perfil",
    label: "Mi perfil",
    icon: UserRoundIcon,
  },
  {
    href: "/dashboard/configuraciones/usuarios",
    label: "Usuarios y roles",
    icon: UsersIcon,
    adminOnly: true,
  },
  {
    href: "/dashboard/configuraciones/integraciones",
    label: "Conexiones (API keys)",
    icon: KeyRoundIcon,
    adminOnly: true,
  },
];

export function ConfigTabs() {
  const pathname = usePathname();
  const { usuario } = usePerfil();
  const esAdmin = usuario?.rol === "ADMIN";

  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-card/40 p-1">
      {TABS.filter((tab) => !tab.adminOnly || esAdmin).map((tab) => {
        const activo = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[0.85rem] font-medium tracking-[0.15em] uppercase transition-colors",
              activo
                ? "bg-brand-500/15 text-brand-300"
                : "text-muted-foreground hover:bg-muted/40 hover:text-white",
            )}
          >
            <Icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}