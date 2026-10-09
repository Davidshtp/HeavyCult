"use client";

import { toast } from "sonner";

/**
 * Confirmación de acción destructiva en un toast, en reemplazo de
 * `window.confirm` (que corta el hilo y no se puede tematizar).
 *
 * Regla de seguridad: mientras no se toque "Eliminar", no pasa nada. Si el
 * toast expira, se cierra con Esc o se toca "Cancelar", se resuelve `false`.
 * En sonner 2.x el `onClick` del `action` corre antes que `deleteToast()`, así
 * que al confirmar se resuelve `true` primero y el `onDismiss(false)` posterior
 * queda ignorado (una promise solo admite el primer `resolve`).
 *
 * Devuelve el `id` para que quien llama pueda reemplazar este mismo toast con
 * `toast.loading(msg, { id })` y no queden dos saltando en pantalla.
 */
export function confirmarToast({
  titulo,
  detalle,
  etiquetaAceptar = "Eliminar",
}: {
  titulo: string;
  detalle?: string;
  etiquetaAceptar?: string;
}): { id: string; seguro: Promise<boolean> } {
  const id = `confirmacion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const seguro = new Promise<boolean>((resolver) => {
    toast.warning(titulo, {
      id,
      description: detalle,
      duration: 10000,
      action: { label: etiquetaAceptar, onClick: () => resolver(true) },
      cancel: { label: "Cancelar", onClick: () => resolver(false) },
      onDismiss: () => resolver(false),
      onAutoClose: () => resolver(false),
    });
  });

  return { id, seguro };
}
