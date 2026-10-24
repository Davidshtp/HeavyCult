"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  Clock3Icon,
  Maximize2Icon,
  ReplyIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import type { EstadoMensaje, MensajeWhatsapp } from "@/lib/whatsapp-api";
import {
  ESTADO_MENSAJE_LABEL,
  formatHora,
} from "@/lib/whatsapp-utils";

function IconoEstado({ estado }: { estado: EstadoMensaje }) {
  const clase = "size-3.5";
  if (estado === "FALLIDO") {
    return <AlertCircleIcon className={cn(clase, "text-rose-300")} />;
  }
  if (estado === "PENDIENTE") {
    return <Clock3Icon className={cn(clase, "text-white/35")} />;
  }
  if (estado === "LEIDO") {
    return <CheckCheckIcon className={cn(clase, "text-sky-300")} />;
  }
  if (estado === "ENTREGADO") {
    return <CheckCheckIcon className={cn(clase, "text-white/45")} />;
  }
  return <CheckIcon className={cn(clase, "text-white/45")} />;
}

export function BurbujaMensaje({
  mensaje,
  onResponder,
}: {
  mensaje: MensajeWhatsapp;
  onResponder: (mensaje: MensajeWhatsapp) => void;
}) {
  const saliente = !mensaje.es_entrante;
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [desplazamiento, setDesplazamiento] = useState(0);
  const inicioDeslizamiento = useRef<{ x: number; pointerId: number } | null>(
    null,
  );
  const esImagen = mensaje.tipo === "IMAGEN";
  const esVideo = mensaje.tipo === "VIDEO";
  const direccionPermitida = saliente ? -1 : 1;
  const contenidoCitado =
    typeof mensaje.metadata?.responder_a_contenido === "string"
      ? mensaje.metadata.responder_a_contenido
      : null;
  const citaEntrante = mensaje.metadata?.responder_a_es_entrante === true;
  const nombreCitado =
    typeof mensaje.metadata?.responder_a_nombre === "string" &&
    mensaje.metadata.responder_a_nombre.trim()
      ? mensaje.metadata.responder_a_nombre
      : "Cliente";
  const mediaCitada =
    typeof mensaje.metadata?.responder_a_media_url === "string"
      ? mensaje.metadata.responder_a_media_url
      : null;
  const tipoCitado =
    typeof mensaje.metadata?.responder_a_tipo === "string"
      ? mensaje.metadata.responder_a_tipo
      : null;

  function iniciarDeslizamiento(evento: React.PointerEvent<HTMLDivElement>) {
    if (!evento.isPrimary) return;
    inicioDeslizamiento.current = {
      x: evento.clientX,
      pointerId: evento.pointerId,
    };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function moverDeslizamiento(evento: React.PointerEvent<HTMLDivElement>) {
    const inicio = inicioDeslizamiento.current;
    if (!inicio || inicio.pointerId !== evento.pointerId) return;
    const delta = (evento.clientX - inicio.x) * direccionPermitida;
    setDesplazamiento(Math.max(0, Math.min(delta, 92)));
  }

  function terminarDeslizamiento(
    evento: React.PointerEvent<HTMLDivElement>,
  ) {
    const inicio = inicioDeslizamiento.current;
    if (!inicio || inicio.pointerId !== evento.pointerId) return;
    const delta = (evento.clientX - inicio.x) * direccionPermitida;
    if (Math.max(0, delta) >= 64) onResponder(mensaje);
    inicioDeslizamiento.current = null;
    setDesplazamiento(0);
  }

  useEffect(() => {
    if (!visorAbierto) return;
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setVisorAbierto(false);
    };
    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [visorAbierto]);

  return (
    <>
      <div className={cn("relative flex w-full", saliente ? "justify-end" : "justify-start")}>
        {desplazamiento > 8 && (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 z-0 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-brand-400/25 bg-brand-500/10 text-brand-200 transition-opacity",
              saliente ? "right-2" : "left-2",
            )}
            style={{ opacity: Math.min(desplazamiento / 64, 1) }}
            aria-hidden="true"
          >
            <ReplyIcon className="size-4" />
          </span>
        )}
        <div
          onPointerDown={iniciarDeslizamiento}
          onPointerMove={moverDeslizamiento}
          onPointerUp={terminarDeslizamiento}
          onPointerCancel={terminarDeslizamiento}
          onLostPointerCapture={() => {
            inicioDeslizamiento.current = null;
            setDesplazamiento(0);
          }}
          style={{
            transform: `translateX(${desplazamiento * direccionPermitida}px)`,
            transition: inicioDeslizamiento.current ? "none" : "transform 180ms ease-out",
          }}
          className={cn(
            "relative z-10 max-w-[86%] touch-pan-y select-none rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[72%]",
            saliente
              ? "rounded-br-md border border-brand-500/25 bg-brand-500/15 text-white"
              : "rounded-bl-md border border-white/10 bg-white/[0.055] text-white/90",
          )}
        >
          {saliente && mensaje.origen === "IA" && (
            <span className="mb-1 block text-[0.65rem] font-semibold tracking-wider text-brand-200/80 uppercase">
              Respuesta IA
            </span>
          )}
          {contenidoCitado && (
            <div className="mb-2 rounded-lg border-l-2 border-brand-300/70 bg-black/20 px-2.5 py-1.5">
              <p className="text-[0.65rem] font-semibold text-brand-200/90">
                {citaEntrante ? nombreCitado : "Tú"}
              </p>
              {mediaCitada && tipoCitado === "IMAGEN" ? (
                <img
                  src={mediaCitada}
                  alt="Imagen citada"
                  className="mt-1 max-h-20 max-w-32 rounded object-cover"
                />
              ) : mediaCitada && tipoCitado === "VIDEO" ? (
                <video
                  src={mediaCitada}
                  muted
                  preload="metadata"
                  className="mt-1 max-h-20 max-w-32 rounded object-cover"
                />
              ) : (
                <p className="line-clamp-2 text-xs text-white/55">
                  {contenidoCitado}
                </p>
              )}
            </div>
          )}
          {mensaje.media_url && esImagen && (
            <div className="group relative mb-2 overflow-hidden rounded-xl">
              <img
                src={mensaje.media_url}
                alt={mensaje.contenido ?? "Imagen de WhatsApp"}
                className="max-h-72 max-w-full cursor-zoom-in object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                onClick={() => setVisorAbierto(true)}
              />
              <button
                type="button"
                onClick={() => setVisorAbierto(true)}
                aria-label="Ver imagen en grande"
                className="absolute right-2 bottom-2 rounded-lg border border-white/20 bg-black/60 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Maximize2Icon className="size-4" />
              </button>
            </div>
          )}
          {mensaje.media_url && esVideo && (
            <div className="group relative mb-2 overflow-hidden rounded-xl bg-black/30">
              <video
                src={mensaje.media_url}
                controls
                preload="metadata"
                className="max-h-72 max-w-full rounded-xl"
              />
              <button
                type="button"
                onClick={() => setVisorAbierto(true)}
                aria-label="Ver video en grande"
                className="absolute top-2 right-2 rounded-lg border border-white/20 bg-black/60 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Maximize2Icon className="size-4" />
              </button>
            </div>
          )}
          {mensaje.media_url && mensaje.tipo === "AUDIO" && (
            <audio src={mensaje.media_url} controls className="mb-2 max-w-full" />
          )}
          {mensaje.media_url && mensaje.tipo === "DOCUMENTO" && (
            <a
              href={mensaje.media_url}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block text-brand-200 underline"
            >
              Abrir documento
            </a>
          )}
          {mensaje.contenido && !mensaje.contenido.startsWith("[") && (
            <p className="whitespace-pre-wrap break-words">{mensaje.contenido}</p>
          )}
          <div
            className={cn(
              "mt-1.5 flex items-center gap-1.5",
              saliente ? "justify-end" : "justify-start",
            )}
          >
            <span className="text-[0.65rem] text-white/35">
              {formatHora(mensaje.fecha_creacion)}
            </span>
            {saliente && (
              <span title={ESTADO_MENSAJE_LABEL[mensaje.estado]}>
                <IconoEstado estado={mensaje.estado} />
              </span>
            )}
          </div>
        </div>
      </div>
      {visorAbierto && mensaje.media_url && (esImagen || esVideo) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={esImagen ? "Imagen ampliada" : "Video ampliado"}
          onClick={() => setVisorAbierto(false)}
        >
          <button
            type="button"
            onClick={() => setVisorAbierto(false)}
            aria-label="Cerrar vista ampliada"
            className="absolute top-4 right-4 z-10 rounded-full border border-white/20 bg-black/50 p-2.5 text-white transition-colors hover:bg-white/15"
          >
            <XIcon className="size-5" />
          </button>
          <div
            className="relative flex max-h-full max-w-6xl items-center justify-center"
            onClick={(evento) => evento.stopPropagation()}
          >
            {esImagen ? (
              <img
                src={mensaje.media_url}
                alt={mensaje.contenido ?? "Imagen de WhatsApp ampliada"}
                className="max-h-[calc(100svh-4rem)] max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={mensaje.media_url}
                controls
                autoPlay
                preload="metadata"
                className="max-h-[calc(100svh-4rem)] max-w-full rounded-xl bg-black shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
