"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PackagePlusIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/dashboard/section-header";
import { EtiquetaEstadoPedido } from "@/components/dashboard/pedidos/etiqueta-estado-pedido";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listarPedidos } from "@/lib/dashboard-api";
import { ApiClientError } from "@/lib/api";
import { formatFecha, formatMoneda } from "@/lib/format";
import type { PedidoListado, PaginaPedidos } from "@/lib/types";

export function PedidosPanel() {
  const router = useRouter();

  const [pagina, setPagina] = useState<PaginaPedidos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pila de cursores para poder volver página atrás (el listado de Shopify es
  // cursor-based, así que "anterior" hay que reconstruirlo manualmente).
  const historial = useRef<string[]>([]);

  const peticionEnCurso = useRef(0);

  const cargar = useCallback(
    async (cursor: string | null, esAdelante: boolean) => {
      const numero = ++peticionEnCurso.current;
      setError(null);
      setCargando(true);
      try {
        const respuesta = await listarPedidos(cursor ?? undefined);
        if (numero !== peticionEnCurso.current) return;

        if (cursor) {
          if (esAdelante) historial.current.push(cursor);
          else historial.current.pop();
        }
        setPagina(respuesta);
      } catch (e) {
        if (numero === peticionEnCurso.current) {
          if (e instanceof ApiClientError && e.statusCode === 403) {
            router.replace("/dashboard");
            return;
          }
          setError(
            e instanceof Error ? e.message : "No se pudieron cargar los pedidos.",
          );
        }
      } finally {
        if (numero === peticionEnCurso.current) setCargando(false);
      }
    },
    [router],
  );

  useEffect(() => {
    cargar(null, true);
  }, [cargar]);

  const atras = () => {
    const cursor =
      historial.current.length > 0
        ? historial.current[historial.current.length - 1]
        : null;
    cargar(cursor, false);
  };

  const pedidos = pagina?.pedidos ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pedidos · Shopify"
        description="Órdenes creadas en la tienda. La fuente de verdad es Shopify."
        action={
          <Link
            href="/dashboard/pedidos/nuevo"
            className={buttonVariants()}
          >
            <PackagePlusIcon className="size-4" />
            Nuevo pedido
          </Link>
        }
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center">
          <TriangleAlertIcon className="size-8 text-amber-300" />
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            onClick={() => cargar(historial.current.at(-1) ?? null, false)}
          >
            <RefreshCwIcon className="size-4" />
            Reintentar
          </Button>
        </div>
      ) : cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center">
          <ShoppingCartIcon className="size-8 text-white/25" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Todavía no hay pedidos en Shopify. El primero que crees va a aparecer
            acá.
          </p>
          <Link
            href="/dashboard/pedidos/nuevo"
            className={buttonVariants()}
          >
            <PackagePlusIcon className="size-4" />
            Crear un pedido
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <ul className="divide-y divide-white/5">
              {pedidos.map((pedido) => (
                <PedidoFila key={pedido.id_pedido} pedido={pedido} />
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="font-mono text-[0.75rem] text-muted-foreground">
              {historial.current.length > 0
                ? `Página ${historial.current.length + 1}`
                : ""}{" "}
              {pedidos.length} pedido(s) en esta página
            </p>
            <nav className="flex items-center gap-1.5" aria-label="Paginación">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={historial.current.length === 0 || cargando}
                onClick={atras}
                aria-label="Página anterior"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!pagina?.tiene_mas || cargando}
                onClick={() =>
                  cargar(pagina?.cursor_siguiente ?? null, true)
                }
                aria-label="Página siguiente"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

function PedidoFila({ pedido }: { pedido: PedidoListado }) {
  return (
    <li>
      <Link
        href={`/dashboard/pedidos/${encodeURIComponent(pedido.id_pedido)}`}
        className="group flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-brand-500/60"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.72rem] text-muted-foreground tabular-nums">
              {pedido.numero}
            </span>
            <EtiquetaEstadoPedido estado={pedido.estado_financiero} />
          </div>
          <p className="mt-1 truncate text-sm font-medium text-white">
            {pedido.cliente ?? "Cliente sin nombre"}
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
            {[pedido.ciudad, pedido.departamento].filter(Boolean).join(" · ") ||
              "Sin dirección"}{" "}
            · {formatFecha(pedido.creado)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-semibold text-white tabular-nums">
            {formatMoneda(pedido.total)}
          </p>
          <p className="mt-0.5 max-w-48 truncate font-mono text-[0.68rem] text-muted-foreground">
            {pedido.nota || "Sin nota"}
          </p>
        </div>
      </Link>
    </li>
  );
}