import type {
  ContactoWhatsapp,
  EstadoConversacion,
  EstadoInstanciaWhatsapp,
  EstadoMensaje,
  EtapaConversacion,
  MensajeWhatsapp,
  ModoConversacion,
} from "@/lib/whatsapp-api";

export const ESTADO_CONVERSACION_LABEL: Record<EstadoConversacion, string> = {
  ABIERTA: "Abierta",
  PENDIENTE: "Pendiente",
  CERRADA: "Cerrada",
};

export const ETAPA_CONVERSACION_LABEL: Record<EtapaConversacion, string> = {
  NUEVO: "Nuevo",
  INTERESADO: "Interesado",
  COTIZANDO: "Cotizando",
  DATOS: "Datos",
  CONFIRMADO: "Confirmado",
  PEDIDO_CREADO: "Pedido creado",
  PERDIDO: "Perdido",
};

export const MODO_CONVERSACION_LABEL: Record<ModoConversacion, string> = {
  IA: "IA",
  HUMANO: "Humano",
  PAUSADA: "Pausada",
};

export const ESTADO_INSTANCIA_LABEL: Record<EstadoInstanciaWhatsapp, string> = {
  DESCONECTADA: "Desconectada",
  CONECTANDO: "Conectando",
  QR: "Esperando QR",
  CONECTADA: "Conectada",
  ERROR: "Error",
};

export const ESTADO_MENSAJE_LABEL: Record<EstadoMensaje, string> = {
  PENDIENTE: "Pendiente",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  LEIDO: "Leído",
  FALLIDO: "Fallido",
};

export const ETAPAS: EtapaConversacion[] = [
  "NUEVO",
  "INTERESADO",
  "COTIZANDO",
  "DATOS",
  "CONFIRMADO",
  "PEDIDO_CREADO",
  "PERDIDO",
];

export function nombreContacto(contacto: ContactoWhatsapp): string {
  const nombre = [contacto.nombre, contacto.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();
  return nombre || contacto.telefono_e164;
}

export function inicialesContacto(contacto: ContactoWhatsapp): string {
  const nombre = [contacto.nombre, contacto.apellido]
    .filter((parte): parte is string => !!parte?.trim())
    .map((parte) => parte.trim()[0]?.toUpperCase() ?? "")
    .join("");
  if (nombre) return nombre.slice(0, 2);
  return contacto.telefono_e164.replace(/\D/g, "").slice(-2);
}

export function previewMensaje(mensaje: MensajeWhatsapp | null): string {
  if (!mensaje) return "Sin mensajes todavía";
  if (mensaje.contenido?.trim()) return mensaje.contenido.trim();
  const etiquetas: Record<string, string> = {
    IMAGEN: "Imagen recibida",
    AUDIO: "Audio recibido",
    VIDEO: "Video recibido",
    DOCUMENTO: "Documento recibido",
    UBICACION: "Ubicación recibida",
    OTRO: "Mensaje recibido",
  };
  return etiquetas[mensaje.tipo] ?? "Mensaje recibido";
}

export function formatHora(fecha?: string | null): string {
  if (!fecha) return "";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "";
  return valor.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDia(fecha?: string | null): string {
  if (!fecha) return "";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "";
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  if (valor.toDateString() === hoy.toDateString()) return "Hoy";
  if (valor.toDateString() === ayer.toDateString()) return "Ayer";

  return valor.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function colorEtapa(etapa: EtapaConversacion): string {
  const colores: Record<EtapaConversacion, string> = {
    NUEVO: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    INTERESADO: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    COTIZANDO: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    DATOS: "border-violet-400/25 bg-violet-400/10 text-violet-300",
    CONFIRMADO: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    PEDIDO_CREADO:
      "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
    PERDIDO: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  };
  return colores[etapa];
}

export function colorEstadoInstancia(
  estado: EstadoInstanciaWhatsapp,
): string {
  const colores: Record<EstadoInstanciaWhatsapp, string> = {
    DESCONECTADA: "bg-white/25",
    CONECTANDO: "bg-amber-400",
    QR: "bg-amber-400",
    CONECTADA: "bg-emerald-400",
    ERROR: "bg-rose-400",
  };
  return colores[estado];
}
