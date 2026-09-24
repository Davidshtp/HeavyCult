"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  actualizarIntegracion,
  crearIntegracion,
  type IntegracionInput,
} from "@/lib/dashboard-api";
import {
  PLATAFORMA_INTEGRACION_OPCIONES,
} from "@/lib/dashboard-mock";
import type { Integracion, PlataformaIntegracion } from "@/lib/types";
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

interface Formulario {
  plataforma: PlataformaIntegracion;
  etiqueta: string;
  api_key: string;
}

const labelCls =
  "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

export function IntegracionFormModal({
  open,
  conexion,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  conexion: Integracion | null;
  onOpenChange: (abierto: boolean) => void;
  onSaved: (input: IntegracionInput) => void;
}) {
  const esEdicion = conexion !== null;
  const formId = useId();
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<Formulario>({
    plataforma: "META_ADS",
    etiqueta: "",
    api_key: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      conexion
        ? {
            plataforma: conexion.plataforma,
            etiqueta: conexion.etiqueta,
            api_key: "",
          }
        : { plataforma: "META_ADS", etiqueta: "", api_key: "" },
    );
  }, [open, conexion]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const input: IntegracionInput = {
        plataforma: form.plataforma,
        etiqueta: form.etiqueta.trim(),
        api_key: form.api_key,
      };
      if (esEdicion && conexion) {
        await actualizarIntegracion(conexion.id_integracion, {
          etiqueta: input.etiqueta,
          api_key: input.api_key,
        });
        toast.success("Conexión actualizada (maquetación).");
      } else {
        await crearIntegracion(input);
        toast.success("Conexión agregada (maquetación: backend pendiente).");
      }
      onSaved(input);
      onOpenChange(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={esEdicion ? "Editar conexión" : "Agregar conexión"}
      description="Las claves se almacenan de forma segura y solo se muestran enmascaradas."
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
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Agregar conexión"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={enviar} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="co-plataforma" className={labelCls}>
            Plataforma
          </Label>
          <Select
            value={form.plataforma}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, plataforma: v as PlataformaIntegracion }))
            }
          >
            <SelectTrigger id="co-plataforma" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATAFORMA_INTEGRACION_OPCIONES.map(([valor, etiqueta]) => (
                <SelectItem key={valor} value={valor}>
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="co-etiqueta" className={labelCls}>
            Nombre / etiqueta
          </Label>
          <Input
            id="co-etiqueta"
            value={form.etiqueta}
            onChange={(e) => setForm((f) => ({ ...f, etiqueta: e.target.value }))}
            required
            placeholder="Cuenta principal · ad account 01"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="co-key" className={labelCls}>
            API key
          </Label>
          <Input
            id="co-key"
            type="password"
            autoComplete="off"
            value={form.api_key}
            onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
            required={!esEdicion}
            placeholder={esEdicion ? "Deja vacío para conservar la actual" : "sk-…"}
          />
          {esEdicion && (
            <p className="text-sm text-muted-foreground">
              Clave actual:{" "}
              <span className="font-mono text-brand-300/80">
                {conexion?.api_key_enmascarada}
              </span>
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}