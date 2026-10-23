"use client";

import type { LucideIcon } from "lucide-react";

interface Props {
  icono: LucideIcon;
  titulo: string;
  nota?: string;
}

export function EncabezadoPaso({ icono: Icono, titulo, nota }: Props) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-300">
        <Icono className="size-4" />
      </span>
      <div className="min-w-0">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
          {titulo}
        </h3>
        {nota && <p className="mt-0.5 text-xs text-white/45">{nota}</p>}
      </div>
    </div>
  );
}
