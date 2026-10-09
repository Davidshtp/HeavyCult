"use client";

import Link from "next/link";
import { useState } from "react";
import { LayersIcon, TriangleAlertIcon } from "lucide-react";
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
        className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
    );
  }

  return (
    <span className="grid size-full place-items-center bg-brand-500/10 font-mono text-3xl font-semibold text-brand-300/70">
      {(producto.titulo.match(/[A-Za-z]/) ?? ["?"])[0].toUpperCase()}
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

  return (
    <Link
      href={`/dashboard/productos/${encodeURIComponent(producto.id_producto)}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-card/40 transition hover:border-brand-500/50 hover:bg-card/70 focus-visible:border-brand-500/60 focus-visible:ring-[3px] focus-visible:ring-brand-500/20"
    >
      <div className="relative aspect-square overflow-hidden bg-white/[0.02]">
        <Portada producto={producto} />

        <div className="absolute top-3 left-3">
          <EtiquetaEstadoProducto estado={producto.estado} />
        </div>

        {extraImagenes > 0 && (
          <span className="absolute top-3 right-3 rounded-lg border border-white/15 bg-black/65 px-2 py-1 font-mono text-[0.65rem] text-white/80">
            +{extraImagenes}
          </span>
        )}

        {producto.stock === 0 && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-1 font-mono text-[0.65rem] font-semibold text-black">
            <TriangleAlertIcon className="size-3" />
            Sin stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-semibold text-white">{producto.titulo}</h3>
          <p className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
            {[producto.proveedor, proveedor.ciudad.join(" · ")]
              .filter(Boolean)
              .join(" · ") || producto.handle}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="font-mono text-lg font-semibold text-white tabular-nums">
            {rangoPrecio(producto)}
          </p>
          <p className="font-mono text-[0.7rem] text-muted-foreground tabular-nums">
            Costo {producto.costo_min === null ? "—" : formatMoneda(producto.costo_min)}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
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

        {producto.opciones.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {producto.opciones.slice(0, 3).map((opcion) => (
              <span
                key={opcion.nombre}
                className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground"
              >
                {opcion.nombre}: {opcion.valores.length}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}