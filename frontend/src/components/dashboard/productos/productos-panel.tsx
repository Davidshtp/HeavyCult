"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  BoxesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterXIcon,
  LayersIcon,
  Loader2,
  PackageIcon,
  RefreshCwIcon,
  SearchIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/dashboard/section-header";
import { ProductoTarjeta } from "@/components/dashboard/productos/producto-tarjeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listarProductos, sincronizarDropi } from "@/lib/dashboard-api";
import { ApiClientError } from "@/lib/api";
import type { ProductosPagina } from "@/lib/types";

const POR_PAGINA_OPCIONES = [12, 24, 48];

function numerosPaginas(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas: (number | "…")[] = [1];
  const inicio = Math.max(2, actual - 1);
  const fin = Math.min(total - 1, actual + 1);
  if (inicio > 2) paginas.push("…");
  for (let i = inicio; i <= fin; i += 1) paginas.push(i);
  if (fin < total - 1) paginas.push("…");
  paginas.push(total);
  return paginas;
}

export function ProductosPanel() {
  const router = useRouter();

  const [datos, setDatos] = useState<ProductosPagina | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [termino, setTermino] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(12);
  const [proveedor, setProveedor] = useState<string | null>(null);
  const [soloSinStock, setSoloSinStock] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  // Evita que una respuesta lenta de una búsqueda anterior pise la actual.
  const peticionEnCurso = useRef(0);

  // La búsqueda espera a que el usuario deje de escribir.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setTermino(busqueda.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    const numero = ++peticionEnCurso.current;
    setError(null);
    try {
      const respuesta = await listarProductos({
        buscar: termino,
        pagina,
        porPagina,
        sinStock: soloSinStock,
        proveedor: proveedor ?? undefined,
      });
      if (numero === peticionEnCurso.current) setDatos(respuesta);
    } catch (e) {
      if (numero === peticionEnCurso.current) {
        // Un 403 significa que la sesión no es de admin: no tiene sentido
        // quedarse mostrando el panel, se vuelve al dashboard.
        if (e instanceof ApiClientError && e.statusCode === 403) {
          router.replace("/dashboard");
          return;
        }
        setError(e instanceof Error ? e.message : "No se pudo cargar el catálogo.");
      }
    } finally {
      if (numero === peticionEnCurso.current) setCargando(false);
    }
  }, [termino, pagina, porPagina, soloSinStock, proveedor, router]);

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [cargar]);

  const resumen = datos?.resumen;

  const tarjetas = useMemo(
    () => [
      { etiqueta: "Productos", valor: resumen?.productos, icono: PackageIcon, alerta: false },
      { etiqueta: "Variantes", valor: resumen?.variantes, icono: LayersIcon, alerta: false },
      {
        etiqueta: "Sin stock",
        valor: resumen?.variantes_sin_stock,
        icono: TriangleAlertIcon,
        alerta: (resumen?.variantes_sin_stock ?? 0) > 0,
      },
      { etiqueta: "Unidades", valor: resumen?.unidades, icono: BoxesIcon, alerta: false },
    ],
    [resumen],
  );

  const filtrosActivos = useMemo(() => {
    const filtros: { id: string; etiqueta: string; limpiar: () => void }[] = [];
    if (termino) {
      filtros.push({
        id: "busqueda",
        etiqueta: `"${termino}"`,
        limpiar: () => {
          setBusqueda("");
          setTermino("");
        },
      });
    }
    if (proveedor) {
      filtros.push({
        id: "proveedor",
        etiqueta: proveedor,
        limpiar: () => setProveedor(null),
      });
    }
    if (soloSinStock) {
      filtros.push({
        id: "sin-stock",
        etiqueta: "Sin stock",
        limpiar: () => setSoloSinStock(false),
      });
    }
    return filtros;
  }, [termino, proveedor, soloSinStock]);

  function limpiarFiltros() {
    setBusqueda("");
    setTermino("");
    setProveedor(null);
    setSoloSinStock(false);
    setPagina(1);
  }

  async function manejarSync() {
    if (sincronizando) return;
    setSincronizando(true);
    try {
      const resultado = await sincronizarDropi();
      toast.success(resultado.mensaje || "Catálogo sincronizado.");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo sincronizar.");
    } finally {
      setSincronizando(false);
    }
  }

  const productos = datos?.productos ?? [];
  const totalPaginas = datos?.total_paginas ?? 1;
  const total = datos?.total ?? 0;
  const hayCatalogo = (datos?.total_variantes ?? 0) > 0;
  const hayFiltros = filtrosActivos.length > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Productos · Shopify"
        description="Catálogo sincronizado desde Shopify. Se actualiza con «Sync Dropi»."
        action={
          <Button variant="outline" onClick={manejarSync} disabled={sincronizando}>
            {sincronizando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            Sync Dropi
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((tarjeta) => {
          const Icono = tarjeta.icono;
          return (
            <div
              key={tarjeta.etiqueta}
              className="group rounded-xl border border-white/10 bg-card/40 p-4 transition hover:border-white/20"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/40">
                  {tarjeta.etiqueta}
                </p>
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${
                    tarjeta.alerta
                      ? "bg-amber-500/10 text-amber-300 group-hover:bg-amber-500/15"
                      : "bg-brand-500/10 text-brand-300 group-hover:bg-brand-500/15"
                  }`}
                >
                  <Icono className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                <span
                  className={`bg-linear-to-br bg-clip-text text-transparent ${
                    tarjeta.alerta
                      ? "from-amber-300 to-amber-500"
                      : "from-brand-400 to-violet-500"
                  }`}
                >
                  {tarjeta.valor ?? "—"}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Barra de filtros: queda pegada bajo el topbar al hacer scroll. */}
      <div className="sticky top-16 z-20 rounded-2xl border border-white/10 bg-background/85 p-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-white/40">
              <SearchIcon className="size-4" />
            </span>
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
              className="h-9 rounded-lg pl-9"
              aria-label="Buscar producto por nombre"
            />
          </div>

          <Select
            value={proveedor ?? null}
            onValueChange={(v) => {
              setProveedor((v as string | null) ?? null);
              setPagina(1);
            }}
            disabled={!resumen || resumen.proveedores.length === 0}
          >
            <SelectTrigger size="sm" className="h-9 w-40" aria-label="Filtrar por proveedor">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos</SelectItem>
              {(resumen?.proveedores ?? []).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            aria-pressed={soloSinStock}
            onClick={() => {
              setSoloSinStock((s) => !s);
              setPagina(1);
            }}
          >
            <TriangleAlertIcon className="size-3.5" />
            Solo sin stock
          </Button>

          <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />

          <Select
            value={String(porPagina)}
            onValueChange={(v) => {
              setPorPagina(Number(v));
              setPagina(1);
            }}
          >
            <SelectTrigger size="sm" className="h-9 w-20" aria-label="Productos por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POR_PAGINA_OPCIONES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex min-h-6 flex-wrap items-center gap-2">
        <p className="font-mono text-[0.75rem] text-muted-foreground">
          {cargando
            ? "Consultando Shopify…"
            : `${total} producto(s) · ${datos?.total_variantes ?? 0} variante(s)`}
        </p>
        {!cargando && hayFiltros && (
          <div className="flex flex-wrap items-center gap-1.5">
            {filtrosActivos.map((filtro) => (
              <button
                key={filtro.id}
                type="button"
                onClick={() => {
                  filtro.limpiar();
                  setPagina(1);
                }}
                className="group flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pr-1 pl-2 font-mono text-[0.68rem] text-muted-foreground transition-colors hover:border-brand-500/40 hover:text-foreground"
              >
                {filtro.etiqueta}
                <XIcon className="size-3 text-white/40 transition-colors group-hover:text-brand-300" />
              </button>
            ))}
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
      ) : cargando ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/10">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2.5 p-4">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center">
          <PackageIcon className="size-8 text-white/25" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {hayFiltros
              ? "Ningún producto coincide con los filtros aplicados. Probá ampliarlos o limpiarlos."
              : hayCatalogo
                ? "No hay productos en este rango de paginación."
                : "No hay productos sincronizados todavía. Verificá la conexión con Shopify o pulsá «Sync Dropi»."}
          </p>
          {hayFiltros ? (
            <Button variant="outline" onClick={limpiarFiltros}>
              <FilterXIcon className="size-4" />
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {productos.map((p) => (
              <ProductoTarjeta key={p.id_producto} producto={p} />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="font-mono text-[0.75rem] text-muted-foreground">
                Página {datos?.pagina} de {totalPaginas} · {total} producto(s)
              </p>
              <nav className="flex items-center gap-1.5" aria-label="Paginación">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                {numerosPaginas(pagina, totalPaginas).map((n, i) =>
                  n === "…" ? (
                    <span
                      key={`elipsis-${i}`}
                      className="px-1 font-mono text-[0.7rem] text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={n}
                      variant={n === pagina ? "default" : "outline"}
                      size="icon-sm"
                      onClick={() => setPagina(n)}
                      aria-current={n === pagina ? "page" : undefined}
                      aria-label={`Página ${n}`}
                    >
                      {n}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  aria-label="Página siguiente"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}