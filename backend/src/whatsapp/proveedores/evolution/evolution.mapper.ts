import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  EstadoInstanciaWhatsapp,
  EstadoMensaje,
  TipoMensaje,
} from '../../entity/whatsapp.enums';
import {
  normalizarTelefono,
  type TelefonoWhatsapp,
} from '../../core/normalizar-telefono';

type Registro = Record<string, unknown>;

export interface MensajeEntranteNormalizado {
  idExterno: string;
  telefono: TelefonoWhatsapp;
  tipo: TipoMensaje;
  contenido: string;
  mediaUrl: string | null;
  mediaData: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  nombreContacto: string | null;
  timestamp: Date;
  metadata: Record<string, unknown> | null;
}

export interface CambioEstadoMensajeNormalizado {
  idExterno: string;
  estado: EstadoMensaje;
}

export interface CambioConexionNormalizado {
  estado: EstadoInstanciaWhatsapp;
  numero: string | null;
}

export interface QrNormalizado {
  base64: string | null;
  codigo: string | null;
}

const MAX_TEXTO = 8000;
const MAX_NOMBRE = 120;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function registro(valor: unknown): Registro | null {
  return esRegistro(valor) ? valor : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function recortar(valor: string, maximo: number): string {
  return valor.length > maximo ? `${valor.slice(0, maximo - 1)}…` : valor;
}

function datosEvento(payload: Registro): Registro | null {
  const data = payload.data;
  if (Array.isArray(data)) {
    return data.map(registro).find((item): item is Registro => !!item) ?? null;
  }
  return registro(data);
}

function desenvolverMensaje(message: Registro): Registro {
  let actual = message;
  for (let intento = 0; intento < 4; intento += 1) {
    const contenedor =
      registro(actual.ephemeralMessage) ??
      registro(actual.viewOnceMessage) ??
      registro(actual.viewOnceMessageV2) ??
      registro(actual.documentWithCaptionMessage);

    if (!contenedor) break;
    const siguiente =
      registro(contenedor.message) ??
      registro(contenedor.documentMessage) ??
      null;
    if (!siguiente) break;
    actual = siguiente;
  }
  return actual;
}

interface ContenidoMensaje {
  tipo: TipoMensaje;
  contenido: string;
}

function extraerMedia(
  data: Registro,
  message: Registro,
  tipo: TipoMensaje,
): Pick<MensajeEntranteNormalizado, 'mediaUrl' | 'mediaData' | 'mediaMimeType' | 'mediaFileName'> {
  if (![TipoMensaje.IMAGEN, TipoMensaje.AUDIO, TipoMensaje.VIDEO, TipoMensaje.DOCUMENTO].includes(tipo)) {
    return { mediaUrl: null, mediaData: null, mediaMimeType: null, mediaFileName: null };
  }
  const mensaje = desenvolverMensaje(message);
  const media = registro(
    tipo === TipoMensaje.IMAGEN ? mensaje.imageMessage :
    tipo === TipoMensaje.AUDIO ? mensaje.audioMessage :
    tipo === TipoMensaje.VIDEO ? mensaje.videoMessage : mensaje.documentMessage,
  ) ?? {};
  const mediaData = texto(data.base64) ?? texto(message.base64) ?? texto(media.base64);
  const mediaMimeType = texto(media.mimetype) ??
    (tipo === TipoMensaje.IMAGEN ? 'image/jpeg' : tipo === TipoMensaje.AUDIO ? 'audio/ogg' : tipo === TipoMensaje.VIDEO ? 'video/mp4' : 'application/octet-stream');
  return {
    mediaUrl: texto(media.url) ?? texto(data.mediaUrl),
    mediaData,
    mediaMimeType,
    mediaFileName: texto(media.fileName),
  };
}

function extraerContenido(message: Registro): ContenidoMensaje | null {
  const mensaje = desenvolverMensaje(message);

  if (typeof mensaje.conversation === 'string') {
    return { tipo: TipoMensaje.TEXTO, contenido: recortar(mensaje.conversation, MAX_TEXTO) };
  }

  const extended = registro(mensaje.extendedTextMessage);
  if (extended) {
    const body = texto(extended.text);
    if (body) {
      return { tipo: TipoMensaje.TEXTO, contenido: recortar(body, MAX_TEXTO) };
    }
  }

  const buttons = registro(mensaje.buttonsResponseMessage);
  if (buttons) {
    const body =
      texto(buttons.selectedDisplayText) ?? texto(buttons.selectedButtonId);
    if (body) {
      return { tipo: TipoMensaje.TEXTO, contenido: recortar(body, MAX_TEXTO) };
    }
  }

  const list = registro(mensaje.listResponseMessage);
  if (list) {
    const body = texto(list.title) ?? texto(list.description);
    if (body) {
      return { tipo: TipoMensaje.TEXTO, contenido: recortar(body, MAX_TEXTO) };
    }
  }

  const template = registro(mensaje.templateButtonReplyMessage);
  if (template) {
    const body = texto(template.selectedDisplayText);
    if (body) {
      return { tipo: TipoMensaje.TEXTO, contenido: recortar(body, MAX_TEXTO) };
    }
  }

  const imagen = registro(mensaje.imageMessage);
  if (imagen) {
    const caption = texto(imagen.caption);
    return {
      tipo: TipoMensaje.IMAGEN,
      contenido: caption ? recortar(caption, MAX_TEXTO) : '[Imagen recibida]',
    };
  }

  const video = registro(mensaje.videoMessage);
  if (video) {
    const caption = texto(video.caption);
    return {
      tipo: TipoMensaje.VIDEO,
      contenido: caption ? recortar(caption, MAX_TEXTO) : '[Video recibido]',
    };
  }

  if (registro(mensaje.audioMessage)) {
    return { tipo: TipoMensaje.AUDIO, contenido: '[Audio recibido]' };
  }

  const documento = registro(mensaje.documentMessage);
  if (documento) {
    const nombre = texto(documento.fileName);
    return {
      tipo: TipoMensaje.DOCUMENTO,
      contenido: nombre
        ? recortar(`[Documento: ${nombre}]`, MAX_TEXTO)
        : '[Documento recibido]',
    };
  }

  if (registro(mensaje.locationMessage)) {
    return { tipo: TipoMensaje.UBICACION, contenido: '[Ubicación recibida]' };
  }

  if (registro(mensaje.stickerMessage)) {
    return { tipo: TipoMensaje.OTRO, contenido: '[Sticker recibido]' };
  }

  if (
    registro(mensaje.contactMessage) ||
    registro(mensaje.contactsArrayMessage)
  ) {
    return { tipo: TipoMensaje.OTRO, contenido: '[Contacto compartido]' };
  }

  if (registro(mensaje.pollCreationMessage)) {
    const titulo = texto(registro(mensaje.pollCreationMessage)?.name);
    return {
      tipo: TipoMensaje.OTRO,
      contenido: titulo ? `[Encuesta: ${titulo}]` : '[Encuesta recibida]',
    };
  }

  return null;
}

function fechaDesdeTimestamp(valor: unknown): Date {
  let numero: number | null = null;

  if (typeof valor === 'number') {
    numero = valor;
  } else if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) {
    numero = Number(valor);
  } else if (esRegistro(valor)) {
    const bajo = valor.low;
    const alto = valor.high;
    if (
      typeof bajo === 'number' &&
      (alto === undefined || typeof alto === 'number')
    ) {
      numero = bajo + (alto ?? 0) * 2 ** 32;
    }
  }

  if (numero === null || !Number.isFinite(numero) || numero <= 0) {
    return new Date();
  }

  const milisegundos = numero > 10_000_000_000 ? numero : numero * 1000;
  const fecha = new Date(milisegundos);
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
}

function extraerReferencia(message: Registro): Record<string, unknown> | null {
  const contextInfo = registro(message.contextInfo);
  if (!contextInfo) return null;

  const referencia: Record<string, unknown> = {};
  const anuncio = registro(contextInfo.externalAdReply);
  if (anuncio) {
    const campos = ['title', 'body', 'sourceId', 'sourceUrl', 'mediaType'];
    for (const campo of campos) {
      const valor = anuncio[campo];
      if (typeof valor === 'string' && valor.trim()) {
        referencia[campo] = valor.trim();
      }
    }
    if (typeof anuncio.sourceType === 'string') {
      referencia.sourceType = anuncio.sourceType;
    }
  }

  const cita = registro(contextInfo.quotedMessage);
  const idCitado = texto(contextInfo.stanzaId);
  if (idCitado) {
    referencia.mensaje_citado = idCitado;
  }
  if (cita) {
    referencia.tiene_cita = true;
  }

  return Object.keys(referencia).length > 0 ? referencia : null;
}

function normalizarEstadoNumerico(valor: number): EstadoMensaje | null {
  switch (valor) {
    case 0:
      return EstadoMensaje.FALLIDO;
    case 1:
      return EstadoMensaje.PENDIENTE;
    case 2:
      return EstadoMensaje.ENVIADO;
    case 3:
      return EstadoMensaje.ENTREGADO;
    case 4:
    case 5:
      return EstadoMensaje.LEIDO;
    default:
      return null;
  }
}

function normalizarEstadoTexto(valor: string): EstadoMensaje | null {
  switch (valor.trim().toUpperCase()) {
    case 'ERROR':
    case 'FAILED':
      return EstadoMensaje.FALLIDO;
    case 'PENDING':
      return EstadoMensaje.PENDIENTE;
    case 'SERVER_ACK':
    case 'SENT':
    case 'SENT_TO_SERVER':
      return EstadoMensaje.ENVIADO;
    case 'DELIVERY_ACK':
    case 'DELIVERED':
      return EstadoMensaje.ENTREGADO;
    case 'READ':
    case 'PLAYED':
      return EstadoMensaje.LEIDO;
    default:
      return null;
  }
}

function estadoConexion(valor: string): EstadoInstanciaWhatsapp | null {
  switch (valor.trim().toLowerCase()) {
    case 'open':
    case 'connected':
      return EstadoInstanciaWhatsapp.CONECTADA;
    case 'connecting':
      return EstadoInstanciaWhatsapp.CONECTANDO;
    case 'close':
    case 'closed':
    case 'disconnected':
      return EstadoInstanciaWhatsapp.DESCONECTADA;
    case 'qr':
      return EstadoInstanciaWhatsapp.QR;
    case 'error':
      return EstadoInstanciaWhatsapp.ERROR;
    default:
      return null;
  }
}

@Injectable()
export class EvolutionMapper {
  mapearMensaje(payload: Registro): MensajeEntranteNormalizado | null {
    const data = datosEvento(payload);
    if (!data) return null;

    const key = registro(data.key);
    if (!key || key.fromMe === true) return null;

    const remoteJid = texto(key.remoteJid);
    const alternativo =
      texto(key.remoteJidAlt) ?? texto(key.senderPn) ?? texto(data.senderPn);
    const telefono = normalizarTelefono(remoteJid, alternativo);
    if (!telefono) return null;

    const message = registro(data.message);
    if (!message) return null;

    const contenido = extraerContenido(message);
    if (!contenido) return null;

    const idOriginal = texto(key.id);
    const idExterno =
      idOriginal ??
      createHash('sha256')
        .update(JSON.stringify({ remoteJid, message }))
        .digest('hex')
        .slice(0, 40);

    const nombre = texto(data.pushName);
    const multimedia = extraerMedia(data, message, contenido.tipo);

    return {
      idExterno,
      telefono,
      tipo: contenido.tipo,
      contenido: contenido.contenido,
      ...multimedia,
      nombreContacto: nombre ? recortar(nombre, MAX_NOMBRE) : null,
      timestamp: fechaDesdeTimestamp(data.messageTimestamp),
      metadata: extraerReferencia(message),
    };
  }

  mapearEstadoMensaje(
    payload: Registro,
  ): CambioEstadoMensajeNormalizado | null {
    const data = datosEvento(payload);
    if (!data) return null;

    const key = registro(data.key);
    const idExterno = texto(key?.id) ?? texto(data.messageId);
    if (!idExterno) return null;

    const update = registro(data.update) ?? data;
    const crudo = update.status ?? data.status;
    let estado: EstadoMensaje | null = null;

    if (typeof crudo === 'number') {
      estado = normalizarEstadoNumerico(crudo);
    } else if (typeof crudo === 'string') {
      if (/^\d+$/.test(crudo)) {
        estado = normalizarEstadoNumerico(Number(crudo));
      } else {
        estado = normalizarEstadoTexto(crudo);
      }
    }

    if (!estado) return null;
    return { idExterno, estado };
  }

  mapearConexion(payload: Registro): CambioConexionNormalizado | null {
    const data = datosEvento(payload);
    if (!data) return null;

    const instancia = registro(data.instance);
    const crudo =
      texto(data.state) ??
      texto(instancia?.state) ??
      texto(data.connection) ??
      texto(data.status);
    if (!crudo) return null;

    const estado = estadoConexion(crudo);
    if (!estado) return null;

    const wuid = texto(data.wuid) ?? texto(instancia?.wuid);
    const telefono = normalizarTelefono(wuid);

    return { estado, numero: telefono?.telefono ?? null };
  }

  mapearQr(payload: Registro): QrNormalizado | null {
    const data = datosEvento(payload);
    if (!data) return null;

    const qrcode = registro(data.qrcode);
    const base64Crudo = texto(qrcode?.base64) ?? texto(data.base64);
    const codigo = texto(qrcode?.code) ?? texto(data.code);

    if (!base64Crudo && !codigo) return null;

    let base64 = base64Crudo;
    if (base64 && !base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }

    return { base64: base64 ?? null, codigo };
  }
}
