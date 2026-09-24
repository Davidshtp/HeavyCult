"use client";

import { useState } from "react";
import { Circle, CircleCheck, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarMiContrasena } from "@/lib/dashboard-api";

const REGLA_CONTRASENA = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const labelCls =
  "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

type CampoClaveForm = "actual" | "nueva" | "confirmar";
type ErroresForm = Partial<Record<CampoClaveForm, string>>;

function CampoClave({
  id,
  label,
  icon,
  error,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  autoComplete: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className={labelCls}>
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-white/40">
          {icon}
        </span>
        <Input
          id={id}
          type="password"
          autoComplete={autoComplete}
          aria-invalid={!!error}
          title={error}
          className={cn(
            "pl-11",
            error && "border-destructive/60 animate-alerta",
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
        />
      </div>
    </div>
  );
}

export function CambiarContrasenaForm() {
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [errores, setErrores] = useState<ErroresForm>({});

  function cambiar(campo: CampoClaveForm, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) {
      setErrores((e) => ({ ...e, [campo]: undefined }));
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    const nuevosErrores: ErroresForm = {};
    if (form.nueva.length < 8) {
      nuevosErrores.nueva = "La contraseña debe tener al menos 8 caracteres.";
    } else if (!REGLA_CONTRASENA.test(form.nueva)) {
      nuevosErrores.nueva = "La contraseña debe contener letras y números.";
    }
    if (form.nueva !== form.confirmar) {
      nuevosErrores.confirmar = "Las contraseñas no coinciden.";
    }

    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      const primerCampo = (
        ["actual", "nueva", "confirmar"] as const
      ).find((campo) => nuevosErrores[campo]);
      document.getElementById(`cc-${primerCampo}`)?.focus();
      return;
    }

    setGuardando(true);
    try {
      await cambiarMiContrasena({
        contrasenaActual: form.actual,
        nuevaContrasena: form.nueva,
      });
      setForm({ actual: "", nueva: "", confirmar: "" });
      setErrores({});
      toast.success("Contraseña actualizada correctamente.");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      if (/contraseña actual/i.test(mensaje)) {
        setErrores({ actual: mensaje });
      } else {
        toast.error(mensaje);
      }
    } finally {
      setGuardando(false);
    }
  }

  const reglas = [
    {
      texto: "Mínimo 8 caracteres",
      ok: form.nueva.length >= 8,
    },
    {
      texto: "Letras y números",
      ok: REGLA_CONTRASENA.test(form.nueva),
    },
    {
      texto: "Las contraseñas coinciden",
      ok: form.confirmar.length > 0 && form.confirmar === form.nueva,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <form noValidate onSubmit={enviar}>
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.02] p-6 lg:border-r lg:border-b-0">
            <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-tr from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/30">
              <ShieldCheck className="size-7" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground uppercase">
                Seguridad
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Actualiza tu contraseña de acceso. Recomendamos cambiarla
                periódicamente.
              </p>
            </div>
            <ul className="mt-1 space-y-2.5">
              {reglas.map((regla) => (
                <li
                  key={regla.texto}
                  className={cn(
                    "flex items-center gap-2.5 text-sm transition-colors",
                    regla.ok ? "text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {regla.ok ? (
                    <CircleCheck className="size-4 shrink-0" />
                  ) : (
                    <Circle className="size-4 shrink-0" />
                  )}
                  {regla.texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 p-6">
            <CampoClave
              id="cc-actual"
              label="Contraseña actual"
              icon={<Lock className="size-4" />}
              error={errores.actual}
              autoComplete="current-password"
              value={form.actual}
              onChange={(valor) => cambiar("actual", valor)}
            />
            <CampoClave
              id="cc-nueva"
              label="Contraseña nueva"
              icon={<KeyRound className="size-4" />}
              error={errores.nueva}
              autoComplete="new-password"
              value={form.nueva}
              onChange={(valor) => cambiar("nueva", valor)}
            />
            <CampoClave
              id="cc-confirmar"
              label="Confirma la contraseña nueva"
              icon={<KeyRound className="size-4" />}
              error={errores.confirmar}
              autoComplete="new-password"
              value={form.confirmar}
              onChange={(valor) => cambiar("confirmar", valor)}
            />
          </div>
        </div>

        <CardFooter className="justify-end">
          <Button
            type="submit"
            disabled={guardando}
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
          >
            {guardando ? "Actualizando…" : "Actualizar contraseña"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}