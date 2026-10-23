"use client";

import type { EstadoFinancieroPedido } from "@/lib/types";

const ETIQUETA: Record<EstadoFinancieroPedido, string> = {
  PENDING: "Pendiente",
  AUTHORIZED: "Autorizado",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagado",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  REFUNDED: "Reembolsado",
  VOIDED: "Anulado",
};

const VARIANTES: Record<EstadoFinancieroPedido, string> = {
  PENDING: "bg-amber-500/15 text-amber-300",
  AUTHORIZED: "bg-brand-500/15 text-brand-300",
  PARTIALLY_PAID: "bg-brand-500/15 text-brand-300",
  PAID: "bg-emerald-500/15 text-emerald-300",
  PARTIALLY_REFUNDED: "bg-violet-500/15 text-violet-300",
  REFUNDED: "bg-violet-500/15 text-violet-300",
  VOIDED: "bg-muted text-muted-foreground",
};

export function EtiquetaEstadoPedido({
  estado,
  className = "",
}: {
  estado: EstadoFinancieroPedido;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[0.65rem] ${
        VARIANTES[estado] ?? "bg-muted text-muted-foreground"
      } ${className}`}
    >
      {ETIQUETA[estado] ?? estado}
    </span>
  );
}