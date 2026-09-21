import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'El código debe ser un texto.' })
  @Matches(/^[A-F0-9]{6}$/, {
    message: 'El código debe tener 6 caracteres HEX (A-F, 0-9).',
  })
  codigo: string;

  @IsString({ message: 'La nueva contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe contener letras y números.',
  })
  nuevaContrasena: string;
}
