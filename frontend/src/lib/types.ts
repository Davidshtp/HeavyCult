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

// ----- Maquetación: modelos que coincidirán con el backend futuro -----

export type PlataformaIntegracion =
  | "META_ADS"
  | "TIKTOK"
  | "WHATSAPP"
  | "DROPI"
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
}

export type EstadoProducto = "ACTIVO" | "INACTIVO";

export interface Producto {
  id_producto: number;
  sku_dropi: string | null;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  costo: number;
  stock: number;
  tallas: string[];
  url_imagen: string | null;
  estado: EstadoProducto;
  fecha_creacion: string;
}

export interface DropiProducto {
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  costo: number;
  stock: number;
  tallas: string[];
  url_imagen: string | null;
}