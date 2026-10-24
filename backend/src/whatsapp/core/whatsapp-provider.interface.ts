import {
  EstadoInstanciaWhatsapp,
  EstadoMensaje,
} from '../entity/whatsapp.enums';

export const PROVEEDOR_WHATSAPP = Symbol('PROVEEDOR_WHATSAPP');

export interface CredencialesWhatsapp {
  baseUrl: string;
  apiKey: string;
}

export interface SolicitudCrearInstancia {
  nombre: string;
  webhookUrl: string;
  webhookSecret: string;
  numero?: string;
}

export interface ResultadoConexion {
  codigoQr: string | null;
  base64Qr: string | null;
  pairingCode: string | null;
}

export interface EstadoConexion {
  estado: EstadoInstanciaWhatsapp;
  numero: string | null;
}

export interface ResultadoEnvio {
  idExterno: string | null;
  estado: EstadoMensaje;
}

export interface MensajeCitado {
  id: string;
  texto: string;
  fromMe: boolean;
  nombreCliente: string | null;
  mediaUrl: string | null;
  tipo: string;
}

export interface SolicitudEnvioMedia {
  tipo: 'IMAGEN' | 'AUDIO' | 'VIDEO' | 'DOCUMENTO';
  media: string;
  mimeType: string;
  nombreArchivo?: string;
  caption?: string;
}

export interface ProveedorWhatsapp {
  configurarWebhook(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    solicitud: SolicitudCrearInstancia,
  ): Promise<void>;

  crearInstancia(
    credenciales: CredencialesWhatsapp,
    solicitud: SolicitudCrearInstancia,
  ): Promise<ResultadoConexion>;

  conectar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<ResultadoConexion>;

  estado(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<EstadoConexion>;

  desconectar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<void>;

  eliminar(credenciales: CredencialesWhatsapp, nombre: string): Promise<void>;

  enviarTexto(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    numero: string,
    texto: string,
    citado?: MensajeCitado,
  ): Promise<ResultadoEnvio>;

  enviarMedia(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    numero: string,
    solicitud: SolicitudEnvioMedia,
    citado?: MensajeCitado,
  ): Promise<ResultadoEnvio>;

  obtenerMediaBase64(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    mensaje: { key: Record<string, unknown>; message: Record<string, unknown> },
  ): Promise<string | null>;

  probar(credenciales: CredencialesWhatsapp): Promise<void>;
}
