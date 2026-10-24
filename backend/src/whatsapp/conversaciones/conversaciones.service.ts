import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ContactosService } from '../contactos/contactos.service';
import { Contacto } from '../entity/contacto.entity';
import { Conversacion } from '../entity/conversacion.entity';
import {
  EstadoConversacion,
  EtapaConversacion,
  ModoConversacion,
} from '../entity/whatsapp.enums';
import { Mensaje } from '../entity/mensaje.entity';
import { WhatsappInstancia } from '../entity/whatsapp-instancia.entity';
import { MensajesService } from '../mensajes/mensajes.service';
import type { MensajeEntranteNormalizado } from '../proveedores/evolution/evolution.mapper';
import { WhatsappGateway } from '../realtime/whatsapp.gateway';
import {
  serializarConversacion,
  serializarMensaje,
  type ConversacionSerializada,
} from './conversacion.serializer';
import type { ActualizarConversacionDto } from './dto/actualizar-conversacion.dto';
import type { ListarConversacionesDto } from './dto/listar-conversaciones.dto';

export interface PaginaConversaciones {
  conversaciones: ConversacionSerializada[];
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
}

function escaparLike(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

@Injectable()
export class ConversacionesService {
  constructor(
    @InjectRepository(Conversacion)
    private readonly conversacionRepository: Repository<Conversacion>,
    @InjectRepository(Mensaje)
    private readonly mensajeRepository: Repository<Mensaje>,
    @InjectRepository(Contacto)
    private readonly contactoRepository: Repository<Contacto>,
    @InjectRepository(WhatsappInstancia)
    private readonly instanciaRepository: Repository<WhatsappInstancia>,
    private readonly contactosService: ContactosService,
    private readonly mensajesService: MensajesService,
    private readonly gateway: WhatsappGateway,
  ) {}

  async listar(dto: ListarConversacionesDto): Promise<PaginaConversaciones> {
    const pagina = dto.pagina ?? 1;
    const porPagina = dto.por_pagina ?? 20;

    // Usamos un subquery para filtrar por contacto cuando hay búsqueda,
    // y luego traemos las entidades Conversacion limpias para serializarlas.
    const query = this.conversacionRepository
      .createQueryBuilder('conv');

    if (dto.estado) {
      query.andWhere('conv.estado = :estado', { estado: dto.estado });
    }
    if (dto.etapa) {
      query.andWhere('conv.etapa = :etapa', { etapa: dto.etapa });
    }
    if (dto.modo) {
      query.andWhere('conv.modo = :modo', { modo: dto.modo });
    }
    if (dto.id_instancia) {
      query.andWhere('conv.id_instancia = :idInstancia', {
        idInstancia: dto.id_instancia,
      });
    }
    if (dto.solo_no_leidos) {
      query.andWhere('conv.no_leidos > 0');
    }
    if (dto.buscar) {
      const patron = `%${escaparLike(dto.buscar)}%`;
      query
        .leftJoin(
          Contacto,
          'contacto',
          'contacto.id_contacto = conv.id_contacto',
        )
        .andWhere(
          `(contacto.nombre ILIKE :patron
            OR contacto.apellido ILIKE :patron
            OR contacto.telefono_e164 ILIKE :patron
            OR contacto.email ILIKE :patron)`,
          { patron },
        );
    }

    const [conversaciones, total] = await query
      .orderBy('conv.ultimo_mensaje_at', 'DESC', 'NULLS LAST')
      .addOrderBy('conv.fecha_creacion', 'DESC')
      .addOrderBy('conv.id_conversacion', 'DESC')
      .skip((pagina - 1) * porPagina)
      .take(porPagina)
      .getManyAndCount();

    const serializadas = await this.serializarVarias(conversaciones);

    return {
      conversaciones: serializadas,
      pagina,
      por_pagina: porPagina,
      total,
      total_paginas: Math.max(Math.ceil(total / porPagina), 1),
    };
  }

  async obtener(idConversacion: number): Promise<ConversacionSerializada> {
    const conversacion = await this.obtenerEntidad(idConversacion);
    return this.serializarUna(conversacion);
  }

  async registrarEntrante(
    idInstancia: number,
    mensaje: MensajeEntranteNormalizado,
  ): Promise<ConversacionSerializada | null> {
    const instancia = await this.instanciaRepository.findOne({
      where: { id_instancia: idInstancia },
    });
    if (!instancia) return null;

    const contacto = await this.contactosService.buscarOCrearPorTelefono(
      mensaje.telefono,
      mensaje.nombreContacto,
    );
    const conversacion = await this.buscarOCrearConversacion(
      contacto.id_contacto,
      idInstancia,
    );

    const entidad = await this.mensajesService.registrarEntrante(
      conversacion,
      mensaje,
    );
    if (!entidad) return null;

    conversacion.no_leidos += 1;
    conversacion.ultimo_mensaje_at = entidad.fecha_creacion;
    await this.conversacionRepository.save(conversacion);

    const serializada = serializarConversacion(
      conversacion,
      contacto,
      instancia,
      entidad,
    );

    this.gateway.emitirMensajeNuevo(serializarMensaje(entidad));
    this.gateway.emitirConversacionActualizada(serializada);
    return serializada;
  }

  async actualizar(
    idConversacion: number,
    dto: ActualizarConversacionDto,
  ): Promise<ConversacionSerializada> {
    const conversacion = await this.obtenerEntidad(idConversacion);

    if (dto.estado !== undefined) conversacion.estado = dto.estado;
    if (dto.modo !== undefined) conversacion.modo = dto.modo;
    if (dto.etapa !== undefined) conversacion.etapa = dto.etapa;
    if (dto.asignado_a !== undefined) {
      conversacion.asignado_a = dto.asignado_a;
    }

    await this.conversacionRepository.save(conversacion);
    const serializada = await this.serializarUna(conversacion);
    this.gateway.emitirConversacionActualizada(serializada);
    return serializada;
  }

  async marcarLeido(idConversacion: number): Promise<ConversacionSerializada> {
    const conversacion = await this.obtenerEntidad(idConversacion);
    if (conversacion.no_leidos !== 0) {
      conversacion.no_leidos = 0;
      await this.conversacionRepository.save(conversacion);
    }
    const serializada = await this.serializarUna(conversacion);
    this.gateway.emitirConversacionActualizada(serializada);
    return serializada;
  }

  private async buscarOCrearConversacion(
    idContacto: number,
    idInstancia: number,
  ): Promise<Conversacion> {
    const existente = await this.conversacionRepository.findOne({
      where: {
        id_contacto: idContacto,
        id_instancia: idInstancia,
        estado: Not(EstadoConversacion.CERRADA),
      },
    });
    if (existente) return existente;

    const nueva = this.conversacionRepository.create({
      id_contacto: idContacto,
      id_instancia: idInstancia,
      estado: EstadoConversacion.ABIERTA,
      modo: ModoConversacion.HUMANO,
      etapa: EtapaConversacion.NUEVO,
      asignado_a: null,
      no_leidos: 0,
      resumen_ia: null,
      ultimo_mensaje_at: null,
      id_pedido_shopify: null,
      numero_pedido: null,
    });

    try {
      return await this.conversacionRepository.save(nueva);
    } catch (error) {
      const creada = await this.conversacionRepository.findOne({
        where: {
          id_contacto: idContacto,
          id_instancia: idInstancia,
          estado: Not(EstadoConversacion.CERRADA),
        },
      });
      if (creada) return creada;
      throw error;
    }
  }

  private async obtenerEntidad(idConversacion: number): Promise<Conversacion> {
    const conversacion = await this.conversacionRepository.findOne({
      where: { id_conversacion: idConversacion },
    });
    if (!conversacion) {
      throw new NotFoundException('La conversación no existe.');
    }
    return conversacion;
  }

  private async serializarUna(
    conversacion: Conversacion,
  ): Promise<ConversacionSerializada> {
    const [contacto, instancia, ultimoMensaje] = await Promise.all([
      this.contactoRepository.findOne({
        where: { id_contacto: conversacion.id_contacto },
      }),
      this.instanciaRepository.findOne({
        where: { id_instancia: conversacion.id_instancia },
      }),
      this.mensajeRepository.findOne({
        where: { id_conversacion: conversacion.id_conversacion },
        order: { id_mensaje: 'DESC' },
      }),
    ]);

    if (!contacto || !instancia) {
      throw new NotFoundException(
        'La conversación no tiene contacto o instancia asociados.',
      );
    }
    return serializarConversacion(
      conversacion,
      contacto,
      instancia,
      ultimoMensaje,
    );
  }

  private async serializarVarias(
    conversaciones: Conversacion[],
  ): Promise<ConversacionSerializada[]> {
    if (conversaciones.length === 0) return [];

    const idsContactos = [
      ...new Set(conversaciones.map((conv) => conv.id_contacto)),
    ];
    const idsInstancias = [
      ...new Set(conversaciones.map((conv) => conv.id_instancia)),
    ];
    const idsConversaciones = conversaciones.map(
      (conv) => conv.id_conversacion,
    );

    const [contactos, instancias, ultimos] = await Promise.all([
      this.contactoRepository.find({
        where: { id_contacto: In(idsContactos) },
      }),
      this.instanciaRepository.find({
        where: { id_instancia: In(idsInstancias) },
      }),
      this.mensajeRepository
        .createQueryBuilder('mensaje')
        .where('mensaje.id_conversacion IN (:...idsConversaciones)', {
          idsConversaciones,
        })
        .andWhere((qb) => {
          const subconsulta = qb
            .subQuery()
            .select('MAX(ultimo.id_mensaje)')
            .from(Mensaje, 'ultimo')
            .where('ultimo.id_conversacion = mensaje.id_conversacion')
            .getQuery();
          return `mensaje.id_mensaje = (${subconsulta})`;
        })
        .getMany(),
    ]);

    const porContacto = new Map(
      contactos.map((contacto) => [contacto.id_contacto, contacto]),
    );
    const porInstancia = new Map(
      instancias.map((instancia) => [instancia.id_instancia, instancia]),
    );
    const porConversacion = new Map(
      ultimos.map((mensaje) => [mensaje.id_conversacion, mensaje]),
    );

    const resultado: ConversacionSerializada[] = [];
    for (const conversacion of conversaciones) {
      const contacto = porContacto.get(conversacion.id_contacto);
      const instancia = porInstancia.get(conversacion.id_instancia);
      if (!contacto || !instancia) continue;
      resultado.push(
        serializarConversacion(
          conversacion,
          contacto,
          instancia,
          porConversacion.get(conversacion.id_conversacion) ?? null,
        ),
      );
    }
    return resultado;
  }
}
