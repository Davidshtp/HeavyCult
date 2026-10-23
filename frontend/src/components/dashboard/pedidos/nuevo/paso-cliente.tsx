"use client";

import type { ReactNode } from "react";
import { MailIcon, PhoneIcon, UserRoundIcon } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EncabezadoPaso } from "./encabezado-paso";
import type { NuevoPedidoController } from "./use-nuevo-pedido";

export function PasoCliente({ pedido }: { pedido: NuevoPedidoController }) {
  const {
    nombre,
    setNombre,
    apellido,
    setApellido,
    email,
    setEmail,
    telefono,
    setTelefono,
    emailValido,
    telefonoValido,
  } = pedido;

  const emailInvalido = email.trim().length > 0 && !emailValido;
  const telefonoInvalido = telefono.trim().length > 0 && !telefonoValido;

  return (
    <section className="space-y-4">
      <EncabezadoPaso
        icono={UserRoundIcon}
        titulo="Cliente"
        nota="Datos de contacto para la entrega y el seguimiento."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" requerido>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: María"
            className="h-11"
          />
        </Campo>
        <Campo etiqueta="Apellido" requerido>
          <Input
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            placeholder="Ej: Pérez"
            className="h-11"
          />
        </Campo>
        <Campo
          etiqueta="Correo"
          requerido
          error={emailInvalido ? "Ingresá un correo válido." : undefined}
        >
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@correo.com"
              className={cn(
                "h-11 pl-10",
                emailInvalido &&
                  "border-red-500/50 focus-visible:ring-red-500/30",
              )}
            />
          </div>
        </Campo>
        <Campo
          etiqueta="Teléfono"
          requerido
          error={telefonoInvalido ? "Mínimo 7 dígitos." : undefined}
        >
          <div className="relative">
            <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <Input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="300 123 4567"
              className={cn(
                "h-11 pl-10",
                telefonoInvalido &&
                  "border-red-500/50 focus-visible:ring-red-500/30",
              )}
            />
          </div>
        </Campo>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-white/40">
        <PhoneIcon className="size-3.5" /> El teléfono es obligatorio: la
        transportadora lo necesita para la entrega.
      </p>
    </section>
  );
}

function Campo({
  etiqueta,
  requerido,
  error,
  children,
}: {
  etiqueta: string;
  requerido?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm text-white/70">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-brand-300">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
    </div>
  );
}
