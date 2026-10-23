import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { EstadoProductoShopify } from '../productos.types';

export const ORDENES_PRODUCTO = [
  'titulo',
  'precio',
  'stock',
  'creado',
  'variantes',
] as const;
export type OrdenProductos = (typeof ORDENES_PRODUCTO)[number];

export const DIRECCIONES_ORDEN = ['asc', 'desc'] as const;
export type DireccionOrden = (typeof DIRECCIONES_ORDEN)[number];

const ESTADOS_PRODUCTO: EstadoProductoShopify[] = [
  'ACTIVE',
  'ARCHIVED',
  'DRAFT',
  'UNLISTED',
];

export class ListarProductosDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  buscar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  por_pagina?: number;

  @IsOptional()
  @IsIn(ESTADOS_PRODUCTO)
  estado?: EstadoProductoShopify;

  // Llega como string en la query: se normaliza a booleano antes de validar.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  sin_stock?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  proveedor?: string;

  @IsOptional()
  @IsIn(ORDENES_PRODUCTO)
  orden?: OrdenProductos;

  @IsOptional()
  @IsIn(DIRECCIONES_ORDEN)
  direccion?: DireccionOrden;
}

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  descripcion_html?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tipo?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  tags?: string[];

  // No se declaran a propósito, para que la validación los rechace en vez de
  // ignorarlos en silencio y dar la impresión de que se guardaron:
  //   - `estado`: publicarlo, archivarlo o pasarlo a borrador se hace en Shopify.
  //   - `proveedor`: en Shopify es el `vendor`, que también usa el marketplace;
  //     se cambia desde la config de la app.
  //   - `precio`: el precio vive en cada variante, no en el producto.
}

export class VarianteInputDto {
  @IsString()
  @MinLength(1)
  id_variante!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio?: number;

  // Tampoco se declaran, por lo mismo que arriba:
  //   - `costo`: vive en el cost del inventoryItem y solo se cambia en Shopify.
  //   - `sku`: Shopify lo usa para sincronizar inventario y feeds; se cambia en
  //     el admin para no romper la integración de la app.
  //   - `stock`: el inventario se ajusta en Shopify; desde acá no se toca.
}

export class ActualizarVariantesDto {
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => VarianteInputDto)
  variantes!: VarianteInputDto[];
}

/**
 * La garantía vive en el metafield `custom.informacion_de_garantia`
 * (`multi_line_text_field`). Se manda el texto completo, no bloques sueltos:
 * el parser del panel ya usa el formato y Shopify solo almacena la cadena.
 */
export class ActualizarGarantiaDto {
  @IsString()
  @MaxLength(60000)
  garantia!: string;
}

/**
 * El alta manda la imagen como data URL, que el backend sube a Cloudinary para
 * que Shopify la descargue desde ahí. No es un `ImagenProductoInputDto`: ese pide
 * el `id` de una imagen que ya existe en Shopify, y el alta justamente no lo
 * tiene todavía.
 */
export class AgregarImagenDto {
  /**
   * Data URL completa (`data:image/webp;base64,...`). El body de Nest está
   * limitado a 4 MB, así que el tope está para que el error diga algo útil en
   * vez de "property data_url should not be longer than N characters".
   */
  @IsString()
  @MinLength(1)
  @MaxLength(5000000)
  data_url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  alt?: string;
}

/**
 * Reordenar y borrar imágenes son operaciones separadas a propósito: borrar es
 * irreversible en Shopify, y el frontend pide confirmación solo para eso.
 */
export class ReordenarImagenesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ids!: string[];
}

export class EliminarImagenDto {
  @IsString()
  @MinLength(1)
  id!: string;
}
