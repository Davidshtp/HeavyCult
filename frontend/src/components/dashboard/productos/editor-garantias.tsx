"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BorradorGarantia } from "@/lib/borrador-producto";

function nuevaGarantia(): BorradorGarantia {
  return { titulo: "", detalle: "" };
}

/**
 * El metafield es un texto plano con bloques separados por línea en blanco, así
 * que editar por bloques es solo una forma cómoda de editar ese texto: al
 * serializar se vuelve al mismo formato que ya usa el parser de lectura, y nada
 * que no se pueda expresar en ese formato se pierde (título y detalle).
 *
 * El veredicto (APLICA / NO APLICA) no tiene sitio en el formato: en los datos
 * reales la segunda línea del bloque es texto del detalle, no un veredicto. Por
 * eso se deja el texto tal cual y solo se editan título y detalle.
 */
export function EditorGarantias({
  garantias,
  onChange,
}: {
  garantias: BorradorGarantia[];
  onChange: (garantias: BorradorGarantia[]) => void;
}) {
  const total = garantias.length;

  function editar(indice: number, parcial: Partial<BorradorGarantia>) {
    onChange(
      garantias.map((g, i) => (i === indice ? { ...g, ...parcial } : g)),
    );
  }

  function eliminar(indice: number) {
    onChange(garantias.filter((_, i) => i !== indice));
  }

  function agregar() {
    onChange([...garantias, nuevaGarantia()]);
  }

  if (total === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-white/40">
          Este producto no tiene garantía registrada.
        </p>
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
        >
          <PlusIcon className="size-4" />
          Añadir garantía
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {garantias.map((garantia, indice) => (
        <div
          key={indice}
          className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3"
        >
          <div className="flex gap-2">
            <Input
              value={garantia.titulo}
              onChange={(e) => editar(indice, { titulo: e.target.value })}
              placeholder="Motivo, por ejemplo: Producto incompleto · 10 días"
              aria-label={`Título de la garantía ${indice + 1}`}
              className="h-9 text-sm"
            />
            <button
              type="button"
              onClick={() => eliminar(indice)}
              aria-label={`Quitar la garantía ${indice + 1}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/40 transition hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>

          <Textarea
            value={garantia.detalle}
            onChange={(e) => editar(indice, { detalle: e.target.value })}
            rows={2}
            placeholder="Detalle (opcional)"
            aria-label={`Detalle de la garantía ${indice + 1}`}
            className="text-sm"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={agregar}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
      >
        <PlusIcon className="size-4" />
        Añadir garantía
      </button>
    </div>
  );
}
