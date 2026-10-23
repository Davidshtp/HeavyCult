"use client";

import Link from "next/link";
import { useState } from "react";
import { ImagesIcon, LayersIcon, TriangleAlertIcon } from "lucide-react";
import { formatMoneda } from "@/lib/format";
import { urlImagen } from "@/components/dashboard/productos/producto-galeria";
import { EtiquetaEstadoProducto } from "@/components/dashboard/productos/etiqueta-estado";
import { usarCiudad } from "@/lib/tags-producto";
import type { Producto } from "@/lib/types";

function Portada({ producto }: { producto: Producto }) {
  const imagen = producto.imagenes[0];
  const [roto, setRoto] = useState(false);
  const [primera, setPrimera] = useState(true);

  if (imagen && !roto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={urlImagen(imagen.url, 700)}
        alt={imagen.alt || producto.titulo}
        loading={primera ? "eager" : "lazy"}
        onError={() => setRoto(true)}
        onLoad={() => setPrimera(false)}
        className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
      />
    );
  }

  const inicial = (producto.titulo.match(/[A-Za-z]/) ?? ["?"])[0].toUpperCase();

  return (
    <span className="relative grid size-full place-items-center overflow-hidden bg-linear-to-br from-brand-500/20 via-brand-500/5 to-transparent">
      <span className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full bg-brand-500/20 blur-2xl" />
      <span className="font-mono text-4xl font-semibold text-brand-300/70">
        {inicial}
      </span>
    </span>
  );
}

function rangoPrecio(producto: Producto): string {
  if (producto.precio_min === producto.precio_max) {
    return formatMoneda(producto.precio_min);
  }
  return `${formatMoneda(producto.precio_min)} – ${formatMoneda(producto.precio_max)}`;
}

export function ProductoTarjeta({ producto }: { producto: Producto }) {
  const sinStock = producto.variantes.filter((v) => v.stock <= 0).length;
  const extraImagenes = Math.max(0, producto.imagenes.length - 1);
  const proveedor = usarCiudad(producto.tags);
  const metadato =
    [producto.proveedor, proveedor.ciudad.join(" · ")]
      .filter(Boolean)
      .join(" · ") || producto.handle;

  return (
    <Link
      href={`/dashboard/productos/${encodeURIComponent(producto.id_producto)}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/40 transition duration-300 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-card/70 hover:shadow-[0_12px_40px_-16px_rgba(139,92,246,0.35)] focus-visible:border-brand-500/60 focus-visible:ring-[3px] focus-visible:ring-brand-500/20"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-linear-to-r from-transparent via-brand-500/70 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.02]">
        <Portada producto={producto} />

        <div className="absolute top-3 left-3">
          <EtiquetaEstadoProducto estado={producto.estado} />
        </div>

        {extraImagenes > 0 && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-white/15 bg-black/65 px-2 py-1 font-mono text-[0.65rem] text-white/80 backdrop-blur-sm">
            <ImagesIcon className="size-3" />
            +{extraImagenes}
          </span>
        )}

        {producto.stock === 0 && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-1 font-mono text-[0.65rem] font-semibold text-black shadow-sm">
            <TriangleAlertIcon className="size-3" />
            Sin stock
          </span>
        )}

        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/30 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">{producto.titulo}</h3>
          <p className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
            {metadato}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="font-mono text-lg font-semibold text-white tabular-nums">
            {rangoPrecio(producto)}
          </p>
          {producto.costo_min !== null && (
            <p className="font-mono text-[0.7rem] text-muted-foreground tabular-nums">
              Costo {formatMoneda(producto.costo_min)}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-2.5">
          <span
            className={`font-mono text-[0.72rem] tabular-nums ${
              producto.stock === 0 ? "text-amber-300" : "text-muted-foreground"
            }`}
          >
            {producto.stock} und
            {sinStock > 0 && (
              <span className="text-amber-300/80"> · {sinStock} sin stock</span>
            )}
          </span>
          <span className="flex items-center gap-1 font-mono text-[0.72rem] text-muted-foreground">
            <LayersIcon className="size-3.5" />
            {producto.variantes.length}
          </span>
        </div>
      </div>
    </Link>
  );
}