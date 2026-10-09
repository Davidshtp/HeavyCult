"use client";

import { useMemo, useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import {
  CheckIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";

export interface Garantia {
  titulo: string;
  estado: "aplica" | "no_aplica" | null;
  detalle: string;
}

/**
 * El metafield `informacion_de_garantia` es un multi_line_text_field. En los
 * productos reales viene así:
 *
 *   Producto incompleto · 10 días
 *   APLICA
 *
 *   Producto roto · 10 días
 *   APLICA
 *
 * Cada garantía es un bloque de líneas separadas por una línea en blanco: la
 * primera es el título, la segunda el veredicto y las siguientes el detalle. Se
 * separa por línea en blanco y no por línea simple porque un detalle puede
 * ocupar varias líneas y no debe terminar partido en varios bloques.
 */
export function parsearGarantias(texto: string | null): Garantia[] {
  if (!texto?.trim()) return [];

  // Si viene HTML se muestra tal cual, sin intentar adivinar bloques.
  if (/<\/?(p|div|ul|ol|li|h[1-6]|br|strong|em|span)\b/i.test(texto)) {
    return [{ titulo: "Garantía", estado: null, detalle: texto }];
  }

  return texto
    .split(/\n\s*\n/)
    .map((bloque) => bloque.trim())
    .filter(Boolean)
    .map((bloque) => {
      const lineas = bloque.split(/\r?\n/).map((l) => l.trim());
      const [titulo, segunda, ...resto] = lineas;

      // "APLICA" / "NO APLICA" (a veces sin espacio) en la segunda línea.
      const veredicto = (segunda ?? "").toUpperCase().replace(/\s+/g, "");
      const estado: Garantia["estado"] = veredicto.startsWith("NOAPLICA")
        ? "no_aplica"
        : veredicto.startsWith("APLICA")
          ? "aplica"
          : null;

      const detalle = (estado ? resto : lineas.slice(1)).filter(Boolean).join("\n");
      return { titulo, estado, detalle };
    });
}

function Veredicto({ estado }: { estado: Garantia["estado"] }) {
  if (!estado) return null;
  const aplica = estado === "aplica";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[0.6rem] tracking-wider",
        aplica
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-destructive/15 text-destructive",
      )}
    >
      {aplica ? <CheckIcon className="size-3" /> : <XIcon className="size-3" />}
      {aplica ? "APLICA" : "NO APLICA"}
    </span>
  );
}

export function GarantiaProducto({ texto }: { texto: string | null }) {
  const garantias = useMemo(() => parsearGarantias(texto), [texto]);
  // `manual` guarda el toggle de cada bloque; `forzado` pisa todo cuando se usa
  // "desplegar todas" y se anula en cuanto alguien abre o cierra una sola.
  const [manual, setManual] = useState<Record<number, boolean>>({});
  const [forzado, setForzado] = useState<boolean | null>(null);

  if (garantias.length === 0) return null;

  const plegables = garantias.length > 1;
  const abierta = (i: number) => forzado ?? manual[i] ?? false;

  function alternar(i: number) {
    setManual((m) => ({ ...m, [i]: !abierta(i) }));
    setForzado(null);
  }

  function alternarTodas() {
    const todasAbiertas = garantias.every((_, i) => abierta(i));
    setManual({});
    setForzado(!todasAbiertas);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <h2 className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/40">
          <ShieldCheckIcon className="size-3.5 text-brand-400" />
          Garantía
          <span className="text-white/25">({garantias.length})</span>
        </h2>

        {plegables && (
          <button
            type="button"
            onClick={alternarTodas}
            className="font-mono text-[0.65rem] text-white/45 transition hover:text-white/80"
          >
            {garantias.every((_, i) => abierta(i))
              ? "Plegar todas"
              : "Desplegar todas"}
          </button>
        )}
      </header>

      <div className="divide-y divide-white/5">
        {garantias.map((garantia, i) =>
          plegables ? (
            <Collapsible.Root
              key={i}
              open={abierta(i)}
              onOpenChange={() => alternar(i)}
            >
              <Collapsible.Trigger className="group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none">
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronDownIcon className="size-3.5 shrink-0 text-white/30 transition-transform duration-200 group-data-[panel-open]:rotate-180" />
                  <span className="truncate text-sm font-medium text-white/85">
                    {garantia.titulo}
                  </span>
                </span>
                <Veredicto estado={garantia.estado} />
              </Collapsible.Trigger>

              {garantia.detalle.trim() && (
                <Collapsible.Panel className="px-3 pb-3 pl-8 text-sm leading-relaxed whitespace-pre-line text-white/60 outline-none">
                  {garantia.detalle}
                </Collapsible.Panel>
              )}
            </Collapsible.Root>
          ) : (
            <div key={i} className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white/85">
                  {garantia.titulo}
                </span>
                <Veredicto estado={garantia.estado} />
              </div>
              {garantia.detalle.trim() && (
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-white/60">
                  {garantia.detalle}
                </p>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}