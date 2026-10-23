"use client";

import {
  CheckIcon,
  ClipboardCheckIcon,
  MapPinIcon,
  PackageIcon,
  UserRoundIcon,
} from "lucide-react";
import { cn } from "cn";
import { PASOS, type PasoId } from "./tipos";

const ICONOS: Record<PasoId, typeof PackageIcon> = {
  producto: PackageIcon,
  cliente: UserRoundIcon,
  envio: MapPinIcon,
  confirmar: ClipboardCheckIcon,
};

interface IndicadorPasosProps {
  paso: number;
  pasosValidos: boolean[];
  onIr: (indice: number) => void;
}

export function IndicadorPasos({
  paso,
  pasosValidos,
  onIr,
}: IndicadorPasosProps) {
  return (
    <nav aria-label="Progreso del pedido">
      <ol className="flex items-center gap-1.5">
        {PASOS.map((etapa, indice) => {
          const Icono = ICONOS[etapa.id];
          const activo = indice === paso;
          const completo = indice < paso;
          const alcanzable =
            indice <= paso || pasosValidos.slice(paso, indice).every(Boolean);

          return (
            <li key={etapa.id} className="flex flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onIr(indice)}
                disabled={!alcanzable}
                aria-current={activo ? "step" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                  alcanzable
                    ? "hover:bg-white/[0.04]"
                    : "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-300",
                    activo &&
                      "border-brand-400/70 bg-brand-500/20 text-brand-200 ring-2 ring-brand-500/15",
                    completo && "border-brand-500/40 bg-brand-500/15 text-brand-300",
                    !activo &&
                      !completo &&
                      "border-white/10 bg-white/[0.03] text-white/40",
                  )}
                >
                  {completo ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <Icono className="size-4" />
                  )}
                </span>
                <span className="hidden flex-col leading-tight sm:flex">
                  <span
                    className={cn(
                      "font-mono text-[0.6rem] uppercase tracking-[0.16em]",
                      activo ? "text-brand-300" : "text-white/35",
                    )}
                  >
                    Paso {indice + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      activo ? "text-white" : "text-white/60",
                    )}
                  >
                    {etapa.titulo}
                  </span>
                </span>
              </button>
              {indice < PASOS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1 rounded-full transition-colors",
                    completo ? "bg-brand-500/40" : "bg-white/10",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
