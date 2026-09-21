import { IsEnum } from 'class-validator';

export class UpdateEstadoUsuarioDto {
  @IsEnum(['ACTIVO', 'INACTIVO', 'BLOQUEADO'], {
    message: 'El estado debe ser ACTIVO, INACTIVO o BLOQUEADO.',
  })
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
}
