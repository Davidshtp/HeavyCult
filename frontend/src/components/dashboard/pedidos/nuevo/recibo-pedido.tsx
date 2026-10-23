"use client";

import type { ReactNode } from "react";
import { PackageIcon, ReceiptTextIcon, TruckIcon } from "lucide-react";
import { cn } from "cn";
import { formatMoneda } from "@/lib/format";
import { etiquetaVariante } from "./tipos";
import type { NuevoPedidoController } from "./use-nuevo-pedido";

interface ReciboPedidoProps {
  pedido: NuevoPedidoController;
  className?: string;
}

export function ReciboPedido({ pedido, className }: ReciboPedidoProps) {
  const {
    producto,
    variante,
    cantidad,
    precioUnitario,
    total,
    nombre,
    apellido,
    email,
    telefono,
    calle,
    nombreMunicipio,
    nombreDepartamento,
  } = pedido;

  const hayCliente = Boolean(
    nombre.trim() || apellido.trim() || email.trim() || telefono.trim(),
  );
  const hayDireccion = Boolean(
    calle.trim() || nombreMunicipio || nombreDepartamento,
  );

  return (
    <aside
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg border border-brand-400/30 bg-brand-500/15 text-brand-300">
            <ReceiptTextIcon className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold uppercase tracking-wide text-white/90">
            Recibo
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-amber-200">
          <TruckIcon className="size-3" />
          Contraentrega
        </span>
      </div>

      <div className="space-y-4 px-5 py-5">
        {producto && variante ? (
          <div className="flex gap-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {producto.url_imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={producto.url_imagen}
                  alt={producto.titulo}
                  className="size-full object-cover"
                />
              ) : (
                <span className="grid size-full place-items-center text-white/30">
                  <PackageIcon className="size-5" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-white">
                {producto.titulo}
              </p>
              <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-wide text-white/40">
                {etiquetaVariante(variante)}
              </p>
              <p className="mt-1.5 font-mono text-xs tabular-nums text-white/60">
                {cantidad} × {formatMoneda(precioUnitario)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/12 px-4 py-6 text-center">
            <PackageIcon className="mx-auto size-5 text-white/25" />
            <p className="mt-2 text-xs text-white/40">
              Todavía no elegiste un producto.
            </p>
          </div>
        )}

        <div className="space-y-1.5 border-t border-white/10 pt-4 text-sm">
          <Fila etiqueta="Subtotal" valor={formatMoneda(total)} />
          <Fila etiqueta="Envío" valor="Contraentrega" />
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-white/60">Total a cobrar</span>
            <span className="font-heading text-lg font-semibold text-white">
              {formatMoneda(total)}
            </span>
          </div>
        </div>

        {(hayCliente || hayDireccion) && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            {hayCliente && (
              <Bloque titulo="Cliente">
                <p className="text-sm text-white/90">
                  {[nombre, apellido].filter(Boolean).join(" ") || "—"}
                </p>
                {email && (
                  <p className="font-mono text-[0.7rem] text-white/50">{email}</p>
                )}
                {telefono && (
                  <p className="font-mono text-[0.7rem] text-white/50">
                    {telefono}
                  </p>
                )}
              </Bloque>
            )}
            {hayDireccion && (
              <Bloque titulo="Entrega">
                {calle.trim() && (
                  <p className="text-sm text-white/90">{calle}</p>
                )}
                <p className="text-sm text-white/70">
                  {[nombreMunicipio, nombreDepartamento]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </Bloque>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{etiqueta}</span>
      <span className="font-mono tabular-nums text-white/80">{valor}</span>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/35">
        {titulo}
      </p>
      {children}
    </div>
  );
}
