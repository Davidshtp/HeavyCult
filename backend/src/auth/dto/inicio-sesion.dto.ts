import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class InicioSesionDto {
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  correo: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  contrasena: string;
}
