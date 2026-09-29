import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../user/entity/usuario.entity';
import { ActualizarIntegracionDto } from './dto/actualizar-integracion.dto';
import { CrearIntegracionDto } from './dto/crear-integracion.dto';
import { IntegracionService } from './integracion.service';

@Controller('integraciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegracionController {
  constructor(private readonly integracionService: IntegracionService) {}

  @Get()
  @Roles(RolUsuario.ADMIN)
  listar() {
    return this.integracionService.listar();
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  async crear(@Body() dto: CrearIntegracionDto) {
    const integracion = await this.integracionService.crear(dto);
    return { message: 'Conexión agregada correctamente.', integracion };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarIntegracionDto,
  ) {
    const integracion = await this.integracionService.actualizar(id, dto);
    return { message: 'Conexión actualizada correctamente.', integracion };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.integracionService.eliminar(id);
    return { message: 'Conexión eliminada correctamente.' };
  }

  @Post(':id/probar')
  @Roles(RolUsuario.ADMIN)
  async probar(@Param('id', ParseIntPipe) id: number) {
    const resultado = await this.integracionService.probar(id);
    return { ok: resultado.ok, mensaje: resultado.mensaje };
  }
}
