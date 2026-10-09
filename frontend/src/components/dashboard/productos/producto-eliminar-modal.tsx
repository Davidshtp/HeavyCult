"use client";

import { useEffect, useState } from "react";
import { Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/dashboard/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eliminarProducto } from "@/lib/dashboard-api";
import type { Producto } from "@/lib/types";

export function ProductoEliminarModal({
  open,
  producto,
  onOpenChange,
  onEliminado,
}: {
  open: boolean;
  producto: Producto | null;
  onOpenChange: (abierto: boolean) => void;
  onEliminado: (id: string) => void | Promise<void>;
}) {
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmacion("");
      setEliminando(false);
    }
  }, [open]);

  if (!producto) return null;

  const coincide = confirmacion.trim() === producto.titulo;

  async function eliminar() {
    if (!coincide || !producto) return;
    setEliminando(true);
    try {
      await eliminarProducto(producto.id_producto);
      await onEliminado(producto.id_producto);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el producto de Shopify.",
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Eliminar producto de Shopify"
      description="Se borra en la tienda real, no solo en este panel."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={eliminar}
            disabled={!coincide || eliminando}
          >
            <Trash2Icon className="size-4" />
            {eliminando ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {producto.url_imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={producto.url_imagen}
              alt=""
              className="size-11 shrink-0 rounded-lg border border-white/10 object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-semibold">{producto.titulo}</p>
            <p className="font-mono text-[0.75rem] text-muted-foreground">
              {producto.variantes.length} variante(s) · {producto.stock} unidad(es)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1.5">
            <p className="font-medium">Esta acción es irreversible.</p>
            <ul className="list-inside list-disc space-y-1 text-destructive/90">
              <li>El producto desaparece de tu tienda de Shopify.</li>
              <li>Se pierden sus {producto.variantes.length} variante(s) y su stock.</li>
              <li>
                Dropi ya no podrá encontrarlo por SKU al importar{" "}
                {producto.handle}.
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmar-eliminacion" className="text-sm text-muted-foreground">
            Para confirmar, escribí el nombre exacto del producto:
          </label>
          <p className="font-mono text-sm font-semibold break-all">
            {producto.titulo}
          </p>
          <Input
            id="confirmar-eliminacion"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            placeholder={producto.titulo}
            autoComplete="off"
            spellCheck={false}
            disabled={eliminando}
          />
        </div>
      </div>
    </Modal>
  );
}