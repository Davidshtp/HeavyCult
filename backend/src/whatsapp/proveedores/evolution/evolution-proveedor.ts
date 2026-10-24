import { Injectable } from '@nestjs/common';
import {
  EstadoInstanciaWhatsapp,
  EstadoMensaje,
} from '../../entity/whatsapp.enums';
import type {
  CredencialesWhatsapp,
  EstadoConexion,
  ProveedorWhatsapp,
  ResultadoConexion,
  ResultadoEnvio,
  SolicitudEnvioMedia,
  SolicitudCrearInstancia,
  MensajeCitado,
} from '../../core/whatsapp-provider.interface';
import { EvolutionApiError, EvolutionClient } from './evolution-client';

type Registro = Record<string, unknown>;

const EVENTOS_WEBHOOK = [
  'MESSAGES_UPSERT',
  'MESSAGES_UPDATE',
  'CONNECTION_UPDATE',
  'QRCODE_UPDATED',
];

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function normalizarMediaType(
  tipo: SolicitudEnvioMedia['tipo'],
): 'image' | 'audio' | 'video' | 'document' {
  switch (tipo) {
    case 'IMAGEN':
      return 'image';
    case 'AUDIO':
      return 'audio';
    case 'VIDEO':
      return 'video';
    case 'DOCUMENTO':
      return 'document';
  }
}

function mapaEstado(valor: string | null): EstadoInstanciaWhatsapp {
  switch (valor?.trim().toLowerCase()) {
    case 'open':
    case 'connected':
      return EstadoInstanciaWhatsapp.CONECTADA;
    case 'connecting':
      return EstadoInstanciaWhatsapp.CONECTANDO;
    case 'qr':
      return EstadoInstanciaWhatsapp.QR;
    case 'close':
    case 'closed':
    case 'disconnected':
      return EstadoInstanciaWhatsapp.DESCONECTADA;
    default:
      return EstadoInstanciaWhatsapp.ERROR;
  }
}

function extraerQr(respuesta: Registro): ResultadoConexion {
  const qrcode = esRegistro(respuesta.qrcode) ? respuesta.qrcode : null;
  const codigo =
    texto(qrcode?.code) ??
    texto(respuesta.code) ??
    texto(respuesta.pairingCode);
  let base64 = texto(qrcode?.base64) ?? texto(respuesta.base64);
  if (base64 && !base64.startsWith('data:image')) {
    base64 = `data:image/png;base64,${base64}`;
  }
  return {
    codigoQr: codigo,
    base64Qr: base64,
    pairingCode: texto(respuesta.pairingCode),
  };
}

@Injectable()
export class EvolutionProveedor implements ProveedorWhatsapp {
  constructor(private readonly client: EvolutionClient) {}

  async crearInstancia(
    credenciales: CredencialesWhatsapp,
    solicitud: SolicitudCrearInstancia,
  ): Promise<ResultadoConexion> {
    const respuesta = await this.client.crearInstancia(credenciales, {
      instanceName: solicitud.nombre,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      ...(solicitud.numero ? { number: solicitud.numero } : {}),
      webhook: {
        url: solicitud.webhookUrl,
        byEvents: false,
        base64: true,
        webhookBase64: true,
        headers: {
          authorization: `Bearer ${solicitud.webhookSecret}`,
        },
        events: EVENTOS_WEBHOOK,
      },
    });
    return extraerQr(respuesta);
  }

  async configurarWebhook(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    solicitud: SolicitudCrearInstancia,
  ): Promise<void> {
    await this.client.configurarWebhook(credenciales, nombre, {
      webhook: {
        enabled: true,
        url: solicitud.webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        base64: true,
        events: EVENTOS_WEBHOOK,
        headers: {
          authorization: solicitud.webhookSecret,
        },
      },
    });
  }

  async conectar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<ResultadoConexion> {
    return extraerQr(await this.client.conectar(credenciales, nombre));
  }

  async estado(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<EstadoConexion> {
    try {
      const respuesta = await this.client.estado(credenciales, nombre);
      const instancia = esRegistro(respuesta.instance)
        ? respuesta.instance
        : respuesta;
      const estado = mapaEstado(texto(instancia.state));
      const wuid = texto(instancia.wuid);
      const digitos = wuid?.split('@')[0]?.replace(/\D/g, '') ?? null;
      return {
        estado,
        numero: digitos ? `+${digitos}` : null,
      };
    } catch (error) {
      if (error instanceof EvolutionApiError && error.status === 404) {
        return { estado: EstadoInstanciaWhatsapp.DESCONECTADA, numero: null };
      }
      throw error;
    }
  }

  async desconectar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<void> {
    try {
      await this.client.desconectar(credenciales, nombre);
    } catch (error) {
      if (error instanceof EvolutionApiError && error.status === 404) return;
      throw error;
    }
  }

  async eliminar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<void> {
    try {
      await this.client.eliminar(credenciales, nombre);
    } catch (error) {
      if (error instanceof EvolutionApiError && error.status === 404) return;
      throw error;
    }
  }

  async enviarTexto(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    numero: string,
    textoMensaje: string,
    citado?: MensajeCitado,
  ): Promise<ResultadoEnvio> {
    const respuesta = await this.client.enviarTexto(
      credenciales,
      nombre,
      numero.replace(/\D/g, ''),
      textoMensaje,
      citado
        ? {
            ...citado,
            remoteJid: `${numero.replace(/\D/g, '')}@s.whatsapp.net`,
          }
        : undefined,
    );
    const key = esRegistro(respuesta.key) ? respuesta.key : null;
    const idExterno = texto(key?.id);
    return {
      idExterno,
      estado: idExterno ? EstadoMensaje.ENVIADO : EstadoMensaje.FALLIDO,
    };
  }

  async enviarMedia(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    numero: string,
    solicitud: SolicitudEnvioMedia,
    citado?: MensajeCitado,
  ): Promise<ResultadoEnvio> {
    const mediatype = normalizarMediaType(solicitud.tipo);
    const respuesta = await this.client.enviarMedia(
      credenciales,
      nombre,
      numero.replace(/\D/g, ''),
      {
        mediatype,
        mimetype: solicitud.mimeType,
        media: solicitud.media,
        ...(solicitud.nombreArchivo
          ? { fileName: solicitud.nombreArchivo }
          : {}),
        ...(solicitud.caption ? { caption: solicitud.caption } : {}),
      },
      citado
        ? {
            ...citado,
            remoteJid: `${numero.replace(/\D/g, '')}@s.whatsapp.net`,
          }
        : undefined,
    );
    const key = esRegistro(respuesta.key) ? respuesta.key : null;
    const idExterno = texto(key?.id);
    return {
      idExterno,
      estado: idExterno ? EstadoMensaje.ENVIADO : EstadoMensaje.FALLIDO,
    };
  }

  async obtenerMediaBase64(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    mensaje: { key: Record<string, unknown>; message: Record<string, unknown> },
  ): Promise<string | null> {
    const respuesta = await this.client.obtenerMediaBase64(
      credenciales,
      nombre,
      mensaje,
    );
    return texto(respuesta.base64) ?? texto(esRegistro(respuesta.data) ? respuesta.data.base64 : null);
  }

  async probar(credenciales: CredencialesWhatsapp): Promise<void> {
    await this.client.listarInstancias(credenciales);
  }
}
