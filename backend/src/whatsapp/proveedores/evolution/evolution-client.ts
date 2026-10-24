import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVOLUTION_TIMEOUT_MS } from '../../../config/constants';
import type { CredencialesWhatsapp } from '../../core/whatsapp-provider.interface';

const TIMEOUT_POR_DEFECTO_MS = 15000;

export class EvolutionApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'EvolutionApiError';
  }
}

type CuerpoJson = Record<string, unknown>;

function extraerMensaje(cuerpo: unknown): string | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;

  const registro = cuerpo as Record<string, unknown>;
  for (const clave of ['message', 'error', 'mensaje']) {
    const valor = registro[clave];
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
    if (Array.isArray(valor)) {
      const textos = valor.filter(
        (item): item is string => typeof item === 'string' && !!item.trim(),
      );
      if (textos.length > 0) return textos.join(', ');
    }
  }

  for (const clave of ['response', 'data']) {
    const anidado = extraerMensaje(registro[clave]);
    if (anidado) return anidado;
  }
  return null;
}

@Injectable()
export class EvolutionClient {
  private readonly timeoutMs: number;

  constructor(configService: ConfigService) {
    const configurado = Number(
      configService.get<string | number>(EVOLUTION_TIMEOUT_MS),
    );
    this.timeoutMs =
      Number.isFinite(configurado) && configurado > 0
        ? configurado
        : TIMEOUT_POR_DEFECTO_MS;
  }

  async crearInstancia(
    credenciales: CredencialesWhatsapp,
    cuerpo: CuerpoJson,
  ): Promise<CuerpoJson> {
    return this.solicitar<CuerpoJson>(credenciales, '/instance/create', {
      method: 'POST',
      body: cuerpo,
    });
  }

  async conectar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<CuerpoJson> {
    return this.solicitar<CuerpoJson>(
      credenciales,
      `/instance/connect/${encodeURIComponent(nombre)}`,
      { method: 'GET' },
    );
  }

  async estado(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<CuerpoJson> {
    return this.solicitar<CuerpoJson>(
      credenciales,
      `/instance/connectionState/${encodeURIComponent(nombre)}`,
      { method: 'GET' },
    );
  }

  async desconectar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<void> {
    await this.solicitar<CuerpoJson>(
      credenciales,
      `/instance/logout/${encodeURIComponent(nombre)}`,
      { method: 'DELETE' },
    );
  }

  async eliminar(
    credenciales: CredencialesWhatsapp,
    nombre: string,
  ): Promise<void> {
    await this.solicitar<CuerpoJson>(
      credenciales,
      `/instance/delete/${encodeURIComponent(nombre)}`,
      { method: 'DELETE' },
    );
  }

  async enviarTexto(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    numero: string,
    texto: string,
    citado?: {
      id: string;
      texto: string;
      fromMe: boolean;
      remoteJid: string;
    },
  ): Promise<CuerpoJson> {
    return this.solicitar<CuerpoJson>(
      credenciales,
      `/message/sendText/${encodeURIComponent(nombre)}`,
      {
        method: 'POST',
        body: {
          number: numero,
          text: texto,
          ...(citado
            ? {
                quoted: {
                  key: {
                    remoteJid: citado.remoteJid,
                    fromMe: citado.fromMe,
                    id: citado.id,
                  },
                  message: { conversation: citado.texto },
                },
              }
            : {}),
        },
      },
    );
  }

  async enviarMedia(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    numero: string,
    solicitud: {
      mediatype: string;
      mimetype: string;
      media: string;
      fileName?: string;
      caption?: string;
    },
    citado?: {
      id: string;
      texto: string;
      fromMe: boolean;
      remoteJid: string;
    },
  ): Promise<CuerpoJson> {
    return this.solicitar<CuerpoJson>(
      credenciales,
      `/message/sendMedia/${encodeURIComponent(nombre)}`,
      {
        method: 'POST',
        body: {
          number: numero,
          ...solicitud,
          ...(citado
            ? {
                quoted: {
                  key: {
                    remoteJid: citado.remoteJid,
                    fromMe: citado.fromMe,
                    id: citado.id,
                  },
                  message: { conversation: citado.texto },
                },
              }
            : {}),
        },
      },
    );
  }

  async obtenerMediaBase64(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    mensaje: { key: Record<string, unknown>; message: Record<string, unknown> },
  ): Promise<CuerpoJson> {
    return this.solicitar<CuerpoJson>(
      credenciales,
      `/chat/getBase64FromMediaMessage/${encodeURIComponent(nombre)}`,
      {
        method: 'POST',
        body: { message: mensaje },
      },
    );
  }

  async configurarWebhook(
    credenciales: CredencialesWhatsapp,
    nombre: string,
    webhook: CuerpoJson,
  ): Promise<CuerpoJson> {
    return this.solicitar<CuerpoJson>(
      credenciales,
      `/webhook/set/${encodeURIComponent(nombre)}`,
      { method: 'POST', body: webhook },
    );
  }

  async listarInstancias(credenciales: CredencialesWhatsapp): Promise<unknown> {
    return this.solicitar<unknown>(credenciales, '/instance/fetchInstances', {
      method: 'GET',
    });
  }

  private async solicitar<T>(
    credenciales: CredencialesWhatsapp,
    ruta: string,
    opciones: { method: string; body?: CuerpoJson },
  ): Promise<T> {
    const baseUrl = credenciales.baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/${ruta.replace(/^\/+/, '')}`;
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), this.timeoutMs);

    try {
      const respuesta = await fetch(url, {
        method: opciones.method,
        headers: {
          apikey: credenciales.apiKey,
          Accept: 'application/json',
          ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opciones.body ? JSON.stringify(opciones.body) : undefined,
        signal: controlador.signal,
      });

      const texto = await respuesta.text();
      let cuerpo: unknown = null;
      if (texto) {
        try {
          cuerpo = JSON.parse(texto) as unknown;
        } catch {
          cuerpo = null;
        }
      }

      if (!respuesta.ok) {
        const detalle = extraerMensaje(cuerpo);
        throw new EvolutionApiError(
          detalle
            ? `Evolution API: ${detalle.slice(0, 300)}`
            : `Evolution API respondió con HTTP ${respuesta.status}.`,
          respuesta.status,
        );
      }

      return (cuerpo ?? {}) as T;
    } catch (error) {
      if (error instanceof EvolutionApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new EvolutionApiError(
          'Evolution API no respondió dentro del tiempo de espera.',
          null,
        );
      }
      throw new EvolutionApiError(
        'No se pudo contactar Evolution API. Verifica que el servidor esté encendido y la URL configurada.',
        null,
      );
    } finally {
      clearTimeout(temporizador);
    }
  }
}
