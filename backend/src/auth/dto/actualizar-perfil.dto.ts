import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActualizarPerfilDto {
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

  @IsString({ message: 'El teléfono debe ser un texto.' })
  @Matches(/^3\d{9}$/, {
    message:
      'El teléfono debe tener 10 dígitos (formato colombiano, ej. 3001234567).',
  })
  telefono: string;
}
