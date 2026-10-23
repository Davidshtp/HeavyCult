"use client";

import { MapPinIcon, MessageSquareIcon, TriangleAlertIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EncabezadoPaso } from "./encabezado-paso";
import type { NuevoPedidoController } from "./use-nuevo-pedido";

export function PasoEnvio({ pedido }: { pedido: NuevoPedidoController }) {
  const {
    departamentos,
    municipios,
    cargandoMunicipios,
    idDepartamento,
    cambiarDepartamento,
    idMunicipio,
    setIdMunicipio,
    calle,
    setCalle,
    observacion,
    setObservacion,
  } = pedido;

  const placeholderDepartamento =
    departamentos === null ? "Cargando…" : "Elegí un departamento";
  const placeholderMunicipio = !idDepartamento
    ? "Elegí primero un departamento"
    : cargandoMunicipios || municipios === null
      ? "Cargando…"
      : "Elegí un municipio";

  return (
    <section className="space-y-5">
      <EncabezadoPaso
        icono={MapPinIcon}
        titulo="Envío"
        nota="¿A dónde va este pedido? El pago es contraentrega."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-sm text-white/70">
            Departamento <span className="text-brand-300">*</span>
          </Label>
          <Select
            value={idDepartamento}
            onValueChange={(valor) => cambiarDepartamento(valor ?? "")}
          >
            <SelectTrigger className="h-11" aria-label="Departamento">
              <SelectValue placeholder={placeholderDepartamento}>
                {(valor: string | null) =>
                  valor
                    ? (departamentos?.find((d) => d.id === valor)?.nombre ??
                      "Departamento")
                    : placeholderDepartamento
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {departamentos === null ? (
                <SelectItem
                  value="__cargando"
                  disabled
                  className="text-white/45 data-disabled:opacity-100"
                >
                  Cargando departamentos…
                </SelectItem>
              ) : departamentos.length === 0 ? (
                <SelectItem
                  value="__sin-departamentos"
                  disabled
                  className="text-white/45 data-disabled:opacity-100"
                >
                  Sin departamentos disponibles
                </SelectItem>
              ) : (
                departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nombre}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm text-white/70">
            Municipio <span className="text-brand-300">*</span>
          </Label>
          <Select
            value={idMunicipio}
            onValueChange={(valor) => setIdMunicipio(valor ?? "")}
            disabled={!idDepartamento || municipios === null}
          >
            <SelectTrigger className="h-11" aria-label="Municipio">
              <SelectValue placeholder={placeholderMunicipio}>
                {(valor: string | null) =>
                  valor
                    ? (municipios?.find((m) => m.id === valor)?.nombre ??
                      "Municipio")
                    : placeholderMunicipio
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {!idDepartamento ? (
                <SelectItem
                  value="__sin-departamento"
                  disabled
                  className="text-white/45 data-disabled:opacity-100"
                >
                  Elegí primero un departamento
                </SelectItem>
              ) : cargandoMunicipios || municipios === null ? (
                <SelectItem
                  value="__cargando-municipios"
                  disabled
                  className="text-white/45 data-disabled:opacity-100"
                >
                  Cargando municipios…
                </SelectItem>
              ) : municipios.length === 0 ? (
                <SelectItem
                  value="__sin-municipios"
                  disabled
                  className="text-white/45 data-disabled:opacity-100"
                >
                  Sin municipios disponibles
                </SelectItem>
              ) : (
                municipios.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {idDepartamento && municipios?.length === 0 && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-300">
              <TriangleAlertIcon className="size-3.5" /> Este departamento no
              tiene municipios cargados.
            </p>
          )}
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-sm text-white/70">Dirección</Label>
        <Input
          value={calle}
          onChange={(e) => setCalle(e.target.value)}
          placeholder="Calle 12 # 34-56, barrio…"
          className="h-11"
        />
        <p className="mt-1.5 text-xs text-white/35">
          Si la dejás vacía, se envía como «Sin especificar».
        </p>
      </div>

      <div>
        <Label className="mb-1.5 flex items-center gap-2 text-sm text-white/70">
          <MessageSquareIcon className="size-3.5" /> Observación
        </Label>
        <Textarea
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Referencias, horario de entrega, indicaciones para el mensajero…"
          className="resize-none"
        />
        <p className="mt-1.5 text-xs text-white/35">
          Se guarda como nota del pedido y la ve el operador logístico.
        </p>
      </div>
    </section>
  );
}
