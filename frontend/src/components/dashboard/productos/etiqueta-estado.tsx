"use client";

import type { EstadoProductoShopify } from "@/lib/types";

/**
 * Los productos usan los estados reales de Shopify (ACTIVE, ARCHIVED, DRAFT,
 * UNLISTED) y no el "activo/inactivo" del panel de usuarios, así que esta
 * etiqueta es aparte de EstadoBadge.
 */
const ETIQUETA: Record<EstadoProductoShopify, string> = {
  ACTIVE: "Activo",
  ARCHIVED: "Archivado",
  DRAFT: "Borrador",
  UNLISTED: "No listado",
};

const VARIANTES: Record<EstadoProductoShopify, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300",
  ARCHIVED: "bg-amber-500/15 text-amber-300",
  DRAFT: "bg-muted text-muted-foreground",
  UNLISTED: "bg-violet-500/15 text-violet-300",
};

export function EtiquetaEstadoProducto({
  estado,
  className = "",
}: {
  estado: EstadoProductoShopify;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[0.65rem] ${VARIANTES[estado]} ${className}`}
    >
      {ETIQUETA[estado]}
    </span>
  );
}