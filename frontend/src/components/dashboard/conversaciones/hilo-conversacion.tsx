"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ChevronUpIcon,
  InfoIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  PaperclipIcon,
  SendHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";
import type {
  ConversacionWhatsapp,
  MensajeWhatsapp,
} from "@/lib/whatsapp-api";
import {
  ETAPA_CONVERSACION_LABEL,
  colorEtapa,
  formatDia,
  inicialesContacto,
  nombreContacto,
} from "@/lib/whatsapp-utils";
import { BurbujaMensaje } from "./burbuja-mensaje";

function esMismoDia(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function HiloConversacion({
  conversacion,
  mensajes,
  cargando,
  tieneMas,
  cargandoMas,
  onCargarAnteriores,
  onVolver,
  onEnviar,
  onEnviarMedia,
  enviando,
  errorEnvio,
  onAbrirContacto,
}: {
  conversacion: ConversacionWhatsapp;
  mensajes: MensajeWhatsapp[];
  cargando: boolean;
  tieneMas: boolean;
  cargandoMas: boolean;
  onCargarAnteriores: () => Promise<void>;
  onVolver: () => void;
  onEnviar: (texto: string, responderA?: string) => Promise<void>;
  onEnviarMedia: (
    archivo: File,
    caption?: string,
    responderA?: string,
  ) => Promise<void>;
  enviando: boolean;
  errorEnvio: string | null;
  onAbrirContacto: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [mensajeCitado, setMensajeCitado] = useState<MensajeWhatsapp | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pegadoAlFondo = useRef(true);
  const cantidadAnterior = useRef(0);

  useEffect(() => {
    setTexto("");
    setErrorLocal(null);
    setMensajeCitado(null);
    pegadoAlFondo.current = true;
    cantidadAnterior.current = 0;
  }, [conversacion.id_conversacion]);

  useEffect(() => {
    const contenedor = scrollRef.current;
    if (!contenedor) return;
    const crecio = mensajes.length > cantidadAnterior.current;
    cantidadAnterior.current = mensajes.length;
    if (!crecio) return;
    if (pegadoAlFondo.current) {
      contenedor.scrollTop = contenedor.scrollHeight;
    }
  }, [mensajes]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [texto]);

  async function cargarAnteriores() {
    const contenedor = scrollRef.current;
    const alturaPrevia = contenedor?.scrollHeight ?? 0;
    await onCargarAnteriores();
    requestAnimationFrame(() => {
      if (!contenedor) return;
      contenedor.scrollTop = contenedor.scrollHeight - alturaPrevia;
    });
  }

  async function seleccionarArchivo(
    evento: React.ChangeEvent<HTMLInputElement>,
  ) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setSubiendoArchivo(true);
    try {
      await onEnviarMedia(
        archivo,
        texto.trim() || undefined,
        mensajeCitado?.wa_message_id ?? undefined,
      );
      setTexto("");
      setMensajeCitado(null);
    } finally {
      setSubiendoArchivo(false);
    }
  }

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || enviando || conversacion.estado === "CERRADA") return;
    setErrorLocal(null);
    try {
      await onEnviar(limpio, mensajeCitado?.wa_message_id ?? undefined);
      setTexto("");
      setMensajeCitado(null);
    } catch (error) {
      setErrorLocal(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el mensaje.",
      );
    }
  }

  function responderMensaje(mensaje: MensajeWhatsapp) {
    setMensajeCitado(mensaje);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  const error = errorLocal ?? errorEnvio;

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onVolver}
          aria-label="Volver a conversaciones"
        >
          <ArrowLeftIcon />
        </Button>

        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-sm font-semibold text-white/70">
          {inicialesContacto(conversacion.contacto)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {nombreContacto(conversacion.contacto)}
          </p>
          <p className="truncate text-[0.72rem] text-white/40">
            {conversacion.contacto.telefono_e164} ·{" "}
            {conversacion.instancia.nombre}
          </p>
        </div>

        <span
          className={cn(
            "hidden rounded-full border px-2 py-0.5 text-[0.68rem] font-medium sm:inline-flex",
            colorEtapa(conversacion.etapa),
          )}
        >
          {ETAPA_CONVERSACION_LABEL[conversacion.etapa]}
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAbrirContacto}
          aria-label="Ver datos del contacto"
        >
          <InfoIcon />
        </Button>
      </header>

      <div
        ref={scrollRef}
        onScroll={(evento) => {
          const el = evento.currentTarget;
          pegadoAlFondo.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-4 scroll-smooth sm:px-5"
      >
        {tieneMas && (
          <div className="mb-4 flex justify-center">
            <Button
              variant="ghost"
              size="xs"
              onClick={cargarAnteriores}
              disabled={cargandoMas}
            >
              {cargandoMas ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <ChevronUpIcon />
              )}
              Cargar mensajes anteriores
            </Button>
          </div>
        )}

        {cargando ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, indice) => (
              <div
                key={indice}
                className={cn(
                  "flex",
                  indice % 2 === 0 ? "justify-start" : "justify-end",
                )}
              >
                <Skeleton
                  className={cn(
                    "h-16 rounded-2xl",
                    indice % 2 === 0 ? "w-56" : "w-44",
                  )}
                />
              </div>
            ))}
          </div>
        ) : mensajes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageSquareTextIcon className="size-7 text-white/25" />
            <p className="text-sm text-white/45">
              Esta conversación todavía no tiene mensajes.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {mensajes.map((mensaje, indice) => {
              const anterior = mensajes[indice - 1];
              const nuevoDia =
                !anterior ||
                !esMismoDia(anterior.fecha_creacion, mensaje.fecha_creacion);
              return (
                <div key={mensaje.id_mensaje} className="space-y-2.5">
                  {nuevoDia && (
                    <div className="flex items-center gap-3 py-1">
                      <span className="h-px flex-1 bg-white/8" />
                      <span className="text-[0.68rem] font-medium tracking-wide text-white/30 uppercase">
                        {formatDia(mensaje.fecha_creacion)}
                      </span>
                      <span className="h-px flex-1 bg-white/8" />
                    </div>
                  )}
                  <BurbujaMensaje
                    mensaje={mensaje}
                    onResponder={responderMensaje}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-2.5 sm:p-3">
        {error && (
          <p className="mb-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {conversacion.estado === "CERRADA" ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-sm text-white/40">
            La conversación está cerrada. Reábrela desde los datos del contacto
            para responder.
          </p>
        ) : (
          <>
            {mensajeCitado && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/8 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] font-medium text-brand-200">
                    Respondiendo a un mensaje
                  </p>
                  <p className="truncate text-xs text-white/55">
                    {mensajeCitado.contenido ?? "Mensaje multimedia"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMensajeCitado(null)}
                  aria-label="Cancelar respuesta"
                  className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            )}
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 focus-within:border-brand-500/35 focus-within:ring-[3px] focus-within:ring-brand-500/10">
            <label
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl text-white/45 transition-colors hover:bg-white/10 hover:text-white"
              title="Adjuntar archivo"
            >
              <PaperclipIcon className="size-4" />
              <input
                type="file"
                className="sr-only"
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                disabled={subiendoArchivo || enviando}
                onChange={(evento) => void seleccionarArchivo(evento)}
              />
            </label>
            <Textarea
              ref={textareaRef}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" && !evento.shiftKey) {
                  evento.preventDefault();
                  void enviar();
                }
              }}
              rows={1}
              placeholder="Escribe una respuesta…"
              className="min-h-9 max-h-36 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
            <Button
              size="icon"
              onClick={() => void enviar()}
              disabled={!texto.trim() || enviando || subiendoArchivo}
              aria-label="Enviar mensaje"
              className="rounded-xl"
            >
              {enviando || subiendoArchivo ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SendHorizontalIcon />
              )}
            </Button>
          </div>
          </>
        )}
        <p className="mt-1.5 px-1 text-[0.68rem] text-white/25">
          Enter envía · Shift + Enter agrega un salto de línea
        </p>
      </div>
    </section>
  );
}
