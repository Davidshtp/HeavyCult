"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  BoxesIcon,
  CircleDollarSignIcon,
  HashIcon,
  LayersIcon,
  LockIcon,
  PencilIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TagIcon,
  Trash2Icon,
  TriangleAlertIcon,
  WarehouseIcon,
} from "lucide-react";
import { DescripcionProducto } from "@/components/dashboard/productos/descripcion-producto";
import { EditorGarantias } from "@/components/dashboard/productos/editor-garantias";
import type { BorradorGarantia } from "@/lib/borrador-producto";
import { EditorImagenes } from "@/components/dashboard/productos/editor-imagenes";
import { EditorTags } from "@/components/dashboard/productos/editor-tags";
import { EtiquetaEstadoProducto } from "@/components/dashboard/productos/etiqueta-estado";
import {
  GarantiaProducto,
  parsearGarantias,
} from "@/components/dashboard/productos/garantia-producto";
import { ProductoEliminarModal } from "@/components/dashboard/productos/producto-eliminar-modal";
import { ProductoGaleria } from "@/components/dashboard/productos/producto-galeria";
import { useTituloPagina } from "@/components/dashboard/topbar-titulo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const EditorDescripcion = dynamic(
  () =>
    import("@/components/dashboard/productos/editor-descripcion").then(
      (m) => m.EditorDescripcion,
    ),
  { ssr: false },
);
import { cn } from "cn";
import {
  crearBorrador,
  diferenciasGarantia,
  diferenciasProducto,
  tagsConCiudadIntacta,
  variantesConPrecioCambiado,
} from "@/lib/borrador-producto";
import { formatFecha, formatMoneda } from "@/lib/format";
import { usarCiudad } from "@/lib/tags-producto";
import {
  actualizarGarantia,
  actualizarProducto,
  actualizarVariantes,
  obtenerProducto,
} from "@/lib/dashboard-api";
import { ApiClientError } from "@/lib/api";
import type { BorradorProducto } from "@/lib/borrador-producto";
import type { Producto } from "@/lib/types";

/** Tarjeta de dato suelto; la primera de la fila va destacada. */
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

/** Rótulo de sección, en el mismo estilo que las otras etiquetas del panel. */
function Seccion({ titulo }: { titulo: string }) {
  return (
    <h2 className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-white/40">
      {titulo}
    </h2>
  );
}

/** Precio de una variante: texto al leer, input al editar. */
function Precio({
  editando,
  valor,
  alCambiar,
  etiqueta,
}: {
  editando: boolean;
  valor: number;
  alCambiar: (valor: number) => void;
  etiqueta: string;
}) {
  if (!editando) {
    return (
      <span className="font-mono tabular-nums text-white">
        {formatMoneda(valor)}
      </span>
    );
  }

  return (
    <Input
      defaultValue={valor}
      onChange={(e) => {
        // Se acepta vacío para poder retocar el número; NaN se ignora al guardar.
        const bruto = e.target.value.replace(/[^\d.]/g, "");
        alCambiar(bruto === "" ? Number.NaN : Number(bruto));
      }}
      onFocus={(e) => e.currentTarget.select()}
      inputMode="decimal"
      aria-label={`Precio de ${etiqueta}`}
      className="ml-auto h-8 w-28 text-right font-mono text-xs"
    />
  );
}

export function ProductoDetallePanel({ id }: { id: string }) {
  const router = useRouter();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrador, setBorrador] = useState<BorradorProducto | null>(null);
  const [garantias, setGarantias] = useState<BorradorGarantia[]>([]);

  // El topbar pasa a mostrar el nombre del producto en vez de la ruta.
  useTituloPagina(producto?.titulo ?? null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setProducto(await obtenerProducto(id));
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 404) {
        setError("Ese producto ya no existe en Shopify.");
        return;
      }
      if (e instanceof ApiClientError && e.statusCode === 403) {
        router.replace("/dashboard");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo cargar el producto.");
    } finally {
      setCargando(false);
    }
  }, [id, router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const { ciudad, otros } = useMemo(
    () => usarCiudad(producto?.tags ?? []),
    [producto?.tags],
  );

  const empezarEdicion = useCallback(() => {
    if (!producto) return;
    setBorrador(crearBorrador(producto));
    setGarantias(
      parsearGarantias(producto.garantia).map((g) => ({
        titulo: g.titulo,
        detalle: g.detalle,
      })),
    );
    setEditando(true);
  }, [producto]);

  const cancelarEdicion = useCallback(() => {
    // El borrador se descarta: los inputs se vuelven a leer del producto.
    setBorrador(null);
    setGarantias([]);
    setEditando(false);
  }, []);

  const guardar = useCallback(async () => {
    if (!producto || !borrador) return;

    const cambios = diferenciasProducto(producto, borrador);
    const precios = variantesConPrecioCambiado(producto, borrador);
    const garantia = diferenciasGarantia(producto, garantias);

    if (!cambios && precios.length === 0 && garantia === null) {
      toast.info("No hay cambios que guardar.");
      cancelarEdicion();
      return;
    }

    setGuardando(true);
    const aviso = toast.loading("Guardando cambios en Shopify…");
    try {
      // Hasta tres mutaciones en paralelo y un único GET al final: el backend ya
      // no devuelve el producto, así que recargar evita que la vista se quede con
      // precios viejos, tags sin normalizar o la garantía sin parsear.
      await Promise.all([
        cambios
          ? actualizarProducto(producto.id_producto, {
              ...cambios,
              // `diferenciasProducto` solo incluye `tags` si el usuario los
              // cambió. Si no vinieron, no se manda el campo: reconstruir la
              // lista desde cero dejaría solo las ciudades y borraría el resto.
              ...(cambios.tags
                ? { tags: tagsConCiudadIntacta(producto, cambios.tags) }
                : {}),
            })
          : Promise.resolve(),
        precios.length > 0
          ? actualizarVariantes(producto.id_producto, precios)
          : Promise.resolve(),
        garantia !== null
          ? actualizarGarantia(producto.id_producto, garantia)
          : Promise.resolve(),
      ]);

      setProducto(await obtenerProducto(id));
      toast.success("Cambios guardados en Shopify.", {
        id: aviso,
        description: [
          cambios ? "producto" : null,
          precios.length > 0
            ? `${precios.length} precio${precios.length === 1 ? "" : "s"}`
            : null,
          garantia !== null ? "garantía" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      cancelarEdicion();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudieron guardar los cambios.",
        { id: aviso },
      );
    } finally {
      setGuardando(false);
    }
  }, [borrador, cancelarEdicion, garantias, id, producto]);

  /** Recarga sin quitar el spinner de la vista: lo usan los editores de imagen. */
  const recargar = useCallback(async () => {
    try {
      setProducto(await obtenerProducto(id));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo recargar el producto.",
      );
    }
  }, [id]);

  if (cargando) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <TriangleAlertIcon className="size-9 text-amber-300" />
        <p className="max-w-sm text-sm text-muted-foreground">
          {error ?? "Producto no encontrado."}
        </p>
        <div className="flex gap-2">
          <Link
            href="/dashboard/productos"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeftIcon className="size-4" />
            Volver al catálogo
          </Link>
          <Button onClick={cargar}>
            <RefreshCwIcon className="size-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const rangoPrecio =
    producto.precio_min === producto.precio_max
      ? formatMoneda(producto.precio_min)
      : `${formatMoneda(producto.precio_min)} – ${formatMoneda(producto.precio_max)}`;
  const sinStock = producto.variantes.filter((v) => v.stock <= 0);
  const muchasVariantes = producto.variantes.length > 12;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ cabecera */}
      <header className="space-y-3">
        <Link
          href="/dashboard/productos"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 self-start",
          )}
        >
          <ArrowLeftIcon className="size-4" />
          Catálogo
        </Link>

        <div className="flex flex-col justify-between gap-4 2xl:flex-row 2xl:items-end">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <EtiquetaEstadoProducto estado={producto.estado} />
              <span className="flex items-center gap-1 font-mono text-[0.7rem] text-muted-foreground">
                <HashIcon className="size-3" />
                {producto.handle}
              </span>
              <span className="font-mono text-[0.7rem] text-muted-foreground">
                Creado el {formatFecha(producto.creado)}
              </span>
            </div>

            {editando && borrador ? (
              <Input
                value={borrador.titulo}
                onChange={(e) =>
                  setBorrador({ ...borrador, titulo: e.target.value })
                }
                aria-label="Título del producto"
                className="h-auto max-w-2xl py-2 text-xl font-semibold xl:text-2xl"
              />
            ) : (
              <h1 className="text-2xl font-semibold text-white xl:text-3xl">
                {producto.titulo}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-1.5 text-sm">
                <WarehouseIcon className="size-3.5 text-white/40" />
                <span className="text-white/50">Proveedor</span>
                <span className="font-medium text-white/90">
                  {producto.proveedor ?? "—"}
                </span>
                {ciudad.length > 0 && (
                  <>
                    <span className="text-white/30">·</span>
                    <span className="font-mono text-white/70">
                      {ciudad.join(" · ")}
                    </span>
                  </>
                )}
              </span>

              {editando && borrador ? (
                <span className="flex items-start gap-1.5">
                  <TagIcon className="mt-0.5 size-3.5 text-white/40" />
                  <div className="w-full max-w-md">
                    <EditorTags
                      tags={otros}
                      onChange={(tags) =>
                        setBorrador({ ...borrador, tags })
                      }
                    />
                  </div>
                </span>
              ) : (
                otros.length > 0 && (
                  <span className="flex flex-wrap items-center gap-1">
                    <TagIcon className="size-3.5 text-white/40" />
                    {otros.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.65rem] text-white/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {editando ? (
              <>
                <Button variant="ghost" onClick={cancelarEdicion} disabled={guardando}>
                  Cancelar
                </Button>
                <Button onClick={guardar} disabled={guardando}>
                  <RefreshCwIcon
                    className={cn("size-4", guardando && "animate-spin")}
                  />
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={empezarEdicion}>
                  <PencilIcon className="size-4" />
                  Editar producto
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive/80 hover:text-destructive"
                  onClick={() => setEliminando(true)}
                >
                  <Trash2Icon className="size-4" />
                  Eliminar
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------- rail + espacio de trabajo */}
      <div className="grid items-start gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* Columna angosta: se queda pegada al hacer scroll. */}
        <div className="space-y-4 xl:sticky xl:top-24">
          <ProductoGaleria
            imagenes={producto.imagenes}
            titulo={producto.titulo}
          />

          {editando ? (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <h2 className="mb-3 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/40">
                <ShieldCheckIcon className="size-3.5 text-brand-400" />
                Imágenes
                <span className="text-white/25">
                  ({producto.imagenes.length})
                </span>
              </h2>
              <EditorImagenes
                productoId={producto.id_producto}
                imagenes={producto.imagenes}
                alCambiar={recargar}
              />
            </section>
          ) : (
            <GarantiaProducto texto={producto.garantia} />
          )}
        </div>

        {/* Columna ancha: precio, variantes y descripción. */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Dato icono={CircleDollarSignIcon} etiqueta="Precio de venta" destacado>
              {rangoPrecio}
            </Dato>
            <Dato icono={CircleDollarSignIcon} etiqueta="Costo">
              {producto.costo_min === null ? "—" : formatMoneda(producto.costo_min)}
            </Dato>
            <Dato icono={BoxesIcon} etiqueta="Unidades">
              <span className={producto.stock === 0 ? "text-amber-300" : ""}>
                {producto.stock} und
              </span>
              {sinStock.length > 0 && (
                <span className="mt-0.5 block text-[0.62rem] text-amber-300/80">
                  {sinStock.length} variante(s) en cero
                </span>
              )}
            </Dato>
          </div>

          {sinStock.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
              <TriangleAlertIcon className="size-4 shrink-0" />
              Sin stock:
              <span className="font-mono text-xs">
                {sinStock
                  .map(
                    (v) => v.opciones.map((o) => o.valor).join(" · ") || v.titulo,
                  )
                  .join(", ")}
              </span>
            </div>
          )}

          {editando && borrador && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <Seccion titulo="Tipo de producto" />
              <Input
                value={borrador.tipo}
                onChange={(e) =>
                  setBorrador({ ...borrador, tipo: e.target.value })
                }
                placeholder="Sin tipo"
                aria-label="Tipo de producto"
                className="h-10 text-sm"
              />
              <p className="mt-2 text-xs text-white/35">
                Vaciar el campo quita el tipo en Shopify.
              </p>
            </section>
          )}

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10">
            <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <LayersIcon className="size-4 text-brand-400" />
                Variantes
                <span className="font-mono text-xs text-muted-foreground">
                  ({producto.variantes.length})
                </span>
              </h2>
              {muchasVariantes && (
                <span className="font-mono text-[0.65rem] text-white/35">
                  scrolls dentro del recuadro
                </span>
              )}
            </header>

            {producto.variantes.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Este producto no tiene variantes.
              </p>
            ) : (
              <div
                className={cn(
                  "min-h-0 flex-1 overflow-auto",
                  muchasVariantes && "max-h-[28rem]",
                )}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                    <tr className="border-b border-white/10 text-left font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/40">
                      <th className="px-4 py-2 font-normal">Variante</th>
                      <th className="px-4 py-2 font-normal">SKU</th>
                      <th className="px-4 py-2 text-right font-normal">
                        Precio de venta
                      </th>
                      <th className="px-4 py-2 text-right font-normal">Costo</th>
                      <th className="px-4 py-2 text-center font-normal">
                        {editando ? (
                          <span
                            className="flex items-center justify-center gap-1"
                            title="El stock se ajusta en Shopify: aquí no se puede cambiar"
                          >
                            <LockIcon className="size-3" />
                            Stock
                          </span>
                        ) : (
                          "Stock"
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {producto.variantes.map((variante) => {
                      const etiqueta =
                        variante.opciones.map((o) => o.valor).join(" · ") ||
                        variante.titulo;
                      return (
                        <tr
                          key={variante.id_variante}
                          className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-2.5">
                            <span className="block font-medium text-white">
                              {etiqueta}
                            </span>
                            {variante.opciones.length > 1 && (
                              <span className="mt-0.5 block font-mono text-[0.65rem] text-white/35">
                                {variante.opciones
                                  .map((o) => `${o.nombre}: ${o.valor}`)
                                  .join(" · ")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {variante.sku ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Precio
                              editando={editando}
                              valor={variante.precio}
                              etiqueta={etiqueta}
                              alCambiar={(precio) =>
                                setBorrador((actual) =>
                                  actual
                                    ? {
                                        ...actual,
                                        precios: {
                                          ...actual.precios,
                                          [variante.id_variante]: precio,
                                        },
                                      }
                                    : actual,
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {variante.costo === null
                              ? "—"
                              : formatMoneda(variante.costo)}
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono tabular-nums text-white/60">
                            {variante.stock}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            {editando && borrador ? (
              <>
                <Seccion titulo="Descripción" />
                <EditorDescripcion
                  key={producto.id_producto}
                  value={borrador.descripcion_html}
                  onChange={(html) =>
                    setBorrador({ ...borrador, descripcion_html: html })
                  }
                />
              </>
            ) : (
              <>
                <Seccion titulo="Descripción" />
                <DescripcionProducto html={producto.descripcion_html} />
              </>
            )}
          </section>

          {editando && (
            <>
              <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h2 className="mb-3 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-white/40">
                  <ShieldCheckIcon className="size-3.5 text-brand-400" />
                  Garantía
                </h2>
                <EditorGarantias
                  garantias={garantias}
                  onChange={setGarantias}
                />
                <p className="mt-2 text-xs text-white/35">
                  Se guarda como texto en el metafield de Shopify, con un bloque
                  por garantía separado por una línea en blanco.
                </p>
              </section>

              <p className="text-xs text-white/35">
                SKU, stock, costo, handle, estado y proveedor se administran en
                Shopify; no se pueden cambiar desde acá.
              </p>
            </>
          )}
        </div>
      </div>

      <ProductoEliminarModal
        open={eliminando}
        producto={producto}
        onOpenChange={setEliminando}
        onEliminado={async () => {
          setEliminando(false);
          toast.success("Producto eliminado de Shopify.", {
            description: producto?.titulo,
          });
          router.replace("/dashboard/productos");
        }}
      />
    </div>
  );
}
