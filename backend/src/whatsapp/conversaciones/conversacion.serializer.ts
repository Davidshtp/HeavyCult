import type { Contacto } from '../entity/contacto.entity';
import type { Conversacion } from '../entity/conversacion.entity';
import type { Mensaje } from '../entity/mensaje.entity';
import type { WhatsappInstancia } from '../entity/whatsapp-instancia.entity';
import {
  DireccionMensaje,
  type EstadoConversacion,
  type EstadoMensaje,
  type EtapaConversacion,
  type ModoConversacion,
  type OrigenMensaje,
  type ProveedorWhatsapp,
  type TipoMensaje,
} from '../entity/whatsapp.enums';

export interface MensajeSerializado {
  id_mensaje: number;
  id_conversacion: number;
  wa_message_id: string | null;
  direccion: DireccionMensaje;
  origen: OrigenMensaje;
  tipo: TipoMensaje;
  contenido: string | null;
  media_url: string | null;
  metadata: Record<string, unknown> | null;
  estado: EstadoMensaje;
  fecha_creacion: string;
  es_entrante: boolean;
}

export interface ContactoSerializado {
  id_contacto: number;
  telefono_e164: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  documento: string | null;
  direccion: string | null;
  departamento_id: string | null;
  municipio_id: string | null;
  notas: string | null;
}

export interface InstanciaSerializada {
  id_instancia: number;
  nombre: string;
  proveedor: ProveedorWhatsapp;
  estado: WhatsappInstancia['estado'];
  numero: string | null;
}

export interface ConversacionSerializada {
  id_conversacion: number;
  estado: EstadoConversacion;
  modo: ModoConversacion;
  etapa: EtapaConversacion;
  asignado_a: number | null;
  no_leidos: number;
  resumen_ia: string | null;
  ultimo_mensaje_at: string | null;
  id_pedido_shopify: string | null;
  numero_pedido: string | null;
  fecha_creacion: string;
  contacto: ContactoSerializado;
  instancia: InstanciaSerializada;
  ultimo_mensaje: MensajeSerializado | null;
}

export function serializarMensaje(mensaje: Mensaje): MensajeSerializado {
  return {
    id_mensaje: mensaje.id_mensaje,
    id_conversacion: mensaje.id_conversacion,
    wa_message_id: mensaje.wa_message_id,
    direccion: mensaje.direccion,
    origen: mensaje.origen,
    tipo: mensaje.tipo,
    contenido: mensaje.contenido,
    media_url: mensaje.media_url,
    metadata: mensaje.metadata,
    estado: mensaje.estado,
    fecha_creacion: mensaje.fecha_creacion.toISOString(),
    es_entrante: mensaje.direccion === DireccionMensaje.ENTRANTE,
  };
}

export function serializarContacto(contacto: Contacto): ContactoSerializado {
  return {
    id_contacto: contacto.id_contacto,
    telefono_e164: contacto.telefono_e164,
    nombre: contacto.nombre,
    apellido: contacto.apellido,
    email: contacto.email,
    documento: contacto.documento,
    direccion: contacto.direccion,
    departamento_id: contacto.departamento_id,
    municipio_id: contacto.municipio_id,
    notas: contacto.notas,
  };
}

export function serializarInstancia(
  instancia: WhatsappInstancia,
): InstanciaSerializada {
  return {
    id_instancia: instancia.id_instancia,
    nombre: instancia.nombre,
    proveedor: instancia.proveedor,
    estado: instancia.estado,
    numero: instancia.numero,
  };
}

export function serializarConversacion(
  conversacion: Conversacion,
  contacto: Contacto,
  instancia: WhatsappInstancia,
  ultimoMensaje: Mensaje | null,
): ConversacionSerializada {
  return {
    id_conversacion: conversacion.id_conversacion,
    estado: conversacion.estado,
    modo: conversacion.modo,
    etapa: conversacion.etapa,
    asignado_a: conversacion.asignado_a,
    no_leidos: conversacion.no_leidos,
    resumen_ia: conversacion.resumen_ia,
    ultimo_mensaje_at: conversacion.ultimo_mensaje_at
      ? conversacion.ultimo_mensaje_at.toISOString()
      : null,
    id_pedido_shopify: conversacion.id_pedido_shopify,
    numero_pedido: conversacion.numero_pedido,
    fecha_creacion: conversacion.fecha_creacion.toISOString(),
    contacto: serializarContacto(contacto),
    instancia: serializarInstancia(instancia),
    ultimo_mensaje: ultimoMensaje ? serializarMensaje(ultimoMensaje) : null,
  };
}
