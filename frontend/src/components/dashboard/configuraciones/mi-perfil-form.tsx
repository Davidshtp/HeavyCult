"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Save, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { usePerfil } from "@/components/dashboard/perfil-context";
import { SectionHeader } from "@/components/dashboard/section-header";
import { FotoPerfilInput } from "@/components/dashboard/configuraciones/foto-perfil-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarMiPerfil,
  eliminarImagenPerfil,
  subirImagenPerfil,
} from "@/lib/dashboard-api";

const labelCls =
  "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

const REGEX_CORREO = /^\S+@\S+\.\S+$/;
const REGEX_TELEFONO = /^3\d{9}$/;

type CampoForm = "nombre" | "apellido" | "correo" | "telefono";
type ErroresForm = Partial<Record<CampoForm, string>>;

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

export function MiPerfilForm() {
  const { usuario, actualizarLocal } = usePerfil();
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<ErroresForm>({});
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    foto: null as string | null,
  });

  useEffect(() => {
    if (!usuario) return;
    setForm({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono ?? "",
      foto: usuario.url_imagen ?? null,
    });
    setErrores({});
  }, [usuario]);

  const fotoOriginal = usuario?.url_imagen ?? null;
  const telefonoLimpio = form.telefono.replace(/\D/g, "");

  const hayCambios =
    !!usuario &&
    (form.nombre.trim() !== usuario.nombre ||
      form.apellido.trim() !== usuario.apellido ||
      form.correo.trim() !== usuario.correo ||
      (telefonoLimpio || null) !== (usuario.telefono?.replace(/\D/g, "") ?? null) ||
      form.foto !== fotoOriginal);

  function cambiar(campo: CampoForm, valor: string) {
    const valorFiltrado =
      campo === "telefono" ? valor.replace(/\D/g, "").slice(0, 10) : valor;
    setForm((f) => ({ ...f, [campo]: valorFiltrado }));
    if (errores[campo]) {
      setErrores((e) => ({ ...e, [campo]: undefined }));
    }
  }

  function descartarCambios() {
    if (!usuario) return;
    setForm({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono ?? "",
      foto: usuario.url_imagen ?? null,
    });
    setErrores({});
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

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
    if (!telefonoLimpio) {
      nuevosErrores.telefono = "El teléfono es obligatorio.";
    } else if (!REGEX_TELEFONO.test(telefonoLimpio)) {
      nuevosErrores.telefono =
        "El teléfono debe tener 10 dígitos (formato colombiano).";
    }

    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      const primerCampo = (
        ["nombre", "apellido", "correo", "telefono"] as const
      ).find((campo) => nuevosErrores[campo]);
      document.getElementById(`mp-${primerCampo}`)?.focus();
      return;
    }

    setGuardando(true);
    try {
      if (form.foto === null && fotoOriginal !== null) {
        await eliminarImagenPerfil();
      } else if (form.foto && form.foto !== fotoOriginal) {
        await subirImagenPerfil(form.foto);
      }

      const actualizado = await actualizarMiPerfil({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        telefono: telefonoLimpio,
      });

      actualizarLocal(actualizado);
      toast.success("Perfil actualizado correctamente.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <SectionHeader
          title="Datos personales"
          description="Información visible en el encabezado y el sistema"
        />
      </CardHeader>
      <form noValidate onSubmit={enviar}>
        <CardContent className="grid items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-10">
          <FotoPerfilInput
            value={form.foto}
            onChange={(foto) => setForm((f) => ({ ...f, foto }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoInput
              id="mp-nombre"
              label="Nombre"
              icon={<User className="size-4" />}
              error={errores.nombre}
              value={form.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              required
            />
            <CampoInput
              id="mp-apellido"
              label="Apellido"
              icon={<User className="size-4" />}
              error={errores.apellido}
              value={form.apellido}
              onChange={(e) => cambiar("apellido", e.target.value)}
              required
            />
            <CampoInput
              id="mp-correo"
              label="Correo"
              icon={<Mail className="size-4" />}
              type="email"
              error={errores.correo}
              value={form.correo}
              onChange={(e) => cambiar("correo", e.target.value)}
              required
            />
            <CampoInput
              id="mp-telefono"
              label="Teléfono"
              icon={<Phone className="size-4" />}
              error={errores.telefono}
              value={form.telefono}
              onChange={(e) => cambiar("telefono", e.target.value)}
              placeholder="300 000 0000"
              inputMode="tel"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          {hayCambios && (
            <Button type="button" variant="ghost" onClick={descartarCambios}>
              Descartar cambios
            </Button>
          )}
          <Button
            type="submit"
            disabled={guardando}
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
          >
            <Save className="size-4" data-icon="inline-start" />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}