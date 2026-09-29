"use client";

import { useEffect, useState } from "react";
import { Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { eliminarUsuario } from "@/lib/dashboard-api";
import type { Usuario } from "@/lib/types";
import { Avatar } from "@/components/dashboard/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/dashboard/modal";

export function UsuarioEliminarModal({
  open,
  usuario,
  esPropio,
  onOpenChange,
  onEliminado,
}: {
  open: boolean;
  usuario: Usuario | null;
  esPropio: boolean;
  onOpenChange: (abierto: boolean) => void;
  onEliminado: (id: number) => void;
}) {
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (open) setEliminando(false);
  }, [open]);

  if (!usuario) return null;

  async function eliminar() {
    if (esPropio || !usuario) return;
    setEliminando(true);
    try {
      await eliminarUsuario(usuario.id_usuario);
      onEliminado(usuario.id_usuario);
      onOpenChange(false);
      toast.success("Usuario eliminado correctamente.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el usuario.",
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Eliminar usuario"
      description="Esta acción no se puede deshacer en el panel."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={eliminar}
            disabled={eliminando || esPropio}
          >
            <Trash2Icon className="size-4" />
            {esPropio
              ? "No puedes eliminarte"
              : eliminando
                ? "Eliminando…"
                : "Eliminar usuario"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Avatar
            nombre={usuario.nombre}
            apellido={usuario.apellido}
            urlImagen={usuario.url_imagen}
            className="size-11 text-lg"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {usuario.correo}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            El usuario dejará de aparecer en este listado y ya no podrá iniciar
            sesión. Sus registros se conservan en la base de datos, pero esta
            eliminación no se puede restaurar desde el panel.
          </p>
        </div>
      </div>
    </Modal>
  );
}