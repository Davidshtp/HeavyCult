import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * En una reconexión los secretos pueden venir vacíos: si la conexión ya
 * existe, se conservan los que ya estaban guardados. Por eso son opcionales
 * acá y el controller exige que haya alguno antes de dar de alta la primera vez.
 */
export class ConectarMetaAdsDto {
  @IsString({ message: 'El App ID debe ser texto.' })
  @Matches(/^\d{10,20}$/, {
    message:
      'El App ID debe ser solo el número de la app de Meta, sin el prefijo "app-" ni espacios.',
  })
  app_id: string;

  @IsOptional()
  @IsString({ message: 'El App Secret debe ser texto.' })
  @MaxLength(255, {
    message: 'El App Secret no puede superar 255 caracteres.',
  })
  app_secret?: string;

  @IsOptional()
  @IsString({ message: 'El Access Token debe ser texto.' })
  @MaxLength(2048, {
    message: 'El Access Token no puede superar 2048 caracteres.',
  })
  access_token?: string;

  @IsString({ message: 'La cuenta de anuncios debe ser texto.' })
  @Matches(/^(act_)?\d{6,20}$/i, {
    message:
      'La cuenta de anuncios debe tener el formato act_123456789012 o 123456789012.',
  })
  ad_account_id: string;
}
