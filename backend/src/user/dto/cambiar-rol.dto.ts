import { IsEnum } from 'class-validator';
import { RolUsuario } from '../entity/usuario.entity';

export class CambiarRolUsuarioDto {
  @IsEnum(RolUsuario, { message: 'El rol debe ser ADMIN o EMPLEADO.' })
  rol!: RolUsuario;
}
