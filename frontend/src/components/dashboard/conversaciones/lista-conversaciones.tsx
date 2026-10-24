"use client";

import { MessageSquareDashedIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { formatTiempoRelativo } from "@/lib/format";
import type { ConversacionWhatsapp } from "@/lib/whatsapp-api";
import {
  ETAPA_CONVERSACION_LABEL,
  colorEtapa,
  inicialesContacto,
  nombreContacto,
  previewMensaje,
} from "@/lib/whatsapp-utils";

export function ListaConversaciones({
  conversaciones,
  seleccionadaId,
  onSeleccionar,
  cargando,
  error,
  onReintentar,
}: {
  conversaciones: ConversacionWhatsapp[];
  seleccionadaId: number | null;
  onSeleccionar: (conversacion: ConversacionWhatsapp) => void;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}) {
  if (cargando) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 7 }).map((_, indice) => (
          <div key={indice} className="flex gap-3 rounded-xl p-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={onReintentar}>
          <RefreshCwIcon />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!conversaciones.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/40">
          <MessageSquareDashedIcon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-white/85">
            No hay conversaciones
          </p>
          <p className="mt-1 max-w-56 text-sm text-white/45">
            Cuando un cliente escriba a la instancia conectada aparecerá aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 overflow-y-auto p-1.5">
      {conversaciones.map((conversacion) => {
        const activa = conversacion.id_conversacion === seleccionadaId;
        const noLeidos = conversacion.no_leidos > 0;

        return (
          <button
            key={conversacion.id_conversacion}
            type="button"
            onClick={() => onSeleccionar(conversacion)}
            aria-current={activa ? "true" : undefined}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
              activa
                ? "bg-brand-500/12 ring-1 ring-brand-500/25"
                : "hover:bg-white/[0.05]",
            )}
          >
            <span className="relative shrink-0">
              {noLeidos && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 z-10 size-3.5 animate-pulse rounded-full border-2 border-background bg-brand-400 shadow-[0_0_12px_rgb(167_139_250/0.8)]"
                />
              )}
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-full border text-sm font-semibold",
                  activa
                    ? "border-brand-400/35 bg-brand-500/15 text-brand-200"
                    : "border-white/10 bg-white/[0.05] text-white/65",
                  noLeidos && "border-brand-400/50",
                )}
              >
                {inicialesContacto(conversacion.contacto)}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    noLeidos ? "text-white" : "text-white/85",
                  )}
                >
                  {nombreContacto(conversacion.contacto)}
                </span>
                <span className="shrink-0 text-[0.7rem] text-white/35">
                  {formatTiempoRelativo(
                    conversacion.ultimo_mensaje_at ??
                      conversacion.fecha_creacion,
                  ).replace("Hace ", "")}
                </span>
              </span>

              <span className="mt-0.5 flex items-center gap-2">
                <span
                  className={cn(
                    "line-clamp-1 min-w-0 flex-1 text-sm",
                    noLeidos ? "text-white/70" : "text-white/40",
                  )}
                >
                  {previewMensaje(conversacion.ultimo_mensaje)}
                </span>
                {noLeidos && (
                  <span className="grid h-5 min-w-5 shrink-0 animate-pulse place-items-center rounded-full bg-brand-500 px-1.5 text-[0.7rem] font-semibold text-white shadow-[0_0_14px_rgb(139_92_246/0.35)]">
                    {conversacion.no_leidos > 99
                      ? "99+"
                      : conversacion.no_leidos}
                  </span>
                )}
              </span>

              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[0.68rem] font-medium",
                    colorEtapa(conversacion.etapa),
                  )}
                >
                  {ETAPA_CONVERSACION_LABEL[conversacion.etapa]}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.68rem] text-white/40">
                  {conversacion.instancia.nombre}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
