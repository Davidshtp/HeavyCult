"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Solo recibe los tags editables. Los de ciudad llegan aparte, bloqueados: salen
 * del proveedor y escribirlos a mano dejaría el producto fuera de los listados
 * por ciudad.
 */
export function EditorTags({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [nuevo, setNuevo] = useState("");

  function agregar() {
    const valor = nuevo.trim();
    if (!valor) return;
    // Shopify no admite tags repetidos y compara sin distinguir mayúsculas.
    const yaExiste = tags.some(
      (tag) => tag.toLowerCase() === valor.toLowerCase(),
    );
    if (!yaExiste) onChange([...tags, valor]);
    setNuevo("");
  }

  return (
    <div className="space-y-2.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-md border border-brand-500/25 bg-brand-500/10 py-0.5 pr-1 pl-1.5 text-[0.65rem] text-white/80"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Quitar ${tag}`}
                className="rounded p-0.5 text-white/40 transition-colors hover:text-white"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Añadir etiqueta y pulsar Enter"
          aria-label="Nueva etiqueta"
          className="h-9 text-sm"
        />
        <button
          type="button"
          onClick={agregar}
          disabled={!nuevo.trim()}
          aria-label="Añadir etiqueta"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:text-white disabled:opacity-40"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
