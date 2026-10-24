"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  SaveIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TicketIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";
import {
  listarDepartamentos,
  listarMunicipios,
} from "@/lib/dashboard-api";
import type {
  ActualizarContactoWhatsappInput,
  ActualizarConversacionInput,
  ContactoWhatsapp,
  ConversacionWhatsapp,
  EstadoConversacion,
  EtapaConversacion,
} from "@/lib/whatsapp-api";
import type { Departamento, Municipio } from "@/lib/types";
import {
  ESTADO_CONVERSACION_LABEL,
  ETAPA_CONVERSACION_LABEL,
  ETAPAS,
  colorEtapa,
  formatDia,
  inicialesContacto,
  nombreContacto,
} from "@/lib/whatsapp-utils";

const ESTADOS: EstadoConversacion[] = ["ABIERTA", "PENDIENTE", "CERRADA"];

export function PanelContacto({
  contacto,
  conversacion,
  onGuardarContacto,
  onActualizarConversacion,
}: {
  contacto: ContactoWhatsapp;
  conversacion: ConversacionWhatsapp;
  onGuardarContacto: (
    datos: ActualizarContactoWhatsappInput,
  ) => Promise<void>;
  onActualizarConversacion: (
    cambios: ActualizarConversacionInput,
  ) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nombre: contacto.nombre ?? "",
    apellido: contacto.apellido ?? "",
    email: contacto.email ?? "",
    direccion: contacto.direccion ?? "",
    departamento_id: contacto.departamento_id ?? "",
    municipio_id: contacto.municipio_id ?? "",
    notas: contacto.notas ?? "",
  });
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [cargandoCobertura, setCargandoCobertura] = useState(true);
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [guardandoEtapa, setGuardandoEtapa] = useState(false);
  const [copiadoCampo, setCopiadoCampo] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      nombre: contacto.nombre ?? "",
      apellido: contacto.apellido ?? "",
      email: contacto.email ?? "",
      direccion: contacto.direccion ?? "",
      departamento_id: contacto.departamento_id ?? "",
      municipio_id: contacto.municipio_id ?? "",
      notas: contacto.notas ?? "",
    });
  }, [contacto]);

  useEffect(() => {
    let activo = true;
    setCargandoCobertura(true);
    listarDepartamentos()
      .then((lista) => {
        if (activo) setDepartamentos(lista);
      })
      .catch(() => {
        if (activo) toast.error("No se pudo cargar la cobertura de envíos");
      })
      .finally(() => {
        if (activo) setCargandoCobertura(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!form.departamento_id) {
      setMunicipios([]);
      return;
    }

    let activo = true;
    setCargandoMunicipios(true);
    listarMunicipios(form.departamento_id)
      .then((lista) => {
        if (activo) setMunicipios(lista);
      })
      .catch(() => {
        if (activo) {
          setMunicipios([]);
          toast.error("No se pudo cargar la cobertura del municipio");
        }
      })
      .finally(() => {
        if (activo) setCargandoMunicipios(false);
      });

    return () => {
      activo = false;
    };
  }, [form.departamento_id]);

  async function copiar(texto: string, campo: string) {
    if (!texto.trim()) return;
    try {
      await navigator.clipboard.writeText(texto.trim());
      setCopiadoCampo(campo);
      toast.success(`${campo} copiado al portapapeles`);
      setTimeout(() => setCopiadoCampo(null), 1800);
    } catch {
      toast.error("No se pudo copiar el texto");
    }
  }

  async function guardarContacto() {
    setGuardandoContacto(true);
    try {
      await onGuardarContacto({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        direccion: form.direccion.trim(),
        departamento_id: form.departamento_id,
        municipio_id: form.municipio_id,
        notas: form.notas.trim(),
      });
      setEditando(false);
      toast.success("Ficha del cliente actualizada");
    } catch {
      toast.error("Error al guardar los datos del cliente");
    } finally {
      setGuardandoContacto(false);
    }
  }

  async function cambiarConversacion(cambios: ActualizarConversacionInput) {
    setGuardandoEtapa(true);
    try {
      await onActualizarConversacion(cambios);
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar la conversación");
    } finally {
      setGuardandoEtapa(false);
    }
  }

  const ticketNumero = `#TK-${conversacion.id_conversacion
    .toString()
    .padStart(4, "0")}`;
  const nombreDepartamento =
    departamentos.find((item) => item.id === form.departamento_id)?.nombre ??
    "Sin departamento";
  const nombreMunicipio =
    municipios.find((item) => item.id === form.municipio_id)?.nombre ??
    "Sin municipio";

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-black/40 p-3 sm:p-3.5">
      {/* ─── TICKET CONTAINER ────────────────────────────────────────────── */}
      <div className="relative flex flex-col rounded-2xl border border-white/12 bg-linear-to-b from-white/4.5 to-white/1.5 shadow-2xl backdrop-blur-md">
        {/* Cabecera del Ticket */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-brand-500/15 text-brand-300">
              <TicketIcon className="size-3.5" />
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-white/90">
              {ticketNumero}
            </span>
          </div>

          {/* Toggle rápido de Modo: IA vs Asesor Humano */}
          <button
            type="button"
            onClick={() => {
              const siguienteModo =
                conversacion.modo === "IA" ? "HUMANO" : "IA";
              void cambiarConversacion({ modo: siguienteModo });
            }}
            disabled={guardandoEtapa}
            title={
              conversacion.modo === "IA"
                ? "Atendido por IA. Clic para pasar a Asesor"
                : "Atendido por Asesor. Clic para activar IA"
            }
            className={cn(
              "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-medium transition-all",
              conversacion.modo === "IA"
                ? "border-violet-400/35 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                : "border-sky-400/35 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25",
            )}
          >
            {conversacion.modo === "IA" ? (
              <>
                <SparklesIcon className="size-3 text-violet-300" />
                <span>Modo IA</span>
              </>
            ) : (
              <>
                <UserIcon className="size-3 text-sky-300" />
                <span>Asesor</span>
              </>
            )}
            <span className="ml-0.5 rounded-full bg-white/10 px-1 py-0.2 text-[0.55rem] uppercase opacity-75 group-hover:opacity-100">
              cambiar
            </span>
          </button>
        </div>

        {/* Perfil del Cliente */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-brand-500/30 bg-linear-to-br from-brand-500/20 to-brand-700/10 text-base font-bold text-white shadow-inner">
              {inicialesContacto(contacto)}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-base font-bold text-white">
                {nombreContacto(contacto)}
              </h4>

              {/* Teléfono con botón copiar */}
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-mono text-xs text-white/55">
                  {contacto.telefono_e164}
                </span>
                <button
                  type="button"
                  onClick={() => void copiar(contacto.telefono_e164, "Teléfono")}
                  className="rounded p-0.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  title="Copiar teléfono"
                >
                  {copiadoCampo === "Teléfono" ? (
                    <CheckIcon className="size-3 text-emerald-400" />
                  ) : (
                    <CopyIcon className="size-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Selector de Etapa del Embudo (Pipeline) */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[0.68rem] tracking-wider text-white/40 uppercase font-mono">
              <span>Etapa del embudo</span>
              {guardandoEtapa && <Loader2Icon className="size-3 animate-spin text-brand-400" />}
            </div>
            <Select
              value={conversacion.etapa}
              onValueChange={(valor) =>
                void cambiarConversacion({ etapa: valor as EtapaConversacion })
              }
              disabled={guardandoEtapa}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  "h-8 w-full border font-medium text-xs rounded-xl shadow-none",
                  colorEtapa(conversacion.etapa),
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETAPAS.map((etapa) => (
                  <SelectItem key={etapa} value={etapa} className="text-xs">
                    {ETAPA_CONVERSACION_LABEL[etapa]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado de la Conversación */}
          <div className="mt-2.5 flex items-center justify-between gap-1.5 rounded-xl border border-white/8 bg-white/2 p-1">
            {ESTADOS.map((estado) => {
              const activo = conversacion.estado === estado;
              return (
                <button
                  key={estado}
                  type="button"
                  onClick={() => void cambiarConversacion({ estado })}
                  disabled={guardandoEtapa}
                  className={cn(
                    "flex-1 rounded-lg py-1 text-center text-[0.65rem] font-medium transition-all",
                    activo
                      ? estado === "ABIERTA"
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                        : estado === "PENDIENTE"
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                          : "bg-white/15 text-white border border-white/20"
                      : "text-white/40 hover:text-white/70",
                  )}
                >
                  {ESTADO_CONVERSACION_LABEL[estado]}
                </button>
              );
            })}
          </div>

          {/* Pedido Shopify vinculado (si existe) */}
          {conversacion.numero_pedido && (
            <div className="mt-3.5 flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-200 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingBagIcon className="size-4 shrink-0 text-emerald-300" />
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">
                    Pedido #{conversacion.numero_pedido}
                  </p>
                  <p className="text-[0.68rem] text-emerald-200/70">Shopify Sincronizado</p>
                </div>
              </div>
              <span className="rounded-md bg-emerald-400/20 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-emerald-100">
                ACTIVO
              </span>
            </div>
          )}
        </div>

        {/* ─── LÍNEA PERFORADA DEL TICKET (Troquel) ─────────────────────── */}
        <div className="relative my-1 flex items-center justify-center">
          <div className="absolute -left-2 size-3.5 rounded-full bg-background border-r border-white/10" />
          <div className="h-px w-full border-t border-dashed border-white/15" />
          <div className="absolute -right-2 size-3.5 rounded-full bg-background border-l border-white/10" />
        </div>

        {/* ─── FICHA DE DATOS DE ENVÍO / CLIENTE ───────────────────────── */}
        <div className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.68rem] tracking-wider text-white/40 uppercase">
              Datos para Despacho
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setEditando((v) => !v)}
              className="h-6 gap-1 px-2 text-[0.7rem] text-brand-300 hover:text-brand-200"
            >
              {editando ? (
                <>
                  <XIcon className="size-3" />
                  Cancelar
                </>
              ) : (
                <>
                  <PencilIcon className="size-3" />
                  Editar ficha
                </>
              )}
            </Button>
          </div>

          {editando ? (
            /* MODO EDICIÓN */
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/2.5 p-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="wa-form-nombre" className="text-[0.68rem] text-white/45">
                    Nombre
                  </Label>
                  <Input
                    id="wa-form-nombre"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="David"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wa-form-apellido" className="text-[0.68rem] text-white/45">
                    Apellido
                  </Label>
                  <Input
                    id="wa-form-apellido"
                    value={form.apellido}
                    onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="Medina"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="wa-form-dir" className="text-[0.68rem] text-white/45">
                  Dirección de Entrega
                </Label>
                <Input
                  id="wa-form-dir"
                  value={form.direccion}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Calle 10 # 20-30, Apto 201"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="wa-form-email" className="text-[0.68rem] text-white/45">
                  Correo Electrónico
                </Label>
                <Input
                  id="wa-form-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="cliente@gmail.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[0.68rem] text-white/45">
                    Departamento
                  </Label>
                  <Select
                    value={form.departamento_id}
                    onValueChange={(valor) =>
                      setForm((f) => ({
                        ...f,
                        departamento_id: valor ?? "",
                        municipio_id: "",
                      }))
                    }
                    disabled={cargandoCobertura}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar">
                        {(valor: string | null) =>
                          valor
                            ? (departamentos.find((d) => d.id === valor)
                                ?.nombre ?? "Departamento")
                            : "Seleccionar"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map((departamento) => (
                        <SelectItem key={departamento.id} value={departamento.id}>
                          {departamento.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[0.68rem] text-white/45">
                    Municipio
                  </Label>
                  <Select
                    value={form.municipio_id}
                    onValueChange={(valor) =>
                      setForm((f) => ({ ...f, municipio_id: valor ?? "" }))
                    }
                    disabled={!form.departamento_id || cargandoMunicipios}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar">
                        {(valor: string | null) =>
                          valor
                            ? (municipios.find((m) => m.id === valor)?.nombre ??
                                "Municipio")
                            : "Seleccionar"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {municipios.map((municipio) => (
                        <SelectItem key={municipio.id} value={municipio.id}>
                          {municipio.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => void guardarContacto()}
                disabled={guardandoContacto}
                className="w-full h-8 text-xs mt-1"
              >
                {guardandoContacto ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SaveIcon className="size-3.5" />
                )}
                Guardar cambios
              </Button>
            </div>
          ) : (
            /* MODO LECTURA RÁPIDA ESTILO TICKET */
            <div className="space-y-2 text-xs">
              {/* Dirección */}
              <div className="group flex items-start justify-between rounded-xl border border-white/8 bg-white/2 px-3 py-2 transition-colors hover:border-white/15 hover:bg-white/4">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-white/40" />
                  <div>
                    <span className="text-white/50 block text-[0.68rem]">Dirección de envío:</span>
                    <span className="font-medium text-white/90 wrap-break-word">
                      {form.direccion.trim() || "Sin dirección registrada"}
                    </span>
                  </div>
                </div>
                {form.direccion.trim() && (
                  <button
                    type="button"
                    onClick={() => void copiar(form.direccion, "Dirección")}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-white/40 hover:text-white transition-opacity shrink-0"
                    title="Copiar dirección"
                  >
                    {copiadoCampo === "Dirección" ? (
                      <CheckIcon className="size-3 text-emerald-400" />
                    ) : (
                      <CopyIcon className="size-3" />
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/8 bg-white/2 px-3 py-2">
                  <span className="block text-[0.68rem] text-white/50">
                    Departamento
                  </span>
                  <span className="font-medium text-white/90">
                    {nombreDepartamento}
                  </span>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/2 px-3 py-2">
                  <span className="block text-[0.68rem] text-white/50">
                    Municipio
                  </span>
                  <span className="font-medium text-white/90">
                    {nombreMunicipio}
                  </span>
                </div>
              </div>

              {/* Correo */}
              <div className="group flex items-center justify-between rounded-xl border border-white/8 bg-white/2 px-3 py-2 transition-colors hover:border-white/15 hover:bg-white/4">
                <div className="flex items-center gap-2 min-w-0">
                  <MailIcon className="size-3.5 shrink-0 text-white/40" />
                  <span className="text-white/50">Correo:</span>
                  <span className="font-medium text-white/90 truncate">
                    {form.email.trim() || "Sin correo"}
                  </span>
                </div>
                {form.email.trim() && (
                  <button
                    type="button"
                    onClick={() => void copiar(form.email, "Correo")}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-white/40 hover:text-white transition-opacity"
                    title="Copiar correo"
                  >
                    {copiadoCampo === "Correo" ? (
                      <CheckIcon className="size-3 text-emerald-400" />
                    ) : (
                      <CopyIcon className="size-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notas de Atención / Resumen Rápido */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[0.68rem] tracking-wider text-white/40 uppercase font-mono">
              <span>Notas internas</span>
              {guardandoContacto && <Loader2Icon className="size-3 animate-spin text-brand-400" />}
            </div>
            <Textarea
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              onBlur={() => {
                if (form.notas !== (contacto.notas ?? "")) {
                  void onGuardarContacto({ notas: form.notas.trim() });
                  toast.success("Nota guardada");
                }
              }}
              rows={2}
              placeholder="Ej: Prefiere pagar contra entrega, talla L oversize..."
              className="min-h-16 resize-none rounded-xl border-white/10 bg-white/2.5 text-xs leading-relaxed placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-500/30"
            />
            <p className="text-[0.65rem] text-white/30 text-right">
              Se guarda automáticamente al hacer clic afuera
            </p>
          </div>
        </div>

        {/* ─── PIE DEL TICKET (Código y Fecha) ─────────────────────────── */}
        <div className="border-t border-white/8 bg-black/20 px-4 py-2.5 rounded-b-2xl flex items-center justify-between text-[0.65rem] font-mono text-white/35">
          <div className="flex items-center gap-1.5">
            <ClockIcon className="size-3" />
            <span>Inicio: {formatDia(conversacion.fecha_creacion)}</span>
          </div>
          <span className="tracking-widest text-[0.6rem] text-white/25">
            HEAVYCULT-CRM
          </span>
        </div>
      </div>
    </div>
  );
}
