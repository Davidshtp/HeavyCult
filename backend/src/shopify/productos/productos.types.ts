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
