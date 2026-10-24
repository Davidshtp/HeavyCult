"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type {
  ConversacionWhatsapp,
  EstadoInstanciaWhatsapp,
  EstadoMensaje,
  MensajeWhatsapp,
} from "@/lib/whatsapp-api";

export interface EventoEstadoMensaje {
  id_mensaje: number;
  id_conversacion: number;
  wa_message_id: string | null;
  estado: EstadoMensaje;
}

export interface EventoInstanciaQr {
  id_instancia: number;
  nombre: string;
  qr_base64: string | null;
  qr_code: string | null;
  qr_expira_at: string | null;
  estado: EstadoInstanciaWhatsapp;
}

export interface EventoInstanciaEstado {
  id_instancia: number;
  nombre: string;
  estado: EstadoInstanciaWhatsapp;
  numero: string | null;
}

export interface WhatsappSocketHandlers {
  onMensajeNuevo?: (mensaje: MensajeWhatsapp) => void;
  onMensajeEstado?: (evento: EventoEstadoMensaje) => void;
  onConversacionActualizada?: (conversacion: ConversacionWhatsapp) => void;
  onInstanciaQr?: (evento: EventoInstanciaQr) => void;
  onInstanciaEstado?: (evento: EventoInstanciaEstado) => void;
}

export function useWhatsappSocket(
  handlers: WhatsappSocketHandlers,
  enabled = true,
): { conectado: boolean } {
  const handlersRef = useRef(handlers);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;

    const url = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:5560";
    const socket = io(`${url}/whatsapp`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
    });

    socket.on("connect", () => setConectado(true));
    socket.on("disconnect", () => setConectado(false));
    socket.on("connect_error", () => setConectado(false));
    socket.on("mensaje:nuevo", (mensaje: MensajeWhatsapp) => {
      handlersRef.current.onMensajeNuevo?.(mensaje);
    });
    socket.on("mensaje:estado", (evento: EventoEstadoMensaje) => {
      handlersRef.current.onMensajeEstado?.(evento);
    });
    socket.on(
      "conversacion:actualizada",
      (conversacion: ConversacionWhatsapp) => {
        handlersRef.current.onConversacionActualizada?.(conversacion);
      },
    );
    socket.on("instancia:qr", (evento: EventoInstanciaQr) => {
      handlersRef.current.onInstanciaQr?.(evento);
    });
    socket.on("instancia:estado", (evento: EventoInstanciaEstado) => {
      handlersRef.current.onInstanciaEstado?.(evento);
    });

    return () => {
      socket.disconnect();
      setConectado(false);
    };
  }, [enabled]);

  return { conectado };
}
