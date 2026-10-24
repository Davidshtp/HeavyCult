import { Transform } from 'class-transformer';
import {
  IsIn,
  IsMimeType,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EnviarMensajeDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: 'El mensaje debe ser un texto.' })
  @MinLength(1, { message: 'El mensaje no puede estar vacío.' })
  @MaxLength(4000, { message: 'El mensaje no puede superar 4000 caracteres.' })
  @IsOptional()
  contenido?: string;

  @IsOptional()
  @IsIn(['IMAGEN', 'AUDIO', 'VIDEO', 'DOCUMENTO'])
  tipo?: 'IMAGEN' | 'AUDIO' | 'VIDEO' | 'DOCUMENTO';

  @IsOptional()
  @IsString()
  @MaxLength(16_000_000)
  media_data?: string;

  @IsOptional()
  @IsMimeType()
  @MaxLength(120)
  mime_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre_archivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responder_a?: string;
}
