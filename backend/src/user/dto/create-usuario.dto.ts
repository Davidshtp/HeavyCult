import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  nombre: string;

  @IsString({ message: 'El apellido debe ser un texto.' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'El apellido no puede superar 120 caracteres.' })
  apellido: string;

  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255, { message: 'El correo no puede superar 255 caracteres.' })
  correo: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto.' })
  @MaxLength(20, { message: 'El teléfono no puede superar 20 caracteres.' })
  telefono?: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe contener letras y números.',
  })
  contrasena: string;

  @IsEnum(['ADMIN', 'EMPLEADO'], {
    message: 'El rol debe ser ADMIN o EMPLEADO.',
  })
  rol: 'ADMIN' | 'EMPLEADO';
}
