"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { actualizarUsuario, type UsuarioEdicion } from "@/lib/dashboard-api";
import type { RolUsuario, Usuario } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Formulario {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
}

export function UsuarioEditFormModal({
  open,
  usuario,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  usuario: Usuario | null;
  onOpenChange: (abierto: boolean) => void;
  onSaved: (id: number, campos: UsuarioEdicion) => void;
}) {
  const formId = useId();
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<Formulario>({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    rol: "EMPLEADO",
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      usuario
        ? {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            correo: usuario.correo,
            telefono: usuario.telefono ?? "",
            rol: usuario.rol,
          }
        : { nombre: "", apellido: "", correo: "", telefono: "", rol: "EMPLEADO" },
    );
  }, [open, usuario]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    setGuardando(true);
    try {
      const campos: UsuarioEdicion = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        telefono: form.telefono.trim() || undefined,
        rol: form.rol,
      };
      // TODO(backend): conectar con PATCH /users/:id cuando exista.
      await actualizarUsuario(usuario.id_usuario, campos);
      onSaved(usuario.id_usuario, campos);
      onOpenChange(false);
      toast.success("Usuario actualizado (maquetación: backend pendiente).");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Editar usuario"
      description={`${form.nombre || "Usuario"} — cambios de rol y datos personales`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={guardando}
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={enviar} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ue-nombre" className={labelCls}>
              Nombre
            </Label>
            <Input
              id="ue-nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              minLength={2}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ue-apellido" className={labelCls}>
              Apellido
            </Label>
            <Input
              id="ue-apellido"
              value={form.apellido}
              onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
              required
              minLength={2}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ue-correo" className={labelCls}>
            Correo
          </Label>
          <Input
            id="ue-correo"
            type="email"
            value={form.correo}
            onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ue-telefono" className={labelCls}>
              Teléfono
            </Label>
            <Input
              id="ue-telefono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="300 000 0000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ue-rol" className={labelCls}>
              Rol
            </Label>
            <Select
              value={form.rol}
              onValueChange={(v) => setForm((f) => ({ ...f, rol: v as RolUsuario }))}
            >
              <SelectTrigger id="ue-rol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((rol) => (
                  <SelectItem key={rol} value={rol}>
                    {rol === "ADMIN" ? "Administrador" : "Empleado"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>
    </Modal>
  );
}