"use client";

import Link from "next/link";
import { ArrowRightIcon, PackageIcon, ShoppingCartIcon, TrendingUpIcon } from "lucide-react";
import { DASHBOARD_MODULES } from "@/components/dashboard/dashboard-modules";
import { EstadoBadge } from "@/components/dashboard/estado-badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { usePerfil } from "@/components/dashboard/perfil-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatFecha, formatMoneda } from "@/lib/format";
import { cn } from "cn";

const KPIS = [
  {
    label: "Productos en catálogo",
    valor: "128",
    detalle: "+4 esta semana",
    icon: PackageIcon,
  },
  {
    label: "Pedidos del mes",
    valor: "342",
    detalle: "+12% vs. mes anterior",
    icon: ShoppingCartIcon,
  },
  {
    label: "Ventas del mes",
    valor: formatMoneda(48_900_000),
    detalle: "Margen neto estimado 21,4%",
    icon: TrendingUpIcon,
  },
];

function Cargando() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export default function VisionGeneralPage() {
  const { usuario, cargando } = usePerfil();

  if (cargando) return <Cargando />;
  if (!usuario) return null;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-r from-brand-900 via-brand-800 to-violet-900 p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div
          className="absolute -top-16 -right-16 size-56 rounded-full bg-white/10 blur-3xl animate-float"
          aria-hidden
        />
        <div
          className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-violet-400/20 blur-3xl animate-float-delayed"
          aria-hidden
        />
        <div className="relative">
          <p className="font-mono text-[0.85rem] tracking-[0.24em] text-brand-200/80 uppercase">
            {"// panel de gestión"}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">
            Bienvenido, {usuario.nombre} 👋
          </h1>
          <p className="mt-1.5 text-base text-white/65">
            Último acceso: {formatFecha(usuario.ultimo_acceso)} · Rol:{" "}
            {usuario.rol === "ADMIN" ? "Administrador" : "Empleado"}
          </p>
          <div className="mt-4">
            <EstadoBadge estado={usuario.estado} className="border-transparent bg-white/10 text-white [&>span]:bg-emerald-300" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} size="sm">
              <CardContent className="flex items-center gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10">
                  <Icon className="size-5 text-brand-400" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[0.75rem] tracking-[0.18em] text-muted-foreground uppercase">
                    {kpi.label}
                  </p>
                  <p className="mt-0.5 truncate font-heading text-xl font-semibold">
                    {kpi.valor}
                  </p>
                  <p className="text-sm text-muted-foreground">{kpi.detalle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section>
        <SectionHeader
          title="Módulos"
          description="Accesos directos del ecosistema HeavyCult"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DASHBOARD_MODULES.map((modulo) => {
            const Icon = modulo.icon;
            const contenido = (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid size-9 place-items-center rounded-lg border border-brand-500/25 bg-brand-500/10">
                      <Icon className="size-4 text-brand-400" />
                    </span>
                    <span className="font-mono text-[0.75rem] text-white/30">
                      {modulo.id}
                    </span>
                  </div>
                  <CardTitle className="mt-2">{modulo.title}</CardTitle>
                  <CardDescription>{modulo.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[0.75rem] text-brand-300/70">
                    {modulo.tag}
                  </span>
                  {modulo.pronto ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-white/10 text-white/40"
                    >
                      próximamente
                    </Badge>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[0.8rem] font-semibold tracking-[0.14em] text-brand-300 uppercase",
                      )}
                    >
                      Abrir
                      <ArrowRightIcon className="size-3.5" />
                    </span>
                  )}
                </CardContent>
              </>
            );

            return modulo.href ? (
              <Link key={modulo.id} href={modulo.href} className="group">
                <Card className="h-full transition-colors group-hover:border-brand-500/40 group-hover:bg-brand-500/[0.04]">
                  {contenido}
                </Card>
              </Link>
            ) : (
              <Card key={modulo.id} className="h-full opacity-70">
                {contenido}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}