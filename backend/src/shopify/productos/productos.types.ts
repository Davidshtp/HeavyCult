/**
 * Tipos del dominio de productos Shopify. Se separan del servicio para que el
 * resto del módulo (controller, catálogo, imágenes) los comparta sin importar
 * la implementación concreta.
 */

/**
 * Estados reales de Shopify. No se colapsan a un "activo/inactivo": un producto
 * archivado, en borrador o no listado son situaciones distintas y el usuario
 * necesita ver cuál es cuál.
 */
export type EstadoProductoShopify =
  'ACTIVE' | 'ARCHIVED' | 'DRAFT' | 'UNLISTED';

export interface OpcionProducto {
  nombre: string;
  valores: string[];
}

export interface VarianteProducto {
  id_variante: string;
  sku: string | null;
  titulo: string;
  opciones: { nombre: string; valor: string }[];
  precio: number;
  costo: number | null;
  stock: number;
}

export interface ImagenProducto {
  id: string;
  url: string;
  alt: string | null;
  ancho: number | null;
  alto: number | null;
  estado: EstadoImagenShopify | null;
}

/**
 * Estado que Shopify da a cada medio. `PROCESSING` y `FAILED` son los que
 * importan: una imagen recién subida pasa por `PROCESSING` y el panel necesita
 * poder decirlo en vez de fingir que ya está lista.
 */
export type EstadoImagenShopify =
  'READY' | 'PROCESSING' | 'UPLOADING' | 'UPLOADED' | 'FAILED' | 'SUBMITTED';

/** Un medio del producto, lo mínimo para reordenar y para esperar un alta. */
export interface MedioProducto {
  id: string;
  es_imagen: boolean;
  estado: EstadoImagenShopify | null;
}

/**
 * Campos que Dropify puede volver a escribir desde su ficha (flags `sob_*` del
 * metafield `dropi._dropi_product`). El panel los usa para avisar al usuario de
 * que su edición se perderá en la próxima sincronización.
 */
export type CampoProductoDropi =
  'titulo' | 'descripcion_html' | 'precio' | 'imagenes';

export interface ProductoShopify {
  id_producto: string;
  titulo: string;
  handle: string;
  estado: EstadoProductoShopify;
  proveedor: string | null;
  tipo: string | null;
  tags: string[];
  descripcion_html: string;
  garantia: string | null;
  url_imagen: string | null;
  imagenes: ImagenProducto[];
  precio_min: number;
  precio_max: number;
  costo_min: number | null;
  stock: number;
  opciones: OpcionProducto[];
  variantes: VarianteProducto[];
  creado: string;
  /** Origen Dropify: el producto trae el metafield `dropi._dropi_product`. */
  es_dropi: boolean;
  /** Id del producto en el catálogo de Dropi (`_dropi_product.id`). */
  id_dropi: string | null;
  /** SKU que Dropi le asigna al producto (`_dropi_product.sku`). */
  sku_dropi: string | null;
  /** Categoría de Dropi (`_dropi_product.categories[0].name`). */
  categoria: string | null;
  /** Precio de venta sugerido por Dropi (`_dropi_product.suggested_price`). */
  precio_sugerido: number | null;
  /** Campos que Dropify sobrescribirá al sincronizar (flags `sob_*`). */
  dropi_sobrescribe: CampoProductoDropi[];
}

export interface ProductosRespuesta {
  productos: ProductoShopify[];
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
  total_variantes: number;
}

export interface ResultadoProducto<T> {
  ok: boolean;
  mensaje: string;
  producto: T | null;
}

/** Resultado de una escritura: no devuelve el producto para no pagar el viaje. */
export interface ResultadoEscritura {
  ok: boolean;
  mensaje: string;
}
