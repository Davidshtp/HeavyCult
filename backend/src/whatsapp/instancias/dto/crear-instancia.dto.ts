import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const limpiar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CrearInstanciaDto {
  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(80, { message: 'El nombre no puede superar 80 caracteres.' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'El nombre solo puede tener letras, números, guiones y guiones bajos.',
  })
  nombre?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'El número debe ser un texto.' })
  @Matches(/^\d{10,15}$/, {
    message: 'El número debe tener entre 10 y 15 dígitos.',
  })
  numero?: string;
}
