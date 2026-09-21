import {
  Body,
  Controller,
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
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateEstadoUsuarioDto } from './dto/update-estado.dto';
import { EstadoUsuario, RolUsuario } from './entity/usuario.entity';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(RolUsuario.ADMIN)
  async crearUsuario(@Body() dto: CreateUsuarioDto) {
    const usuario = await this.userService.create(dto);
    return {
      message: 'Usuario creado correctamente.',
      usuario,
    };
  }

  @Get()
  @Roles(RolUsuario.ADMIN)
  async listarUsuarios() {
    return this.userService.findAll();
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.ADMIN)
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoUsuarioDto,
  ) {
    const estado = dto.estado as EstadoUsuario;
    const usuario = await this.userService.cambiarEstado(id, estado);
    return {
      message: 'Estado actualizado correctamente.',
      usuario,
    };
  }
}
