import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  correo: string;
}
