"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, StarIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { urlImagen } from "@/components/dashboard/productos/producto-galeria";
import { cn } from "cn";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { confirmarToast } from "@/lib/confirmar-toast";
import {
  agregarImagenProducto,
  eliminarImagenProducto,
  reordenarImagenesProducto,
} from "@/lib/dashboard-api";
import type { ImagenProducto } from "@/lib/types";

/**
 * Las imágenes de producto se editan en su propia vía, no dentro del guardado
 * general: subir una imagen es irreversible en el otro sentido (no se puede
 * deshacer un borrado) y el orden cambia la portada, así que cada acción pide su
 * propia confirmación y recarga el producto al terminar.
 */
export function EditorImagenes({
  productoId,
  imagenes,
  alCambiar,
}: {
  productoId: string;
  imagenes: ImagenProducto[];
  alCambiar: () => Promise<void>;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [portada, setPortada] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function alElegir(archivos: FileList | null) {
    if (!archivos?.length) return;
    setSubiendo(true);
    // Un solo aviso que se va actualizando en vez de una pila de toasts.
    const aviso = toast.loading(
      archivos.length === 1
        ? "Subiendo imagen…"
        : `Subiendo ${archivos.length} imágenes…`,
    );
    try {
      // Shopify procesa cada imagen por separado: unas pueden pasar y otras
      // fallar, así que se cuenta en vez de asumir que todas entraron.
      let agregadas = 0;
      for (const archivo of Array.from(archivos)) {
        try {
          const comprimida = await comprimirImagen(archivo);
          await agregarImagenProducto(productoId, comprimida.dataUrl);
          agregadas += 1;
        } catch (e) {
          toast.error(
            `${archivo.name}: ${e instanceof Error ? e.message : "no se pudo subir."}`,
          );
        }
      }
      if (agregadas > 0) {
        await alCambiar();
        toast.success(
          agregadas === 1
            ? "Imagen agregada."
            : `${agregadas} imágenes agregadas.`,
          { id: aviso, description: "Ya aparece en la galería del producto." },
        );
      } else {
        toast.error("Ninguna imagen se pudo subir.", { id: aviso });
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo subir la imagen.",
        { id: aviso },
      );
    } finally {
      setSubiendo(false);
      // Permite volver a elegir el mismo archivo justo después.
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function borrar(imagen: ImagenProducto) {
    const etiqueta = imagen.alt || "esta imagen";
    const { id, seguro } = confirmarToast({
      titulo: `Se va a eliminar ${etiqueta} del producto en Shopify.`,
      detalle: "No se puede recuperar desde acá.",
    });
    if (!(await seguro)) return;

    setBorrando(imagen.id);
    // El mismo id: el toast de confirmación se transforma en el de progreso.
    const aviso = toast.loading(`Eliminando ${etiqueta}…`, { id });
    try {
      await eliminarImagenProducto(productoId, imagen.id);
      await alCambiar();
      toast.success("Imagen eliminada de Shopify.", {
        id: aviso,
        description: etiqueta,
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo eliminar la imagen.",
        { id: aviso },
      );
    } finally {
      setBorrando(null);
    }
  }

  async function hacerPortada(indice: number) {
    if (indice === 0 || portada) return;
    setPortada(imagenes[indice]?.id ?? null);
    const etiqueta = imagenes[indice]?.alt || "la imagen elegida";
    const aviso = toast.loading("Cambiando la portada…");
    try {
      // Shopify toma el orden completo; la primera posición es la portada.
      const ids = [
        imagenes[indice]!.id,
        ...imagenes.filter((_, i) => i !== indice).map((imagen) => imagen.id),
      ];
      await reordenarImagenesProducto(productoId, ids);
      await alCambiar();
      toast.success("Portada actualizada.", {
        id: aviso,
        description: `${etiqueta} ahora es la portada.`,
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo cambiar la portada.",
        { id: aviso },
      );
    } finally {
      setPortada(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {imagenes.map((imagen, indice) => (
          <div
            key={imagen.id}
            className="group relative overflow-hidden rounded-lg border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlImagen(imagen.url, 220)}
              alt={imagen.alt ?? ""}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />

            {indice === 0 && (
              <span className="absolute top-1 left-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[0.55rem] tracking-wider text-white/80">
                PORTADA
              </span>
            )}

            {/* Shopify procesa la imagen aparte: se avisa en vez de dejarla
                como lista cuando todavía se está descargando o ya falló. */}
            {imagen.estado && imagen.estado !== "READY" && (
              <span
                className={cn(
                  "absolute right-1 bottom-1 rounded px-1.5 py-0.5 font-mono text-[0.55rem] tracking-wider",
                  imagen.estado === "FAILED"
                    ? "bg-destructive/90 text-white"
                    : "bg-black/75 text-white/80",
                )}
              >
                {imagen.estado === "FAILED" ? "FALLÓ" : "PROCESANDO"}
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/85 to-transparent p-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              {indice > 0 && (
                <button
                  type="button"
                  onClick={() => hacerPortada(indice)}
                  disabled={portada !== null}
                  aria-label="Usar como portada"
                  title="Usar como portada"
                  className="rounded p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-40"
                >
                  {portada === imagen.id ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <StarIcon className="size-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => borrar(imagen)}
                disabled={borrando !== null}
                aria-label="Eliminar imagen"
                title="Eliminar imagen de Shopify"
                className="rounded p-1.5 text-white/80 transition hover:bg-destructive/60 hover:text-white disabled:opacity-40"
              >
                {borrando === imagen.id ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <Trash2Icon className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={subiendo}
          className={cn(
            "grid aspect-square place-items-center rounded-lg border border-dashed border-white/15 text-white/40 transition",
            "hover:border-brand-500/40 hover:text-white/70 disabled:opacity-50",
          )}
        >
          {subiendo ? (
            <Loader2Icon className="size-5 animate-spin" />
          ) : (
            <ImagePlusIcon className="size-5" />
          )}
          <span className="sr-only">Agregar imágenes</span>
        </button>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => void alElegir(e.target.files)}
        className="hidden"
      />

      <p className="text-xs text-white/35">
        Las imágenes se comprimen antes de subirse. La primera es la portada del
        producto en la tienda.
      </p>
    </div>
  );
}
