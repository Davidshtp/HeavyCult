"use client";

import type { ReactNode } from "react";
import {
  ClipboardCheckIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { formatMoneda } from "@/lib/format";
import { EncabezadoPaso } from "./encabezado-paso";
import { etiquetaVariante } from "./tipos";
import type { NuevoPedidoController } from "./use-nuevo-pedido";

export function PasoConfirmar({ pedido }: { pedido: NuevoPedidoController }) {
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
    observacion,
  } = pedido;

  const nombreCompleto = `${nombre} ${apellido}`.trim();
  const ubicacion =
    [nombreMunicipio, nombreDepartamento].filter(Boolean).join(", ") || "—";

  return (
    <section className="space-y-4">
      <EncabezadoPaso
        icono={ClipboardCheckIcon}
        titulo="Confirmar"
        nota="Revisá los datos antes de crear el pedido en Shopify."
      />

      {producto && variante && (
        <Tarjeta icono={PackageIcon} titulo="Producto">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
              {producto.url_imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={producto.url_imagen}
                  alt={producto.titulo}
                  className="size-full object-cover"
                />
              ) : (
                <PackageIcon className="size-4 text-white/40" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {producto.titulo}
              </p>
              <p className="mt-0.5 font-mono text-[0.7rem] text-white/50">
                {etiquetaVariante(variante)} · {cantidad} ×{" "}
                {formatMoneda(precioUnitario)}
              </p>
            </div>
            <span className="font-mono text-sm font-semibold text-brand-200">
              {formatMoneda(total)}
            </span>
          </div>
        </Tarjeta>
      )}

      <Tarjeta icono={UserRoundIcon} titulo="Cliente">
        <Dato etiqueta="Nombre" valor={nombreCompleto || "—"} />
        <Dato etiqueta="Correo" valor={email || "—"} />
        <Dato etiqueta="Teléfono" valor={telefono || "—"} />
      </Tarjeta>

      <Tarjeta icono={MapPinIcon} titulo="Entrega">
        <Dato etiqueta="Dirección" valor={calle.trim() || "Sin especificar"} />
        <Dato etiqueta="Municipio" valor={ubicacion} />
      </Tarjeta>

      {observacion.trim() && (
        <Tarjeta icono={ClipboardCheckIcon} titulo="Observación">
          <p className="text-sm text-white/70">{observacion.trim()}</p>
        </Tarjeta>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
        <TruckIcon className="size-4 shrink-0" />
        <span>
          El pedido se crea <strong className="font-semibold">contraentrega</strong>{" "}
          (pago pendiente) y se envía a Shopify.
        </span>
      </div>
    </section>
  );
}

function Tarjeta({
  icono: Icono,
  titulo,
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <p className="mb-2.5 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
        <Icono className="size-3.5 text-brand-300" /> {titulo}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-white/45">{etiqueta}</span>
      <span className="text-right text-sm text-white/85">{valor}</span>
    </div>
  );
}
