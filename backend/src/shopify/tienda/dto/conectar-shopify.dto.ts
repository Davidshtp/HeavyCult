import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ConectarShopifyDto {
  @IsString({ message: 'El dominio de la tienda debe ser texto.' })
  @MinLength(4, {
    message: 'El dominio de la tienda debe tener al menos 4 caracteres.',
  })
  @MaxLength(253, {
    message: 'El dominio de la tienda no puede superar 253 caracteres.',
  })
  shop: string;

  @IsString({ message: 'El Client ID debe ser texto.' })
  @IsNotEmpty({ message: 'El Client ID (API key) es obligatorio.' })
  @MaxLength(255, {
    message: 'El Client ID no puede superar 255 caracteres.',
  })
  client_id: string;

  @IsString({ message: 'El Client Secret debe ser texto.' })
  @IsNotEmpty({ message: 'El Client Secret es obligatorio.' })
  @MaxLength(255, {
    message: 'El Client Secret no puede superar 255 caracteres.',
  })
  client_secret: string;
}
