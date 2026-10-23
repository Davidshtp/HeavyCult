"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  PackageIcon,
  RefreshCwIcon,
  SquareUserIcon,
  TriangleAlertIcon,
  WalletCardsIcon,
} from "lucide-react";
import { EtiquetaEstadoPedido } from "@/components/dashboard/pedidos/etiqueta-estado-pedido";
import { useTituloPagina } from "@/components/dashboard/topbar-titulo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { obtenerPedido } from "@/lib/dashboard-api";
import { formatFecha, formatMoneda } from "@/lib/format";
import type { PedidoDetalle } from "@/lib/types";

function Dato({
  icono: Icono,
  etiqueta,
  children,
  destacado = false,
}: {
  icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  children: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        destacado
          ? "border-brand-500/30 bg-brand-500/[0.08]"
          : "border-white/10 bg-white/[0.02]",
      )}
    >
      <p className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-white/40">
        <Icono className="size-3.5" />
        {etiqueta}
      </p>
      <div
        className={cn(
          "mt-1 font-mono tabular-nums",
          destacado
            ? "text-2xl font-semibold text-white"
            : "text-base text-white/85",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Seccion({ titulo }: { titulo: string }) {
  return (
    <h2 className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-white/40">
      {titulo}
    </h2>
  );
}

function ValorSinDato({ valor }: { valor: string | null | undefined }) {
  const limpio = valor?.trim();
  return <span>{limpio || <span className="text-white/30">—</span>}</span>;
}

export function PedidoDetallePanel({ id }: { id: string }) {
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useTituloPagina(pedido ? `Pedido ${pedido.numero}` : "Pedido");

  const cargar = useCallback(async () => {
    setError(null);
    setCargando(true);
    try {
      const respuesta = await obtenerPedido(id);
      setPedido(respuesta);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el pedido.",
      );
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cliente = pedido?.cliente;
  const direccion = pedido?.direccion_envio;
  const items = pedido?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/pedidos"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon className="size-4" />
          Volver a pedidos
        </Link>
        {pedido && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-lg font-semibold tracking-wide text-foreground">
              {pedido.numero}
            </h1>
            <EtiquetaEstadoPedido estado={pedido.estado_financiero} />
          </div>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center">
          <TriangleAlertIcon className="size-8 text-amber-300" />
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={cargar}>
            <RefreshCwIcon className="size-4" />
            Reintentar
          </Button>
        </div>
      ) : cargando || !pedido ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 p-4">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="mt-2 h-6 w-1/2" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <Skeleton className="h-4 w-32" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato icono={WalletCardsIcon} etiqueta="Total" destacado>
              {formatMoneda(pedido.total)}
            </Dato>
            <Dato icono={CalendarIcon} etiqueta="Creado">
              {formatFecha(pedido.creado)}
            </Dato>
            <Dato icono={PackageIcon} etiqueta="Ítems">
              {items.length > 0 ? (
                items.reduce((a, i) => a + i.cantidad, 0)
              ) : (
                <ValorSinDato valor={null} />
              )}
            </Dato>
            <Dato icono={MapPinIcon} etiqueta="Destino">
              <span className="block">
                <ValorSinDato valor={direccion?.ciudad} />
                {direccion?.departamento && (
                  <span className="text-[0.7rem] text-white/40">
                    {" "}
                    · {direccion.departamento}
                  </span>
                )}
              </span>
            </Dato>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 p-4">
              <Seccion titulo="Cliente" />
              {cliente ? (
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300">
                    <SquareUserIcon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-white">
                      {[cliente.nombre, cliente.apellido].filter(Boolean).join(" ")}
                    </p>
                    <p className="mt-1 truncate font-mono text-[0.75rem] text-muted-foreground">
                      {cliente.email || <ValorSinDato valor={null} />}
                    </p>
                    <p className="font-mono text-[0.75rem] text-muted-foreground">
                      {cliente.telefono || <ValorSinDato valor={null} />}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin cliente asociado.
                </p>
              )}

              <Seccion titulo="Dirección de envío" />
              {direccion ? (
                <div className="space-y-1 font-mono text-[0.8rem] text-white/80">
                  <p className="flex gap-2">
                    <span className="text-white/40">Calle</span>
                    <span className="min-w-0 flex-1">
                      <ValorSinDato valor={direccion.calle} />
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-white/40">Ciudad</span>
                    <span className="min-w-0 flex-1">
                      <ValorSinDato valor={direccion.ciudad} />
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-white/40">Departamento</span>
                    <span className="min-w-0 flex-1">
                      <ValorSinDato valor={direccion.departamento} />
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-white/40">País</span>
                    <span className="min-w-0 flex-1">
                      <ValorSinDato valor={direccion.pais} />
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-white/40">C. postal</span>
                    <span className="min-w-0 flex-1">
                      <ValorSinDato valor={direccion.codigo_postal} />
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin dirección registrada.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 p-4">
              <Seccion titulo="Ítems" />
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin ítems registrados.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {item.titulo}
                        </p>
                        <p className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground">
                          {item.sku || "Sin SKU"} · ×{item.cantidad}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-base font-semibold text-white tabular-nums">
                          {formatMoneda(item.precio_unitario)}
                        </p>
                        <p className="font-mono text-[0.7rem] text-muted-foreground tabular-nums">
                          {formatMoneda(item.precio_unitario * item.cantidad)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}