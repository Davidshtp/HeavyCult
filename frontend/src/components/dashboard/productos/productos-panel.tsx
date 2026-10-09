"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  BoxesIcon,
  LayersIcon,
  Loader2,
  PackageIcon,
  RefreshCwIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/dashboard/section-header";
import { ProductoTarjeta } from "@/components/dashboard/productos/producto-tarjeta";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function ProductosPanel() {
  const router = useRouter();

  const [datos, setDatos] = useState<ProductosPagina | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [termino, setTermino] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(12);
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
  }, [termino, pagina, porPagina, router]);

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [cargar]);

  const resumen = datos?.resumen;
  const tarjetas = useMemo(
    () => [
      { etiqueta: "Productos", valor: resumen?.productos, icono: PackageIcon },
      { etiqueta: "Variantes", valor: resumen?.variantes, icono: LayersIcon },
      {
        etiqueta: "Sin stock",
        valor: resumen?.variantes_sin_stock,
        icono: TriangleAlertIcon,
        alerta: (resumen?.variantes_sin_stock ?? 0) > 0,
      },
      { etiqueta: "Unidades", valor: resumen?.unidades, icono: BoxesIcon },
    ],
    [resumen],
  );

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
              className="rounded-xl border border-white/10 bg-card/40 p-4"
            >
              <p className="flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/40">
                <Icono
                  className={`size-3.5 ${tarjeta.alerta ? "text-amber-300" : "text-white/30"}`}
                />
                {tarjeta.etiqueta}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
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

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="size-4 text-brand-600 dark:text-brand-400" />
              Catálogo
            </CardTitle>
            <CardDescription>
              {cargando
                ? "Consultando Shopify…"
                : `${total} producto(s) · ${datos?.total_variantes ?? 0} variante(s)`}
            </CardDescription>
          </div>

          <div className="flex w-full flex-wrap items-end gap-2 md:w-auto">
            <div className="relative w-full md:max-w-64">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-white/40">
                <SearchIcon className="size-4" />
              </span>
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre…"
                className="pl-9"
                aria-label="Buscar producto por nombre"
              />
            </div>

            <Select
              value={String(porPagina)}
              onValueChange={(v) => {
                setPorPagina(Number(v));
                setPagina(1);
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-20 shrink-0">
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
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <TriangleAlertIcon className="size-8 text-amber-300" />
              <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={cargar}>
                <RefreshCwIcon className="size-4" />
                Reintentar
              </Button>
            </div>
          ) : cargando ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-96 w-full rounded-xl" />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <PackageIcon className="size-8 text-white/25" />
              <p className="max-w-sm text-sm text-muted-foreground">
                {termino
                  ? `Ningún producto coincide con "${termino}".`
                  : hayCatalogo
                    ? "No hay productos en este rango de paginación."
                    : "No hay productos sincronizados todavía. Verificá la conexión con Shopify o pulsá «Sync Dropi»."}
              </p>
              {termino ? (
                <Button variant="outline" onClick={() => setBusqueda("")}>
                  Limpiar búsqueda
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {productos.map((p) => (
                  <ProductoTarjeta
                    key={p.id_producto}
                    producto={p}
                  />
                ))}
              </div>

              {totalPaginas > 1 && (
                <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="font-mono text-[0.75rem] text-muted-foreground">
                    Página {datos?.pagina} de {totalPaginas} · {total} producto(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagina <= 1}
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagina >= totalPaginas}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}