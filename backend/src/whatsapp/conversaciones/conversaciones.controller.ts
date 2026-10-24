import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthUser } from '../../auth/strategies/jwt.strategy';
import { ListarMensajesDto } from '../mensajes/dto/listar-mensajes.dto';
import { EnviarMensajeDto } from '../mensajes/dto/enviar-mensaje.dto';
import { MensajesService } from '../mensajes/mensajes.service';
import { ConversacionesService } from './conversaciones.service';
import { ActualizarConversacionDto } from './dto/actualizar-conversacion.dto';
import { ListarConversacionesDto } from './dto/listar-conversaciones.dto';

@Controller('whatsapp/conversaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversacionesController {
  constructor(
    private readonly conversacionesService: ConversacionesService,
    private readonly mensajesService: MensajesService,
  ) {}

  @Get()
  async listar(@Query() dto: ListarConversacionesDto) {
    return this.conversacionesService.listar(dto);
  }

  @Get(':id')
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return {
      conversacion: await this.conversacionesService.obtener(id),
    };
  }

  @Get(':id/mensajes')
  async mensajes(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: ListarMensajesDto,
  ) {
    return this.mensajesService.listar(id, dto.antes_de, dto.limite);
  }

  @Post(':id/mensajes')
  async enviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarMensajeDto,
    @Req() req: { user: AuthUser },
  ) {
    if (dto.tipo && dto.media_data && dto.mime_type) {
      return {
        mensaje: await this.mensajesService.enviarMedia(
          id,
          dto.tipo,
          dto.media_data,
          dto.mime_type,
          dto.nombre_archivo,
          dto.contenido,
          req.user.id_usuario,
          dto.responder_a,
        ),
      };
    }
    return {
      mensaje: await this.mensajesService.enviar(
        id,
        dto.contenido ?? '',
        req.user.id_usuario,
        dto.responder_a,
      ),
    };
  }

  @Patch(':id/leido')
  async marcarLeido(@Param('id', ParseIntPipe) id: number) {
    return {
      conversacion: await this.conversacionesService.marcarLeido(id),
    };
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarConversacionDto,
  ) {
    return {
      conversacion: await this.conversacionesService.actualizar(id, dto),
    };
  }
}
