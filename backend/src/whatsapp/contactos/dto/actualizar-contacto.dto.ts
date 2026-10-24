import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const limpiar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ActualizarContactoDto {
  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  nombre?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'El apellido debe ser un texto.' })
  @MaxLength(120, { message: 'El apellido no puede superar 120 caracteres.' })
  apellido?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  @MaxLength(160, { message: 'El correo no puede superar 160 caracteres.' })
  email?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'El documento debe ser un texto.' })
  @MaxLength(40, { message: 'El documento no puede superar 40 caracteres.' })
  documento?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'La dirección debe ser un texto.' })
  @MaxLength(200, { message: 'La dirección no puede superar 200 caracteres.' })
  direccion?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'El departamento debe ser un texto.' })
  @Matches(/^\d{2}$/, {
    message: 'El departamento debe tener 2 dígitos.',
  })
  departamento_id?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'El municipio debe ser un texto.' })
  @Matches(/^\d{5}$/, { message: 'El municipio debe tener 5 dígitos.' })
  municipio_id?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'Las notas deben ser un texto.' })
  @MaxLength(2000, { message: 'Las notas no pueden superar 2000 caracteres.' })
  notas?: string;
}
