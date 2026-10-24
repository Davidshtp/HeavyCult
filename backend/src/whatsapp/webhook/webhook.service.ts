import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { EventoWhatsapp } from '../entity/evento-whatsapp.entity';
import { EstadoEventoWhatsapp } from '../entity/whatsapp.enums';
import { InstanciasService } from '../instancias/instancias.service';
import { ConversacionesService } from '../conversaciones/conversaciones.service';
import { MensajesService } from '../mensajes/mensajes.service';
import { EvolutionMapper } from '../proveedores/evolution/evolution.mapper';

type Registro = Record<string, unknown>;

const EVENTOS_SOPORTADOS = new Set([
  'messages.upsert',
  'messages.update',
  'connection.update',
  'qrcode.updated',
]);

const MAX_INTENTOS = 5;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function datos(payload: Registro): Registro | null {
  if (Array.isArray(payload.data)) {
    for (const item of payload.data) {
      if (esRegistro(item)) return item;
    }
    return null;
  }
  return esRegistro(payload.data) ? payload.data : null;
}

function mensajeConMedia(data: Registro): {
  key: Record<string, unknown>;
  message: Record<string, unknown>;
} | null {
  const key = esRegistro(data.key) ? data.key : null;
  const message = esRegistro(data.message) ? data.message : null;
  if (!key || !message) return null;
  const tieneMedia = [
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
  ].some((campo) => esRegistro(message[campo]));
  return tieneMedia ? { key, message } : null;
}

function normalizarEvento(valor: string): string {
  return valor.trim().toLowerCase().replace(/_/g, '.');
}

function nombreInstancia(payload: Registro): string | null {
  const directo = texto(payload.instance);
  if (directo) return directo;
  const data = datos(payload);
  return texto(data?.instance);
}

function hashPayload(payload: Registro): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function textoEstado(valor: unknown): string {
  if (
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  ) {
    return String(valor);
  }
  if (valor === null || valor === undefined) return 'desconocido';
  return JSON.stringify(valor);
}

function construirIdEvento(tipo: string, payload: Registro): string {
  const data = datos(payload);
  const key = esRegistro(data?.key) ? data.key : null;
  const idMensaje = texto(key?.id) ?? texto(data?.messageId);

  if (idMensaje && tipo === 'messages.upsert') {
    return `${tipo}:${idMensaje}`.slice(0, 200);
  }
  if (idMensaje && tipo === 'messages.update') {
    const update = esRegistro(data?.update) ? data.update : null;
    const estado = update?.status ?? data?.status ?? 'desconocido';
    return `${tipo}:${idMensaje}:${textoEstado(estado)}`.slice(0, 200);
  }

  return `${tipo}:${hashPayload(payload)}`.slice(0, 200);
}

function secretoValido(
  recibido: string | undefined,
  esperado: string,
): boolean {
  if (!recibido) return false;
  const limpio = recibido.trim().replace(/^Bearer\s+/i, '');
  if (!limpio) return false;

  const a = Buffer.from(limpio);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(EventoWhatsapp)
    private readonly eventoRepository: Repository<EventoWhatsapp>,
    private readonly instanciasService: InstanciasService,
    private readonly conversacionesService: ConversacionesService,
    private readonly mensajesService: MensajesService,
    private readonly mapper: EvolutionMapper,
  ) {}

  async recibir(payload: unknown, authorization?: string): Promise<void> {
    if (!esRegistro(payload)) {
      throw new BadRequestException('El webhook no contiene un objeto JSON.');
    }

    const eventoCrudo = texto(payload.event);
    if (!eventoCrudo) {
      throw new BadRequestException('El webhook no especifica el evento.');
    }
    const tipo = normalizarEvento(eventoCrudo);
    if (!EVENTOS_SOPORTADOS.has(tipo)) return;

    const nombre = nombreInstancia(payload);
    if (!nombre) {
      throw new BadRequestException(
        'El webhook no especifica la instancia de WhatsApp.',
      );
    }

    const contexto =
      await this.instanciasService.obtenerContextoWebhook(nombre);
    if (!contexto || !secretoValido(authorization, contexto.secreto)) {
      throw new UnauthorizedException('Webhook de WhatsApp no autorizado.');
    }

    const idEventoExterno = construirIdEvento(tipo, payload);
    const existente = await this.eventoRepository.findOne({
      where: {
        id_instancia: contexto.idInstancia,
        id_evento_externo: idEventoExterno,
      },
    });
    if (existente) return;

    const evento = this.eventoRepository.create({
      id_instancia: contexto.idInstancia,
      id_evento_externo: idEventoExterno,
      tipo,
      payload,
      estado: EstadoEventoWhatsapp.PENDIENTE,
      intentos: 0,
      error: null,
      fecha_procesado: null,
    });

    try {
      await this.eventoRepository.save(evento);
    } catch (error) {
      const duplicado = await this.eventoRepository.findOne({
        where: {
          id_instancia: contexto.idInstancia,
          id_evento_externo: idEventoExterno,
        },
      });
      if (duplicado) return;
      throw error;
    }

    await this.procesarEvento(evento, nombre);
  }

  @Cron('*/15 * * * * *')
  async reintentarPendientes(): Promise<void> {
    const pendientes = await this.eventoRepository.find({
      where: {
        estado: In([
          EstadoEventoWhatsapp.PENDIENTE,
          EstadoEventoWhatsapp.FALLIDO,
        ]),
        intentos: In([0, 1, 2, 3, 4]),
      },
      order: { id_evento: 'ASC' },
      take: 20,
    });

    for (const evento of pendientes) {
      const nombre = nombreInstancia(evento.payload);
      if (!nombre) {
        evento.estado = EstadoEventoWhatsapp.FALLIDO;
        evento.error = 'El evento no contiene el nombre de la instancia.';
        evento.intentos += 1;
        await this.eventoRepository.save(evento);
        continue;
      }
      await this.procesarEvento(evento, nombre);
    }
  }

  private async procesarEvento(
    evento: EventoWhatsapp,
    nombreInstanciaEvento: string,
  ): Promise<void> {
    if (evento.intentos >= MAX_INTENTOS) return;

    evento.estado = EstadoEventoWhatsapp.PROCESANDO;
    evento.intentos += 1;
    evento.error = null;
    await this.eventoRepository.save(evento);

    try {
      await this.procesarSegunTipo(evento, nombreInstanciaEvento);

      evento.estado = EstadoEventoWhatsapp.PROCESADO;
      evento.fecha_procesado = new Date();
      await this.eventoRepository.save(evento);
    } catch (error) {
      evento.estado = EstadoEventoWhatsapp.FALLIDO;
      evento.error =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Error desconocido al procesar el evento.';
      await this.eventoRepository.save(evento);
      this.logger.warn(
        `No se pudo procesar el evento de WhatsApp ${evento.id_evento}: ${evento.error ?? 'error desconocido'}`,
      );
    }
  }

  private async procesarSegunTipo(
    evento: EventoWhatsapp,
    nombreInstanciaEvento: string,
  ): Promise<void> {
    if (evento.tipo === 'messages.upsert') {
      const data = datos(evento.payload);
      let payload = evento.payload;
      const media = data ? mensajeConMedia(data) : null;
      if (media) {
        const base64 = await this.instanciasService.obtenerMediaBase64(
          evento.id_instancia,
          media,
        );
        if (base64 && data) {
          payload = {
            ...evento.payload,
            data: { ...data, base64 },
          };
        }
      }
      const mensaje = this.mapper.mapearMensaje(payload);
      if (mensaje) {
        await this.conversacionesService.registrarEntrante(
          evento.id_instancia,
          mensaje,
        );
      }
      return;
    }

    if (evento.tipo === 'messages.update') {
      const cambio = this.mapper.mapearEstadoMensaje(evento.payload);
      if (cambio) {
        await this.mensajesService.actualizarEstadoPorWaId(
          evento.id_instancia,
          cambio.idExterno,
          cambio.estado,
        );
      }
      return;
    }

    if (evento.tipo === 'connection.update') {
      const cambio = this.mapper.mapearConexion(evento.payload);
      if (cambio) {
        await this.instanciasService.actualizarEstadoDesdeWebhook(
          nombreInstanciaEvento,
          cambio.estado,
          cambio.numero,
        );
      }
      return;
    }

    if (evento.tipo === 'qrcode.updated') {
      const qr = this.mapper.mapearQr(evento.payload);
      if (qr) {
        await this.instanciasService.actualizarQrDesdeWebhook(
          nombreInstanciaEvento,
          qr,
        );
      }
    }
  }
}
