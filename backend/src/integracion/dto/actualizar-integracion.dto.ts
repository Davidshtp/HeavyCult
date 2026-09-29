import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActualizarIntegracionDto {
  @IsOptional()
  @IsString({ message: 'La etiqueta debe ser un texto.' })
  @MinLength(2, { message: 'La etiqueta debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'La etiqueta no puede superar 120 caracteres.' })
  etiqueta?: string;

  // Vacío = conservar la clave actual (se omite desde el frontend).
  @IsOptional()
  @IsString({ message: 'La API key debe ser un texto.' })
  @MinLength(8, { message: 'La API key debe tener al menos 8 caracteres.' })
  api_key?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  activo?: boolean;

  @IsOptional()
  @IsObject({ message: 'La configuración debe ser un objeto.' })
  config?: Record<string, string>;
}
