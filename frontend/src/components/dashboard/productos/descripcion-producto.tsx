"use client";

import { useMemo } from "react";

import { analizarDescripcion } from "@/lib/html";
import { EDITOR_PROSE } from "@/components/dashboard/productos/editor-prose";

export function DescripcionProducto({ html }: { html: string }) {
  const contenido = html?.trim() ?? "";

  const analisis = useMemo(() => analizarDescripcion(contenido), [contenido]);

  if (analisis.tipo === "vacio") {
    return (
      <p className="text-sm text-muted-foreground">
        Este producto no tiene descripción.
      </p>
    );
  }

  if (analisis.tipo === "texto") {
    // Sin etiquetas no hay nada que interpretar: se respeta el texto tal cual,
    // incluidos sus saltos de línea y viñetas escritas a mano.
    return (
      <p className="text-sm leading-relaxed whitespace-pre-line text-white/75">
        {analisis.valor}
      </p>
    );
  }

  return (
    <div
      className={EDITOR_PROSE}
      dangerouslySetInnerHTML={{ __html: analisis.valor }}
    />
  );
}
