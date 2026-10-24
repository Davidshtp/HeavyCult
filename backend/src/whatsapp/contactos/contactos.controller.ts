import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { serializarContacto } from '../conversaciones/conversacion.serializer';
import { ContactosService } from './contactos.service';
import { ActualizarContactoDto } from './dto/actualizar-contacto.dto';

@Controller('whatsapp/contactos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactosController {
  constructor(private readonly contactosService: ContactosService) {}

  @Patch(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarContactoDto,
  ) {
    const contacto = await this.contactosService.actualizar(id, dto);
    return { contacto: serializarContacto(contacto) };
  }
}
