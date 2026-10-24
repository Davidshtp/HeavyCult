import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactosService } from '../contactos/contactos.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import type { MensajeEntranteNormalizado } from '../proveedores/evolution/evolution.mapper';
import { InstanciasService } from '../instancias/instancias.service';
import { Conversacion } from '../entity/conversacion.entity';
import {
  DireccionMensaje,
  EstadoConversacion,
  EstadoMensaje,
  ModoConversacion,
  OrigenMensaje,
  TipoMensaje,
} from '../entity/whatsapp.enums';
import type {
  MensajeCitado,
  SolicitudEnvioMedia,
} from '../core/whatsapp-provider.interface';
import { Mensaje } from '../entity/mensaje.entity';
import { WhatsappGateway } from '../realtime/whatsapp.gateway';
import {
  serializarMensaje,
  type MensajeSerializado,
} from '../conversaciones/conversacion.serializer';

const LIMITE_MENSAJES = 50;

const RANGO_ESTADO: Record<EstadoMensaje, number> = {
  [EstadoMensaje.PENDIENTE]: 0,
  [EstadoMensaje.FALLIDO]: 0,
  [EstadoMensaje.ENVIADO]: 1,
  [EstadoMensaje.ENTREGADO]: 2,
  [EstadoMensaje.LEIDO]: 3,
};

export interface PaginaMensajes {
  mensajes: MensajeSerializado[];
  tiene_mas: boolean;
  siguiente_antes_de: number | null;
}

@Injectable()
export class MensajesService {
  private readonly logger = new Logger(MensajesService.name);
  constructor(
    @InjectRepository(Mensaje)
    private readonly mensajeRepository: Repository<Mensaje>,
    @InjectRepository(Conversacion)
    private readonly conversacionRepository: Repository<Conversacion>,
    private readonly contactosService: ContactosService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly instanciasService: InstanciasService,
    private readonly gateway: WhatsappGateway,
  ) {}

  async registrarEntrante(
    conversacion: Conversacion,
    mensaje: MensajeEntranteNormalizado,
  ): Promise<Mensaje | null> {
    const existente = await this.mensajeRepository.findOne({
      where: {
        id_instancia: conversacion.id_instancia,
        wa_message_id: mensaje.idExterno,
      },
    });
    if (existente) return null;

    let mediaUrl: string | null = null;
    const mediaFuente = mensaje.mediaData ?? mensaje.mediaUrl;
    if (
      mediaFuente &&
      mensaje.mediaMimeType &&
      (mensaje.tipo === TipoMensaje.IMAGEN ||
        mensaje.tipo === TipoMensaje.AUDIO ||
        mensaje.tipo === TipoMensaje.VIDEO ||
        mensaje.tipo === TipoMensaje.DOCUMENTO)
    ) {
      const subida = await this.cloudinaryService.subirMediaWhatsapp(
        mediaFuente,
        mensaje.tipo,
        mensaje.mediaMimeType,
      );
      mediaUrl = subida.url_imagen;
      this.logger.log(
        `Multimedia entrante ${mensaje.tipo} subida a Cloudinary para la conversación ${conversacion.id_conversacion}.`,
      );
    }

    const entidad = this.mensajeRepository.create({
      id_conversacion: conversacion.id_conversacion,
      id_instancia: conversacion.id_instancia,
      wa_message_id: mensaje.idExterno,
      direccion: DireccionMensaje.ENTRANTE,
      origen: OrigenMensaje.CLIENTE,
      tipo: mensaje.tipo,
      contenido: mensaje.contenido,
      media_url: mediaUrl,
      estado: EstadoMensaje.ENVIADO,
      metadata: {
        ...(mensaje.metadata ?? {}),
        ...(mensaje.mediaMimeType
          ? { mime_type: mensaje.mediaMimeType }
          : {}),
        ...(mensaje.mediaFileName
          ? { nombre_archivo: mensaje.mediaFileName }
          : {}),
      },
      fecha_creacion: mensaje.timestamp,
    });

    try {
      return await this.mensajeRepository.save(entidad);
    } catch (error) {
      const duplicado = await this.mensajeRepository.findOne({
        where: {
          id_instancia: conversacion.id_instancia,
          wa_message_id: mensaje.idExterno,
        },
      });
      if (duplicado) return null;
      throw error;
    }
  }

  async enviar(
    idConversacion: number,
    contenido: string,
    idUsuario: number,
    responderA?: string,
  ): Promise<MensajeSerializado> {
    const conversacion = await this.conversacionRepository.findOne({
      where: { id_conversacion: idConversacion },
    });
    if (!conversacion) {
      throw new NotFoundException('La conversación no existe.');
    }

    if (conversacion.estado === EstadoConversacion.CERRADA) {
      throw new BadRequestException(
        'La conversación está cerrada. Reábrela antes de responder.',
      );
    }

    const texto = contenido.trim();
    if (!texto) {
      throw new BadRequestException('El mensaje no puede estar vacío.');
    }

    const contacto = await this.contactosService.obtener(
      conversacion.id_contacto,
    );
    const envio = await this.instanciasService.prepararEnvio(
      conversacion.id_instancia,
    );
    const citado = await this.obtenerMensajeCitado(
      conversacion.id_conversacion,
      responderA,
      [contacto.nombre, contacto.apellido].filter(Boolean).join(' ').trim() ||
        null,
    );

    const entidad = this.mensajeRepository.create({
      id_conversacion: conversacion.id_conversacion,
      id_instancia: conversacion.id_instancia,
      wa_message_id: null,
      direccion: DireccionMensaje.SALIENTE,
      origen: OrigenMensaje.AGENTE,
      tipo: TipoMensaje.TEXTO,
      contenido: texto,
      media_url: null,
      estado: EstadoMensaje.PENDIENTE,
      metadata: {
        id_usuario: idUsuario,
        ...(citado
          ? {
              responder_a: citado.id,
              responder_a_contenido: citado.texto,
              responder_a_es_entrante: !citado.fromMe,
              responder_a_nombre: citado.nombreCliente,
              responder_a_media_url: citado.mediaUrl,
              responder_a_tipo: citado.tipo,
            }
          : {}),
      },
    });
    await this.mensajeRepository.save(entidad);

    try {
      const resultado = await this.instanciasService.enviarTexto(
        envio,
        contacto.telefono_e164,
        texto,
        citado,
      );
      entidad.wa_message_id = resultado.idExterno;
      entidad.estado = resultado.estado;
      await this.mensajeRepository.save(entidad);

      if (resultado.estado === EstadoMensaje.FALLIDO) {
        throw new Error('Evolution no devolvió el identificador del mensaje.');
      }
    } catch {
      entidad.estado = EstadoMensaje.FALLIDO;
      entidad.metadata = {
        ...(entidad.metadata ?? {}),
        error: 'No se pudo entregar el mensaje al proveedor.',
      };
      await this.mensajeRepository.save(entidad);
      this.emitirMensaje(entidad);
      throw new BadGatewayException(
        'No se pudo enviar el mensaje por WhatsApp. Verifica la conexión de la instancia.',
      );
    }

    await this.conversacionRepository.update(conversacion.id_conversacion, {
      modo: ModoConversacion.HUMANO,
      ultimo_mensaje_at: entidad.fecha_creacion,
    });

    this.emitirMensaje(entidad);
    this.emitirConversacion(conversacion.id_conversacion, entidad);
    return serializarMensaje(entidad);
  }

  async enviarMedia(
    idConversacion: number,
    tipo: SolicitudEnvioMedia['tipo'],
    mediaData: string,
    mimeType: string,
    nombreArchivo: string | undefined,
    caption: string | undefined,
    idUsuario: number,
    responderA?: string,
  ): Promise<MensajeSerializado> {
    const conversacion = await this.conversacionRepository.findOne({
      where: { id_conversacion: idConversacion },
    });
    if (!conversacion) throw new NotFoundException('La conversación no existe.');
    if (conversacion.estado === EstadoConversacion.CERRADA) {
      throw new BadRequestException(
        'La conversación está cerrada. Reábrela antes de responder.',
      );
    }

    const contacto = await this.contactosService.obtener(
      conversacion.id_contacto,
    );
    const envio = await this.instanciasService.prepararEnvio(
      conversacion.id_instancia,
    );
    const citado = await this.obtenerMensajeCitado(
      conversacion.id_conversacion,
      responderA,
      [contacto.nombre, contacto.apellido].filter(Boolean).join(' ').trim() ||
        null,
    );
    const subida = await this.cloudinaryService.subirMediaWhatsapp(
      mediaData,
      tipo,
      mimeType,
    );
    const entidad = this.mensajeRepository.create({
      id_conversacion: conversacion.id_conversacion,
      id_instancia: conversacion.id_instancia,
      wa_message_id: null,
      direccion: DireccionMensaje.SALIENTE,
      origen: OrigenMensaje.AGENTE,
      tipo: tipo as TipoMensaje,
      contenido: caption?.trim() || nombreArchivo || `[${tipo.toLowerCase()}]`,
      media_url: subida.url_imagen,
      estado: EstadoMensaje.PENDIENTE,
      metadata: {
        id_usuario: idUsuario,
        mime_type: mimeType,
        nombre_archivo: nombreArchivo,
        ...(citado
          ? {
              responder_a: citado.id,
              responder_a_contenido: citado.texto,
              responder_a_es_entrante: !citado.fromMe,
              responder_a_nombre: citado.nombreCliente,
              responder_a_media_url: citado.mediaUrl,
              responder_a_tipo: citado.tipo,
            }
          : {}),
      },
    });
    await this.mensajeRepository.save(entidad);

    try {
      const resultado = await this.instanciasService.enviarMedia(
        envio,
        contacto.telefono_e164,
        { tipo, media: subida.url_imagen, mimeType, nombreArchivo, caption },
        citado,
      );
      entidad.wa_message_id = resultado.idExterno;
      entidad.estado = resultado.estado;
      await this.mensajeRepository.save(entidad);
      if (resultado.estado === EstadoMensaje.FALLIDO) {
        throw new Error('Evolution no devolvió el identificador del mensaje.');
      }

    } catch (error) {
      const detalle =
        error instanceof Error && error.message
          ? error.message.slice(0, 300)
          : 'No se pudo entregar el archivo por el proveedor.';
      entidad.estado = EstadoMensaje.FALLIDO;
      entidad.metadata = {
        ...(entidad.metadata ?? {}),
        error: detalle,
      };
      await this.mensajeRepository.save(entidad);
      this.emitirMensaje(entidad);
      throw new BadGatewayException(
        'No se pudo enviar el archivo por WhatsApp. Verifica la conexión de la instancia.',
      );
    }

    await this.conversacionRepository.update(conversacion.id_conversacion, {
      modo: ModoConversacion.HUMANO,
      ultimo_mensaje_at: entidad.fecha_creacion,
    });
    this.emitirMensaje(entidad);
    this.emitirConversacion(conversacion.id_conversacion, entidad);
    return serializarMensaje(entidad);
  }

  private async obtenerMensajeCitado(
    idConversacion: number,
    waMessageId?: string,
    nombreCliente?: string | null,
  ): Promise<MensajeCitado | undefined> {
    if (!waMessageId) return undefined;
    const mensaje = await this.mensajeRepository.findOne({
      where: { id_conversacion: idConversacion, wa_message_id: waMessageId },
    });
    if (!mensaje?.wa_message_id) return undefined;
    return {
      id: mensaje.wa_message_id,
      texto: mensaje.contenido ?? `[${mensaje.tipo.toLowerCase()}]`,
      fromMe: mensaje.direccion === DireccionMensaje.SALIENTE,
      nombreCliente: nombreCliente ?? null,
      mediaUrl: mensaje.media_url,
      tipo: mensaje.tipo,
    };
  }

  async listar(
    idConversacion: number,
    antesDe?: number,
    limite?: number,
  ): Promise<PaginaMensajes> {
    const conversacion = await this.conversacionRepository.findOne({
      where: { id_conversacion: idConversacion },
      select: { id_conversacion: true },
    });
    if (!conversacion) {
      throw new NotFoundException('La conversación no existe.');
    }

    const tamano = Math.min(Math.max(limite ?? LIMITE_MENSAJES, 1), 100);
    const query = this.mensajeRepository
      .createQueryBuilder('mensaje')
      .where('mensaje.id_conversacion = :idConversacion', { idConversacion })
      .orderBy('mensaje.id_mensaje', 'DESC')
      .take(tamano + 1);

    if (antesDe) {
      query.andWhere('mensaje.id_mensaje < :antesDe', { antesDe });
    }

    const filas = await query.getMany();
    const tieneMas = filas.length > tamano;
    const mensajes = filas.slice(0, tamano).reverse();
    const serializados = mensajes.map(serializarMensaje);

    return {
      mensajes: serializados,
      tiene_mas: tieneMas,
      siguiente_antes_de: tieneMas
        ? (serializados[0]?.id_mensaje ?? null)
        : null,
    };
  }

  async actualizarEstadoPorWaId(
    idInstancia: number,
    idExterno: string,
    estado: EstadoMensaje,
  ): Promise<void> {
    const mensaje = await this.mensajeRepository.findOne({
      where: {
        id_instancia: idInstancia,
        wa_message_id: idExterno,
      },
    });
    if (!mensaje) return;

    if (estado === EstadoMensaje.FALLIDO) {
      if (
        mensaje.estado !== EstadoMensaje.PENDIENTE &&
        mensaje.estado !== EstadoMensaje.FALLIDO
      ) {
        return;
      }
    } else if (RANGO_ESTADO[estado] <= RANGO_ESTADO[mensaje.estado]) {
      return;
    }

    mensaje.estado = estado;
    await this.mensajeRepository.save(mensaje);
    this.gateway.emitirEstadoMensaje({
      id_mensaje: mensaje.id_mensaje,
      id_conversacion: mensaje.id_conversacion,
      wa_message_id: mensaje.wa_message_id,
      estado: mensaje.estado,
    });
  }

  private emitirMensaje(mensaje: Mensaje): void {
    this.gateway.emitirMensajeNuevo(serializarMensaje(mensaje));
  }

  private emitirConversacion(idConversacion: number, mensaje: Mensaje): void {
    this.gateway.emitirConversacionActualizada({
      id_conversacion: idConversacion,
      ultimo_mensaje_at: mensaje.fecha_creacion.toISOString(),
      ultimo_mensaje: serializarMensaje(mensaje),
    });
  }
}
