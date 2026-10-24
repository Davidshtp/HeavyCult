import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TelefonoWhatsapp } from '../core/normalizar-telefono';
import { Contacto } from '../entity/contacto.entity';
import type { ActualizarContactoDto } from './dto/actualizar-contacto.dto';

@Injectable()
export class ContactosService {
  constructor(
    @InjectRepository(Contacto)
    private readonly contactoRepository: Repository<Contacto>,
  ) {}

  async buscarOCrearPorTelefono(
    telefono: TelefonoWhatsapp,
    nombre: string | null,
  ): Promise<Contacto> {
    let contacto = await this.contactoRepository.findOne({
      where: { telefono_e164: telefono.telefono },
    });

    if (!contacto) {
      const nuevo = this.contactoRepository.create({
        telefono_e164: telefono.telefono,
        wa_id: telefono.waId,
        jid: telefono.jid.slice(0, 120),
        nombre: nombre?.slice(0, 120) ?? null,
      });

      try {
        return await this.contactoRepository.save(nuevo);
      } catch (error) {
        contacto = await this.contactoRepository.findOne({
          where: { telefono_e164: telefono.telefono },
        });
        if (!contacto) throw error;
      }
    }

    const cambios: Partial<Contacto> = {};
    if (nombre && !contacto.nombre) cambios.nombre = nombre.slice(0, 120);
    if (!contacto.wa_id) cambios.wa_id = telefono.waId;
    if (!contacto.jid) cambios.jid = telefono.jid.slice(0, 120);

    if (Object.keys(cambios).length > 0) {
      Object.assign(contacto, cambios);
      return this.contactoRepository.save(contacto);
    }
    return contacto;
  }

  async obtener(idContacto: number): Promise<Contacto> {
    const contacto = await this.contactoRepository.findOne({
      where: { id_contacto: idContacto },
    });
    if (!contacto) {
      throw new NotFoundException('El contacto no existe.');
    }
    return contacto;
  }

  async actualizar(
    idContacto: number,
    dto: ActualizarContactoDto,
  ): Promise<Contacto> {
    const contacto = await this.obtener(idContacto);
    Object.assign(contacto, dto);
    return this.contactoRepository.save(contacto);
  }
}
