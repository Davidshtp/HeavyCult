"use client";

import { useEffect, useId, useState } from "react";
import { LockIcon, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  crearUsuario,
  type UsuarioNuevo,
} from "@/lib/dashboard-api";
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
const REGEX_CORREO = /^\S+@\S+\.\S+$/;
const REGEX_TELEFONO = /^3\d{9}$/;
const REGEX_CONTRASENA = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const labelCls =
  "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

type CampoForm = "nombre" | "apellido" | "correo" | "telefono" | "contrasena";
type ErroresForm = Partial<Record<CampoForm, string>>;

const FORM_INICIAL: UsuarioNuevo = {
  nombre: "",
  apellido: "",
  correo: "",
  contrasena: "",
  telefono: "",
  rol: "EMPLEADO",
};

function CampoInput({
  id,
  label,
  icon,
  error,
  className,
  ...rest
}: React.ComponentProps<"input"> & {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className={labelCls}>
        {label} <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-white/40">
          {icon}
        </span>
        <Input
          id={id}
          aria-invalid={!!error}
          title={error}
          className={cn(
            "pl-11",
            error && "border-destructive/60 animate-alerta",
            className,
          )}
          {...rest}
        />
      </div>
    </div>
  );
}

export function UsuarioFormModal({
  open,
  onOpenChange,
  onGuardado,
}: {
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardado: (usuario: Usuario) => void;
}) {
  const formId = useId();
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<ErroresForm>({});
  const [form, setForm] = useState<UsuarioNuevo>(FORM_INICIAL);

  useEffect(() => {
    if (!open) return;
    setForm(FORM_INICIAL);
    setErrores({});
  }, [open]);

  function cambiar(campo: CampoForm, valor: string) {
    const valorFiltrado =
      campo === "telefono" ? valor.replace(/\D/g, "").slice(0, 10) : valor;
    setForm((f) => ({ ...f, [campo]: valorFiltrado }));
    if (errores[campo]) {
      setErrores((e) => ({ ...e, [campo]: undefined }));
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    const telefono = form.telefono?.replace(/\D/g, "") ?? "";
    const nuevosErrores: ErroresForm = {};
    if (!form.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es obligatorio.";
    } else if (form.nombre.trim().length < 2) {
      nuevosErrores.nombre = "El nombre debe tener al menos 2 caracteres.";
    }
    if (!form.apellido.trim()) {
      nuevosErrores.apellido = "El apellido es obligatorio.";
    } else if (form.apellido.trim().length < 2) {
      nuevosErrores.apellido = "El apellido debe tener al menos 2 caracteres.";
    }
    if (!form.correo.trim()) {
      nuevosErrores.correo = "El correo es obligatorio.";
    } else if (!REGEX_CORREO.test(form.correo.trim())) {
      nuevosErrores.correo = "El correo no es válido.";
    }
    if (!form.contrasena) {
      nuevosErrores.contrasena = "La contraseña es obligatoria.";
    } else if (form.contrasena.length < 8) {
      nuevosErrores.contrasena =
        "La contraseña debe tener al menos 8 caracteres.";
    } else if (!REGEX_CONTRASENA.test(form.contrasena)) {
      nuevosErrores.contrasena =
        "La contraseña debe contener letras y números.";
    }
    if (telefono && !REGEX_TELEFONO.test(telefono)) {
      nuevosErrores.telefono =
        "El teléfono debe tener 10 dígitos (formato colombiano).";
    }

    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      const primerCampo = (
        ["nombre", "apellido", "correo", "contrasena", "telefono"] as const
      ).find((campo) => nuevosErrores[campo]);
      document.getElementById(`uf-${primerCampo}`)?.focus();
      return;
    }

    setGuardando(true);
    try {
      const usuario = await crearUsuario({
        ...form,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        telefono: telefono || undefined,
      });
      onGuardado(usuario);
      onOpenChange(false);
      toast.success("Usuario creado correctamente.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo crear el usuario.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo usuario"
      description="El usuario recibirá las credenciales definidas aquí."
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
            {guardando ? "Creando…" : "Crear usuario"}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={enviar} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoInput
            id="uf-nombre"
            label="Nombre"
            icon={<User className="size-4" />}
            error={errores.nombre}
            value={form.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            required
          />
          <CampoInput
            id="uf-apellido"
            label="Apellido"
            icon={<User className="size-4" />}
            error={errores.apellido}
            value={form.apellido}
            onChange={(e) => cambiar("apellido", e.target.value)}
            required
          />
        </div>
        <CampoInput
          id="uf-correo"
          label="Correo"
          icon={<Mail className="size-4" />}
          type="email"
          error={errores.correo}
          value={form.correo}
          onChange={(e) => cambiar("correo", e.target.value)}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoInput
            id="uf-telefono"
            label="Teléfono"
            icon={<Phone className="size-4" />}
            error={errores.telefono}
            value={form.telefono ?? ""}
            onChange={(e) => cambiar("telefono", e.target.value)}
            placeholder="300 000 0000"
            inputMode="tel"
          />
          <div className="grid gap-2">
            <Label htmlFor="uf-rol" className={labelCls}>
              Rol <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.rol}
              onValueChange={(v) => setForm((f) => ({ ...f, rol: v as RolUsuario }))}
            >
              <SelectTrigger id="uf-rol" className="w-full">
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
        <CampoInput
          id="uf-contrasena"
          label="Contraseña inicial"
          icon={<LockIcon className="size-4" />}
          type="password"
          autoComplete="new-password"
          error={errores.contrasena}
          value={form.contrasena}
          onChange={(e) => cambiar("contrasena", e.target.value)}
          required
        />
      </form>
    </Modal>
  );
}