import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PlataformaIntegracion } from '../entity/integracion.entity';

export class CrearIntegracionDto {
  @IsEnum(PlataformaIntegracion, {
    message: 'La plataforma debe ser una opción válida.',
  })
  plataforma: PlataformaIntegracion;

  @IsString({ message: 'La etiqueta debe ser un texto.' })
  @MinLength(2, { message: 'La etiqueta debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'La etiqueta no puede superar 120 caracteres.' })
  etiqueta: string;

  @IsString({ message: 'La API key debe ser un texto.' })
  @MinLength(8, { message: 'La API key debe tener al menos 8 caracteres.' })
  api_key: string;

  @IsOptional()
  @IsObject({ message: 'La configuración debe ser un objeto.' })
  config?: Record<string, string>;
}
