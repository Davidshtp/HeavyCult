import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GuardarConfiguracionWhatsappDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: 'La URL de Evolution debe ser un texto.' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'La URL de Evolution debe iniciar con http:// o https://.' },
  )
  @MaxLength(300, { message: 'La URL no puede superar 300 caracteres.' })
  base_url: string;

  @IsOptional()
  @IsString({ message: 'La API key debe ser un texto.' })
  @MinLength(8, { message: 'La API key debe tener al menos 8 caracteres.' })
  @MaxLength(500, { message: 'La API key no puede superar 500 caracteres.' })
  api_key?: string;

  @IsOptional()
  @IsString({ message: 'La etiqueta debe ser un texto.' })
  @MinLength(2, { message: 'La etiqueta debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'La etiqueta no puede superar 120 caracteres.' })
  etiqueta?: string;
}
