export type RolUsuario = "ADMIN" | "EMPLEADO";
export type EstadoUsuario = "ACTIVO" | "INACTIVO" | "BLOQUEADO";

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string | null;
  rol: RolUsuario;
  estado: EstadoUsuario;
  url_imagen?: string | null;
  fecha_registro: string;
  ultimo_acceso?: string | null;
  intentos_fallidos: number;
  bloqueado_hasta?: string | null;
}

export interface LoginResponse {
  message: string;
  usuario: Usuario;
}

// Integraciones conectadas al backend; el catálogo de productos sigue en
// maquetación hasta implementar el backend correspondiente.

export type PlataformaIntegracion =
  | "META_ADS"
  | "TIKTOK"
  | "WHATSAPP"
  | "SHOPIFY"
  | "SERVIENTREGA"
  | "INTER_RAPIDISIMO"
  | "COORDINADORA"
  | "ENVIA";

export interface Integracion {
  id_integracion: number;
  plataforma: PlataformaIntegracion;
  etiqueta: string;
  api_key_enmascarada: string;
  config: Record<string, string> | null;
  activo: boolean;
  fecha_creacion: string;
  ultima_prueba_ok?: boolean | null;
  mensaje_ultima_prueba?: string | null;
  fecha_ultima_prueba?: string | null;
}

// ------------------------------------------------------------- Shopify
// El catálogo real viene de Shopify vía el backend. `id_producto` es el GID
// de Shopify (gid://shopify/Product/...) y `id_variante` el de la variante.
export type EstadoProductoShopify =
  | "ACTIVE"
  | "ARCHIVED"
  | "DRAFT"
  | "UNLISTED";

export interface OpcionVariante {
  nombre: string;
  valor: string;
}

export interface VarianteProducto {
  id_variante: string;
  titulo: string;
  sku: string | null;
  precio: number;
  stock: number;
  costo: number | null;
  opciones: OpcionVariante[];
}

export interface OpcionProducto {
  nombre: string;
  valores: string[];
}

/**
 * Estado del medio en Shopify. Una imagen recién subida pasa por `PROCESSING`:
 * el panel lo dice en vez de hacerse el que ya está lista.
 */
export type EstadoImagen =
  | "READY"
  | "PROCESSING"
  | "UPLOADING"
  | "UPLOADED"
  | "FAILED"
  | "SUBMITTED";

export interface ImagenProducto {
  id: string;
  url: string;
  alt: string | null;
  ancho: number | null;
  alto: number | null;
  estado: EstadoImagen | null;
}

export interface Producto {
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

export interface ProductosPagina {
  productos: Producto[];
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
  total_variantes: number;
  resumen: ResumenCatalogo;
}

export interface ResumenCatalogo {
  productos: number;
  variantes: number;
  variantes_sin_stock: number;
  unidades: number;
}

export interface ProductoInput {
  /** Todos los campos son opcionales: el guardado es parcial. */
  titulo?: string;
  descripcion_html?: string;
  tipo?: string;
  tags?: string[];
  // Sin `estado`: publicarlo, archivarlo o pasarlo a borrador se hace en Shopify.
  // Sin `proveedor`: en Shopify es el `vendor`, que también usa el marketplace.
}

export interface VarianteInput {
  id_variante: string;
  precio?: number;
  // Sin `costo`: vive en el cost del inventoryItem y solo se cambia en Shopify.
  // Sin `sku`: Shopify lo usa para sincronizar inventario y feeds.
  // Sin `stock`: el inventario se ajusta en Shopify.
}