"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExpandIcon,
  ImageOffIcon,
} from "lucide-react";
import type { ImagenProducto } from "@/lib/types";

/**
 * El CDN de Shopify recorta con `?width=`. Hay que respetar el separador porque
 * estas URLs ya traen `?v=...`: usar `?width` a secas rompería el parámetro.
 */
export function urlImagen(url: string, ancho?: number): string {
  if (!ancho) return url;
  return url.includes("?") ? `${url}&width=${ancho}` : `${url}?width=${ancho}`;
}

export function ProductoGaleria({
  imagenes,
  titulo,
}: {
  imagenes: ImagenProducto[];
  titulo: string;
}) {
  const [indiceGuardado, setIndice] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const [montado, setMontado] = useState(false);

  const total = imagenes.length;
  // La lista la manda el servidor: al borrar una foto el índice guardado queda
  // fuera de rango. Se ajusta al renderizar (no en un effect: ese corre después
  // del render y ese render ya habría explotado leyendo `undefined.alt`).
  const indice = total === 0 ? 0 : Math.min(indiceGuardado, total - 1);
  const actual = imagenes[indice];

  const anterior = useCallback(() => {
    setIndice((i) => (total > 0 ? (Math.min(i, total - 1) - 1 + total) % total : 0));
  }, [total]);

  const siguiente = useCallback(() => {
    setIndice((i) => (total > 0 ? (Math.min(i, total - 1) + 1) % total : 0));
  }, [total]);

  useEffect(() => {
    setMontado(true);
  }, []);

  // Converge el estado guardado con el largo nuevo, para que la vista no salte
  // a la última imagen después de agregar o quitar una.
  useEffect(() => {
    setIndice((i) => (total === 0 ? 0 : Math.min(i, total - 1)));
  }, [total]);

  useEffect(() => {
    if (!ampliada) return;
    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmpliada(false);
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") siguiente();
    };
    window.addEventListener("keydown", manejarTecla);
    // El fondo no debe seguir desplazándose con la vista grande abierta.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = previo;
    };
  }, [ampliada, anterior, siguiente]);

  if (total === 0) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.02]">
        <div className="flex flex-col items-center gap-2 text-center">
          <ImageOffIcon className="size-7 text-white/25" />
          <p className="font-mono text-[0.75rem] text-white/35">
            Este producto no tiene imágenes
          </p>
        </div>
      </div>
    );
  }

  const descripcion = actual.alt || `${titulo} — imagen ${indice + 1} de ${total}`;

  const visor = (
    <VisorAmpliado
      actual={actual}
      descripcion={descripcion}
      indice={indice}
      total={total}
      titulo={titulo}
      onAnterior={anterior}
      onSiguiente={siguiente}
      onCerrar={() => setAmpliada(false)}
    />
  );

  return (
    <>
      <div className="space-y-3">
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlImagen(actual.url, 800)}
            alt={descripcion}
            width={actual.ancho ?? undefined}
            height={actual.alto ?? undefined}
            onError={(e) => {
              // Si la versión recortada falla, se cae a la original.
              if (!e.currentTarget.src.includes("width=")) return;
              e.currentTarget.src = actual.url;
            }}
            className="aspect-square w-full object-contain"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={anterior}
                aria-label="Imagen anterior"
                className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/60 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-black/80 hover:text-white focus-visible:opacity-100"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={siguiente}
                aria-label="Imagen siguiente"
                className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/60 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-black/80 hover:text-white focus-visible:opacity-100"
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setAmpliada(true)}
            aria-label="Ver imagen en grande"
            className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/70 px-3 py-2 font-mono text-[0.7rem] text-white/85 transition hover:bg-black/85 hover:text-white"
          >
            <ExpandIcon className="size-3.5" />
            Ver grande
          </button>

          {total > 1 && (
            <span className="absolute top-3 left-3 rounded-lg border border-white/15 bg-black/70 px-2 py-1 font-mono text-[0.7rem] text-white/80 tabular-nums">
              {indice + 1} / {total}
            </span>
          )}
        </div>

        {total > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {imagenes.map((imagen, i) => (
              <button
                key={imagen.id || imagen.url}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === indice}
                className={`overflow-hidden rounded-lg border transition ${
                  i === indice
                    ? "border-brand-500/70 ring-2 ring-brand-500/25"
                    : "border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlImagen(imagen.url, 220)}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {ampliada && montado && createPortal(visor, document.body)}
    </>
  );
}

/**
 * El visor se monta en un portal sobre `document.body` a propósito: la galería
 * vive dentro de una columna `sticky` y, anidada ahí, su `position: fixed` no
 * llega a cubrir el viewport (se veía la barra de variantes y el texto de abajo
 * por detrás). En el `body` sí cubre toda la pantalla y queda por encima de
 * cualquier contexto de apilamiento de la página.
 */
function VisorAmpliado({
  actual,
  descripcion,
  indice,
  total,
  titulo,
  onAnterior,
  onSiguiente,
  onCerrar,
}: {
  actual: ImagenProducto;
  descripcion: string;
  indice: number;
  total: number;
  titulo: string;
  onAnterior: () => void;
  onSiguiente: () => void;
  onCerrar: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${titulo}, imagen ${indice + 1} de ${total}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      onClick={onCerrar}
    >
      <div className="flex items-center justify-between p-4">
        <span className="font-mono text-xs text-white/60 tabular-nums">
          {titulo} · {indice + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg border border-white/15 px-3 py-2 font-mono text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Cerrar (Esc)
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlImagen(actual.url, 2000)}
          alt={descripcion}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {total > 1 && (
        <div
          className="flex items-center justify-center gap-3 pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onAnterior}
            aria-label="Imagen anterior"
            className="grid size-11 place-items-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <span className="font-mono text-xs text-white/50 tabular-nums">
            {indice + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onSiguiente}
            aria-label="Imagen siguiente"
            className="grid size-11 place-items-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}