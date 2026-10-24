"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  InboxIcon,
  MessagesSquareIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/dashboard/modal";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";
import {
  actualizarContactoWhatsapp,
  actualizarConversacionWhatsapp,
  enviarMensajeWhatsapp,
  enviarMediaWhatsapp,
  listarConversacionesWhatsapp,
  listarMensajesWhatsapp,
  marcarConversacionLeida,
  type ActualizarContactoWhatsappInput,
  type ActualizarConversacionInput,
  type ConversacionWhatsapp,
  type EstadoConversacion,
  type EtapaConversacion,
  type FiltrosConversaciones,
  type MensajeWhatsapp,
} from "@/lib/whatsapp-api";
import {
  useWhatsappSocket,
  type EventoEstadoMensaje,
} from "@/lib/whatsapp-socket";
import {
  ESTADO_CONVERSACION_LABEL,
  ETAPA_CONVERSACION_LABEL,
  ETAPAS,
} from "@/lib/whatsapp-utils";
import { HiloConversacion } from "./hilo-conversacion";
import { ListaConversaciones } from "./lista-conversaciones";
import { PanelContacto } from "./panel-contacto";

const ESTADOS: EstadoConversacion[] = ["ABIERTA", "PENDIENTE", "CERRADA"];
const TODAS = "TODAS";

function ordenarConversaciones(
  a: ConversacionWhatsapp,
  b: ConversacionWhatsapp,
): number {
  const fechaA = new Date(
    a.ultimo_mensaje_at ?? a.fecha_creacion,
  ).getTime();
  const fechaB = new Date(
    b.ultimo_mensaje_at ?? b.fecha_creacion,
  ).getTime();
  return fechaB - fechaA;
}

function fusionarMensajes(
  actuales: MensajeWhatsapp[],
  nuevos: MensajeWhatsapp[],
): MensajeWhatsapp[] {
  const mapa = new Map(
    actuales.map((mensaje) => [mensaje.id_mensaje, mensaje]),
  );
  for (const mensaje of nuevos) mapa.set(mensaje.id_mensaje, mensaje);
  return [...mapa.values()].sort((a, b) => a.id_mensaje - b.id_mensaje);
}

function mensajeError(error: unknown, respaldo: string): string {
  return error instanceof Error ? error.message : respaldo;
}

export function ConversacionesPanel() {
  const [conversaciones, setConversaciones] = useState<
    ConversacionWhatsapp[]
  >([]);
  const [seleccionada, setSeleccionada] =
    useState<ConversacionWhatsapp | null>(null);
  const [mensajes, setMensajes] = useState<MensajeWhatsapp[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [errorMensajes, setErrorMensajes] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [tieneMas, setTieneMas] = useState(false);
  const [antesDe, setAntesDe] = useState<number | null>(null);
  const [mostrarContacto, setMostrarContacto] = useState(false);

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    EstadoConversacion | typeof TODAS
  >(TODAS);
  const [filtroEtapa, setFiltroEtapa] = useState<
    EtapaConversacion | typeof TODAS
  >(TODAS);
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);

  const seleccionadaRef = useRef<number | null>(null);

  useEffect(() => {
    seleccionadaRef.current = seleccionada?.id_conversacion ?? null;
  }, [seleccionada]);

  const actualizarConversacionLocal = useCallback(
    (conversacion: ConversacionWhatsapp) => {
      setConversaciones((previas) => {
        const existe = previas.some(
          (item) => item.id_conversacion === conversacion.id_conversacion,
        );
        const siguiente = existe
          ? previas.map((item) =>
              item.id_conversacion === conversacion.id_conversacion
                ? conversacion
                : item,
            )
          : [conversacion, ...previas];
        return siguiente.sort(ordenarConversaciones);
      });
      setSeleccionada((actual) =>
        actual?.id_conversacion === conversacion.id_conversacion
          ? conversacion
          : actual,
      );
    },
    [],
  );

  const cargarLista = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargandoLista(true);
      const filtros: FiltrosConversaciones = {
        estado: filtroEstado === TODAS ? undefined : filtroEstado,
        etapa: filtroEtapa === TODAS ? undefined : filtroEtapa,
        solo_no_leidos: soloNoLeidos || undefined,
        buscar: buscar.trim() || undefined,
        por_pagina: 50,
      };

      try {
        const pagina = await listarConversacionesWhatsapp(filtros);
        setConversaciones(pagina.conversaciones);
        setErrorLista(null);
        setSeleccionada((actual) => {
          if (!actual) return actual;
          return (
            pagina.conversaciones.find(
              (item) => item.id_conversacion === actual.id_conversacion,
            ) ?? actual
          );
        });
      } catch (error) {
        if (!silencioso) {
          setErrorLista(
            mensajeError(error, "No se pudieron cargar las conversaciones."),
          );
        }
      } finally {
        if (!silencioso) setCargandoLista(false);
      }
    },
    [buscar, filtroEstado, filtroEtapa, soloNoLeidos],
  );

  useEffect(() => {
    const temporizador = setTimeout(() => {
      void cargarLista();
    }, 280);
    return () => clearTimeout(temporizador);
  }, [cargarLista]);

  const recargarMensajes = useCallback(async (idConversacion: number) => {
    try {
      const pagina = await listarMensajesWhatsapp(idConversacion);
      setMensajes((previos) => fusionarMensajes(previos, pagina.mensajes));
    } catch {
      // El sondeo silencioso no interrumpe la bandeja.
    }
  }, []);

  const idSeleccionado = seleccionada?.id_conversacion ?? null;

  const enviarMedia = useCallback(
    async (archivo: File, caption?: string, responderA?: string) => {
      if (!seleccionada) return;
      const dataUrl = await new Promise<string>((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onload = () => resolver(String(lector.result));
        lector.onerror = () =>
          rechazar(new Error("No se pudo leer el archivo."));
        lector.readAsDataURL(archivo);
      });
      const tipo = archivo.type.startsWith("image/")
        ? "IMAGEN"
        : archivo.type.startsWith("audio/")
          ? "AUDIO"
          : archivo.type.startsWith("video/")
            ? "VIDEO"
            : "DOCUMENTO";
      const mensaje = await enviarMediaWhatsapp(
        seleccionada.id_conversacion,
        {
          tipo,
          media_data: dataUrl,
          mime_type: archivo.type || "application/octet-stream",
          nombre_archivo: archivo.name,
          contenido: caption,
          responder_a: responderA,
        },
      );
      setMensajes((previos) => fusionarMensajes(previos, [mensaje]));
    },
    [seleccionada],
  );

  useEffect(() => {
    if (!idSeleccionado) {
      setMensajes([]);
      setTieneMas(false);
      setAntesDe(null);
      setErrorMensajes(null);
      return;
    }

    let activo = true;
    setCargandoMensajes(true);
    setErrorMensajes(null);
    setTieneMas(false);
    setAntesDe(null);

    listarMensajesWhatsapp(idSeleccionado)
      .then((pagina) => {
        if (!activo) return;
        setMensajes(pagina.mensajes);
        setTieneMas(pagina.tiene_mas);
        setAntesDe(pagina.siguiente_antes_de);
      })
      .catch((error: unknown) => {
        if (!activo) return;
        setErrorMensajes(
          mensajeError(error, "No se pudieron cargar los mensajes."),
        );
      })
      .finally(() => {
        if (activo) setCargandoMensajes(false);
      });

    marcarConversacionLeida(idSeleccionado)
      .then(actualizarConversacionLocal)
      .catch(() => undefined);

    return () => {
      activo = false;
    };
  }, [idSeleccionado, actualizarConversacionLocal]);

  const { conectado } = useWhatsappSocket({
    onMensajeNuevo: (mensaje) => {
      if (mensaje.id_conversacion === seleccionadaRef.current) {
        setMensajes((previos) => fusionarMensajes(previos, [mensaje]));
        if (mensaje.es_entrante) {
          marcarConversacionLeida(mensaje.id_conversacion)
            .then(actualizarConversacionLocal)
            .catch(() => undefined);
        }
      }

      setConversaciones((previas) =>
        previas.map((conversacion) => {
          if (conversacion.id_conversacion !== mensaje.id_conversacion) {
            return conversacion;
          }
          const esLaAbierta =
            conversacion.id_conversacion === seleccionadaRef.current;
          return {
            ...conversacion,
            ultimo_mensaje: mensaje,
            ultimo_mensaje_at: mensaje.fecha_creacion,
            no_leidos:
              esLaAbierta || !mensaje.es_entrante
                ? 0
                : conversacion.no_leidos + 1,
          };
        }),
      );
    },
    onMensajeEstado: (evento: EventoEstadoMensaje) => {
      setMensajes((previos) =>
        previos.map((mensaje) =>
          mensaje.id_mensaje === evento.id_mensaje
            ? { ...mensaje, estado: evento.estado }
            : mensaje,
        ),
      );
      setConversaciones((previas) =>
        previas.map((conversacion) =>
          conversacion.ultimo_mensaje?.id_mensaje === evento.id_mensaje
            ? {
                ...conversacion,
                ultimo_mensaje: {
                  ...conversacion.ultimo_mensaje,
                  estado: evento.estado,
                },
              }
            : conversacion,
        ),
      );
      setSeleccionada((actual) =>
        actual?.ultimo_mensaje?.id_mensaje === evento.id_mensaje
          ? {
              ...actual,
              ultimo_mensaje: {
                ...actual.ultimo_mensaje,
                estado: evento.estado,
              },
            }
          : actual,
      );
    },
    onConversacionActualizada: (conversacion) => {
      if (!("contacto" in conversacion) || !conversacion.contacto) {
        setConversaciones((previas) =>
          previas.map((item) =>
            item.id_conversacion === conversacion.id_conversacion
              ? {
                  ...item,
                  ultimo_mensaje_at:
                    conversacion.ultimo_mensaje_at ??
                    item.ultimo_mensaje_at,
                  ultimo_mensaje:
                    conversacion.ultimo_mensaje ?? item.ultimo_mensaje,
                }
              : item,
          ),
        );
        setSeleccionada((actual) =>
          actual?.id_conversacion === conversacion.id_conversacion
            ? {
                ...actual,
                ultimo_mensaje_at:
                  conversacion.ultimo_mensaje_at ??
                  actual.ultimo_mensaje_at,
                ultimo_mensaje:
                  conversacion.ultimo_mensaje ?? actual.ultimo_mensaje,
              }
            : actual,
        );
        return;
      }
      actualizarConversacionLocal(conversacion);
    },
  });

  useEffect(() => {
    if (conectado) return;
    const intervalo = setInterval(() => {
      void cargarLista(true);
      const id = seleccionadaRef.current;
      if (id) void recargarMensajes(id);
    }, 10_000);
    return () => clearInterval(intervalo);
  }, [conectado, cargarLista, recargarMensajes]);

  async function cargarAnteriores() {
    if (!idSeleccionado || !antesDe || cargandoMas) return;
    setCargandoMas(true);
    try {
      const pagina = await listarMensajesWhatsapp(
        idSeleccionado,
        antesDe,
      );
      setMensajes((previos) => fusionarMensajes(pagina.mensajes, previos));
      setTieneMas(pagina.tiene_mas);
      setAntesDe(pagina.siguiente_antes_de);
    } catch (error) {
      toast.error(
        mensajeError(error, "No se pudieron cargar los mensajes anteriores."),
      );
    } finally {
      setCargandoMas(false);
    }
  }

  async function enviar(texto: string, responderA?: string) {
    if (!seleccionada) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const mensaje = await enviarMensajeWhatsapp(
        seleccionada.id_conversacion,
        texto,
        responderA,
      );
      setMensajes((previos) => fusionarMensajes(previos, [mensaje]));
      setConversaciones((previas) =>
        previas.map((conversacion) =>
          conversacion.id_conversacion === mensaje.id_conversacion
            ? {
                ...conversacion,
                modo: "HUMANO",
                ultimo_mensaje: mensaje,
                ultimo_mensaje_at: mensaje.fecha_creacion,
              }
            : conversacion,
        ),
      );
      setSeleccionada((actual) =>
        actual?.id_conversacion === mensaje.id_conversacion
          ? {
              ...actual,
              modo: "HUMANO",
              ultimo_mensaje: mensaje,
              ultimo_mensaje_at: mensaje.fecha_creacion,
            }
          : actual,
      );
    } catch (error) {
      setErrorEnvio(
        mensajeError(error, "No se pudo enviar el mensaje."),
      );
      throw error;
    } finally {
      setEnviando(false);
    }
  }

  async function guardarContacto(datos: ActualizarContactoWhatsappInput) {
    if (!seleccionada) return;
    try {
      const contacto = await actualizarContactoWhatsapp(
        seleccionada.contacto.id_contacto,
        datos,
      );
      actualizarConversacionLocal({ ...seleccionada, contacto });
      toast.success("Datos del contacto actualizados.");
    } catch (error) {
      toast.error(
        mensajeError(error, "No se pudieron guardar los datos del contacto."),
      );
    }
  }

  async function actualizarConversacion(cambios: ActualizarConversacionInput) {
    if (!seleccionada) return;
    try {
      const conversacion = await actualizarConversacionWhatsapp(
        seleccionada.id_conversacion,
        cambios,
      );
      actualizarConversacionLocal(conversacion);
    } catch (error) {
      toast.error(
        mensajeError(error, "No se pudo actualizar la conversación."),
      );
    }
  }

  const noLeidos = conversaciones.reduce(
    (total, conversacion) => total + conversacion.no_leidos,
    0,
  );

  return (
    <div className="flex h-[calc(100svh-7rem)] max-h-[calc(100svh-7rem)] min-h-0 flex-none flex-col gap-3 overflow-hidden">
      <SectionHeader
        title="Conversaciones"
        description="Atención de WhatsApp en tiempo real."
        action={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium",
                conectado
                  ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-300"
                  : "border-amber-400/25 bg-amber-400/8 text-amber-300",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  conectado ? "bg-emerald-400" : "animate-pulse bg-amber-400",
                )}
              />
              {conectado ? "En vivo" : "Reconectando"}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => void cargarLista()}
              aria-label="Actualizar conversaciones"
            >
              <RefreshCwIcon />
            </Button>
          </div>
        }
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]",
          seleccionada
            ? "xl:grid-cols-[23rem_minmax(0,1fr)_22rem]"
            : "xl:grid-cols-[23rem_minmax(0,1fr)]",
          "md:grid-cols-[21rem_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "min-h-0 flex-col border-white/10 bg-white/[0.015]",
            seleccionada ? "hidden md:flex" : "flex",
          )}
        >
          <div className="space-y-2.5 border-b border-white/10 p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
              <Input
                value={buscar}
                onChange={(evento) => setBuscar(evento.target.value)}
                placeholder="Buscar nombre o teléfono"
                className="h-9 pl-9 text-sm"
                aria-label="Buscar conversaciones"
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={filtroEstado}
                onValueChange={(valor) =>
                  setFiltroEstado(valor as EstadoConversacion | typeof TODAS)
                }
              >
                <SelectTrigger size="sm" className="min-w-0 flex-1">
                  <SelectValue>
                    {(valor) =>
                      valor === TODAS
                        ? "Todos los estados"
                        : ESTADO_CONVERSACION_LABEL[
                            valor as EstadoConversacion
                          ]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todos los estados</SelectItem>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {ESTADO_CONVERSACION_LABEL[estado]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtroEtapa}
                onValueChange={(valor) =>
                  setFiltroEtapa(valor as EtapaConversacion | typeof TODAS)
                }
              >
                <SelectTrigger size="sm" className="min-w-0 flex-1">
                  <SelectValue>
                    {(valor) =>
                      valor === TODAS
                        ? "Todas las etapas"
                        : ETAPA_CONVERSACION_LABEL[
                            valor as EtapaConversacion
                          ]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas las etapas</SelectItem>
                  {ETAPAS.map((etapa) => (
                    <SelectItem key={etapa} value={etapa}>
                      {ETAPA_CONVERSACION_LABEL[etapa]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => setSoloNoLeidos((valor) => !valor)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-[0.75rem] transition-colors",
                soloNoLeidos
                  ? "border-brand-500/30 bg-brand-500/10 text-brand-200"
                  : "border-white/8 bg-white/[0.02] text-white/45 hover:text-white/70",
              )}
            >
              <span className="flex items-center gap-1.5">
                <InboxIcon className="size-3.5" />
                Solo no leídos
              </span>
              <span>{noLeidos}</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ListaConversaciones
              conversaciones={conversaciones}
              seleccionadaId={idSeleccionado}
              onSeleccionar={setSeleccionada}
              cargando={cargandoLista}
              error={errorLista}
              onReintentar={() => void cargarLista()}
            />
          </div>
        </aside>

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden",
            seleccionada ? "flex" : "hidden md:flex",
          )}
        >
          {seleccionada ? (
            <HiloConversacion
              conversacion={seleccionada}
              mensajes={mensajes}
              cargando={cargandoMensajes}
              tieneMas={tieneMas}
              cargandoMas={cargandoMas}
              onCargarAnteriores={cargarAnteriores}
              onVolver={() => setSeleccionada(null)}
              onEnviar={enviar}
              onEnviarMedia={enviarMedia}
              enviando={enviando}
              errorEnvio={errorEnvio ?? errorMensajes}
              onAbrirContacto={() => setMostrarContacto(true)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/30">
                <MessagesSquareIcon className="size-6" />
              </span>
              <div>
                <p className="text-sm font-medium text-white/75">
                  Selecciona una conversación
                </p>
                <p className="mt-1 max-w-64 text-sm text-white/40">
                  El historial y la respuesta rápida aparecerán en este panel.
                </p>
              </div>
            </div>
          )}
        </div>

        {seleccionada && (
          <aside className="hidden min-h-0 flex-col border-l border-white/10 bg-white/[0.015] xl:flex">
            <PanelContacto
              contacto={seleccionada.contacto}
              conversacion={seleccionada}
              onGuardarContacto={guardarContacto}
              onActualizarConversacion={actualizarConversacion}
            />
          </aside>
        )}
      </div>

      <Modal
        open={mostrarContacto}
        onOpenChange={setMostrarContacto}
        title="Datos del contacto"
        description="Actualiza la información y la etapa de la conversación."
      >
        {seleccionada && (
          <div className="max-h-[68svh] overflow-y-auto pr-1">
            <PanelContacto
              contacto={seleccionada.contacto}
              conversacion={seleccionada}
              onGuardarContacto={guardarContacto}
              onActualizarConversacion={actualizarConversacion}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
