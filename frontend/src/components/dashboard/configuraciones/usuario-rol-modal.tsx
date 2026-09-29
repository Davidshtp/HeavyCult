"use client";

import { useEffect, useState } from "react";
import { ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { cambiarRolUsuario } from "@/lib/dashboard-api";
import type { RolUsuario, Usuario } from "@/lib/types";
import { Avatar } from "@/components/dashboard/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Modal } from "@/components/dashboard/modal";

const ROLES: RolUsuario[] = ["ADMIN", "EMPLEADO"];
const labelCls =
  "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

export function UsuarioRolModal({
  open,
  usuario,
  esPropio,
  onOpenChange,
  onGuardado,
}: {
  open: boolean;
  usuario: Usuario | null;
  esPropio: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardado: (usuario: Usuario) => void;
}) {
  const [rol, setRol] = useState<RolUsuario>("EMPLEADO");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !usuario) return;
    setRol(usuario.rol);
  }, [open, usuario]);

  if (!usuario) return null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    if (esPropio || rol === usuario.rol) {
      onOpenChange(false);
      return;
    }
    setGuardando(true);
    try {
      const actualizado = await cambiarRolUsuario(usuario.id_usuario, rol);
      onGuardado(actualizado);
      onOpenChange(false);
      toast.success("Rol actualizado correctamente.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el rol.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Cambiar rol"
      description="Define qué permisos tendrá este usuario."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="rol-form"
            disabled={guardando || esPropio || rol === usuario.rol}
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </>
      }
    >
      <form id="rol-form" onSubmit={guardar} className="grid gap-5">
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

        <div className="grid gap-2">
          <Label htmlFor="rol-select" className={labelCls}>
            Rol
          </Label>
          <Select
            value={rol}
            onValueChange={(v) => setRol(v as RolUsuario)}
            disabled={esPropio}
          >
            <SelectTrigger id="rol-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "ADMIN" ? "Administrador" : "Empleado"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {rol === "ADMIN"
              ? "Acceso completo, incluida la gestión de usuarios."
              : "Acceso al panel con permisos limitados."}
          </p>
        </div>

        {esPropio && (
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive",
            )}
          >
            <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">No puedes cambiar tu propio rol.</p>
              <p className="text-destructive/80">
                Este ajuste ya no está disponible para tu usuario actual.
              </p>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}