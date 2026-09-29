import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
import { CambiarRolUsuarioDto } from './dto/cambiar-rol.dto';
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
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoUsuarioDto,
  ) {
    if (id === req.user.id_usuario) {
      throw new ForbiddenException('No puedes modificar tu propio estado.');
    }
    const estado = dto.estado as EstadoUsuario;
    const usuario = await this.userService.cambiarEstado(id, estado);
    return {
      message: 'Estado actualizado correctamente.',
      usuario,
    };
  }

  @Patch(':id/rol')
  @Roles(RolUsuario.ADMIN)
  async cambiarRol(
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarRolUsuarioDto,
  ) {
    if (id === req.user.id_usuario) {
      throw new ForbiddenException('No puedes cambiar tu propio rol.');
    }
    const usuario = await this.userService.cambiarRol(id, dto.rol);
    return {
      message: 'Rol actualizado correctamente.',
      usuario,
    };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  async eliminar(
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (id === req.user.id_usuario) {
      throw new ForbiddenException('No puedes eliminar tu propio usuario.');
    }
    await this.userService.eliminar(id);
    return { message: 'Usuario eliminado correctamente.' };
  }
}
