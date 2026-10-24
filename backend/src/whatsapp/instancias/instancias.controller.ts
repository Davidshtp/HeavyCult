import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolUsuario } from '../../user/entity/usuario.entity';
import { CrearInstanciaDto } from './dto/crear-instancia.dto';
import { InstanciasService } from './instancias.service';

@Controller('whatsapp/instancias')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class InstanciasController {
  constructor(private readonly instanciasService: InstanciasService) {}

  @Get()
  async listar() {
    return { instancias: await this.instanciasService.listar() };
  }

  @Post()
  async crear(@Body() dto: CrearInstanciaDto) {
    return { instancia: await this.instanciasService.crear(dto) };
  }

  @Get(':id')
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return { instancia: await this.instanciasService.obtener(id) };
  }

  @Post(':id/conectar')
  async conectar(@Param('id', ParseIntPipe) id: number) {
    return { instancia: await this.instanciasService.conectar(id) };
  }

  @Get(':id/estado')
  async estado(@Param('id', ParseIntPipe) id: number) {
    return { instancia: await this.instanciasService.consultarEstado(id) };
  }

  @Post(':id/desconectar')
  async desconectar(@Param('id', ParseIntPipe) id: number) {
    return { instancia: await this.instanciasService.desconectar(id) };
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.instanciasService.eliminar(id);
    return { ok: true };
  }
}
