import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @IsString({ message: 'La contraseña actual debe ser un texto.' })
  contrasenaActual: string;

  @IsString({ message: 'La nueva contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe contener letras y números.',
  })
  nuevaContrasena: string;
}
