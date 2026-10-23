import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ItemPedidoDto {
  @IsString({ message: 'El id de la variante debe ser texto.' })
  @MinLength(1, { message: 'El id de la variante es obligatorio.' })
  @Matches(/^gid:\/\/shopify\/ProductVariant\/\d+$/, {
    message: 'id_variante debe ser un GID válido de variante de Shopify.',
  })
  id_variante!: string;

  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  cantidad!: number;
}

export class DireccionPedidoDto {
  @IsString({ message: 'La calle debe ser texto.' })
  @MinLength(2, { message: 'La calle es obligatoria.' })
  @MaxLength(255, { message: 'La calle no puede superar 255 caracteres.' })
  calle!: string;

  @IsString({ message: 'El departamento debe ser texto.' })
  @MinLength(2, { message: 'El departamento es obligatorio.' })
  @MaxLength(120, {
    message: 'El departamento no puede superar 120 caracteres.',
  })
  departamento!: string;

  @IsString({ message: 'La ciudad debe ser texto.' })
  @MinLength(2, { message: 'La ciudad es obligatoria.' })
  @MaxLength(120, { message: 'La ciudad no puede superar 120 caracteres.' })
  ciudad!: string;
}

export class ClientePedidoDto {
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre es obligatorio.' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  nombre!: string;

  @IsString({ message: 'El apellido debe ser texto.' })
  @MinLength(2, { message: 'El apellido es obligatorio.' })
  @MaxLength(120, { message: 'El apellido no puede superar 120 caracteres.' })
  apellido!: string;

  @IsEmail({}, { message: 'El email del cliente no es válido.' })
  email!: string;

  @IsString({ message: 'El teléfono debe ser texto.' })
  @MinLength(7, { message: 'El teléfono debe tener al menos 7 dígitos.' })
  @MaxLength(30, { message: 'El teléfono no puede superar 30 caracteres.' })
  telefono!: string;
}

const ESTADOS_FINANCIEROS_VALIDOS = ['pending', 'paid'] as const;
export type EstadoFinanciero = (typeof ESTADOS_FINANCIEROS_VALIDOS)[number];

export class CrearPedidoDto {
  @ValidateNested()
  @Type(() => ClientePedidoDto)
  @IsObject({ message: 'El cliente es obligatorio.' })
  cliente!: ClientePedidoDto;

  @ValidateNested()
  @Type(() => DireccionPedidoDto)
  @IsObject({ message: 'La dirección de envío es obligatoria.' })
  direccion_envio!: DireccionPedidoDto;

  @IsArray({ message: 'Debe haber al menos un ítem.' })
  @ArrayMinSize(1, { message: 'Debe haber al menos un ítem.' })
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items!: ItemPedidoDto[];

  /**
   * Contraentrega es el flujo por defecto: el transportador cobra al recibir.
   * `pending` es lo que deja la orden abierta en Shopify hasta que se confirme.
   */
  @IsOptional()
  @IsIn(ESTADOS_FINANCIEROS_VALIDOS, {
    message: 'El estado financiero debe ser pending o paid.',
  })
  estado_financiero?: EstadoFinanciero;

  @IsOptional()
  @IsString({ message: 'La nota debe ser texto.' })
  @MaxLength(1000, { message: 'La nota no puede superar 1000 caracteres.' })
  nota?: string;
}
