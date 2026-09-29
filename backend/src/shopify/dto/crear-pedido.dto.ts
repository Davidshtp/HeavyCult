import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ItemPedidoDto {
  @IsString({ message: 'El título del ítem debe ser texto.' })
  @MinLength(1, { message: 'El título del ítem es obligatorio.' })
  @MaxLength(255, {
    message: 'El título del ítem no puede superar 255 caracteres.',
  })
  titulo: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número válido.' },
  )
  @Min(0.01, { message: 'El precio debe ser mayor a 0.' })
  precio: number;

  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  cantidad: number;

  @IsOptional()
  @IsString({ message: 'El SKU debe ser texto.' })
  @MaxLength(255, { message: 'El SKU no puede superar 255 caracteres.' })
  sku?: string;
}

export class DireccionPedidoDto {
  @IsString({ message: 'La calle debe ser texto.' })
  @MinLength(2, { message: 'La calle es obligatoria.' })
  @MaxLength(255, { message: 'La calle no puede superar 255 caracteres.' })
  calle: string;

  @IsString({ message: 'El departamento debe ser texto.' })
  @MinLength(2, { message: 'El departamento es obligatorio.' })
  @MaxLength(120, {
    message: 'El departamento no puede superar 120 caracteres.',
  })
  departamento: string;

  @IsString({ message: 'La ciudad debe ser texto.' })
  @MinLength(2, { message: 'La ciudad es obligatoria.' })
  @MaxLength(120, { message: 'La ciudad no puede superar 120 caracteres.' })
  ciudad: string;

  @IsOptional()
  @IsString({ message: 'El código postal debe ser texto.' })
  @MaxLength(20, {
    message: 'El código postal no puede superar 20 caracteres.',
  })
  codigo_postal?: string;

  @IsString({ message: 'El país debe ser texto.' })
  @MinLength(2, { message: 'El país es obligatorio.' })
  @MaxLength(120, { message: 'El país no puede superar 120 caracteres.' })
  pais: string;
}

export class ClientePedidoDto {
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre es obligatorio.' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  nombre: string;

  @IsString({ message: 'El apellido debe ser texto.' })
  @MinLength(2, { message: 'El apellido es obligatorio.' })
  @MaxLength(120, { message: 'El apellido no puede superar 120 caracteres.' })
  apellido: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo del cliente no es válido.' })
  email?: string;

  @IsString({ message: 'El teléfono debe ser texto.' })
  @MaxLength(30, { message: 'El teléfono no puede superar 30 caracteres.' })
  telefono: string;

  @ValidateNested()
  @Type(() => DireccionPedidoDto)
  @IsObject({ message: 'La dirección es obligatoria.' })
  direccion: DireccionPedidoDto;
}

const ESTADOS_FINANCIEROS_VALIDOS = [
  'pending',
  'paid',
  'partially_paid',
] as const;
export type EstadoFinanciero = (typeof ESTADOS_FINANCIEROS_VALIDOS)[number];

export class CrearPedidoDto {
  @ValidateNested()
  @Type(() => ClientePedidoDto)
  @IsObject({ message: 'El cliente es obligatorio.' })
  cliente: ClientePedidoDto;

  @IsArray({ message: 'Debe haber al menos un ítem.' })
  @ArrayMinSize(1, { message: 'Debe haber al menos un ítem.' })
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items: ItemPedidoDto[];

  @IsOptional()
  @IsIn(ESTADOS_FINANCIEROS_VALIDOS, {
    message: 'El estado financiero debe ser pending, paid o partially_paid.',
  })
  estado_financiero?: EstadoFinanciero;

  @IsOptional()
  @IsString({ message: 'La nota debe ser texto.' })
  @MaxLength(1000, { message: 'La nota no puede superar 1000 caracteres.' })
  nota?: string;
}
