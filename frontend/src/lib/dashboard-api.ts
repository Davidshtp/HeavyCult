// Backend ya conectado:
//   - PATCH  /auth/perfil            → actualizarMiPerfil
//   - PUT    /auth/perfil/imagen     → subirImagenPerfil (Foto en Cloudinary)
//   - DELETE /auth/perfil/imagen     → eliminarImagenPerfil
//   - PATCH  /auth/perfil/contrasena → cambiarMiContrasena
// Pendiente de conectar (backends aún no implementados):
//   - GET    /integraciones/dropi/{sku} → buscarProductoDropi (fuente de verdad Dropi)
//   - CRUD   /integraciones             → integraciones (API keys)
//   - CRUD   /productos                 → catálogo Dropi
//   - PATCH  /users/:id                 → editar usuario (solo admin)
import { apiRequest } from "@/lib/api";
import {
  enmascararApiKey,
  generarProductoDropiSintetico,
  MOCK_DROPI_REGISTRO,
  MOCK_INTEGRACIONES,
  MOCK_PRODUCTOS,
} from "@/lib/dashboard-mock";
import type {
  DropiProducto,
  EstadoProducto,
  Integracion,
  PlataformaIntegracion,
  Producto,
  RolUsuario,
  Usuario,
} from "@/lib/types";

const clonar = <T,>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T;
const esperar = (ms = 400) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------------ Perfil
export interface MiPerfilEdicion {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string | null;
}

export async function actualizarMiPerfil(
  campos: MiPerfilEdicion,
): Promise<Usuario> {
  return apiRequest<Usuario>("/auth/perfil", {
    method: "PATCH",
    body: JSON.stringify(campos),
  });
}

export async function subirImagenPerfil(
  imagen: string,
): Promise<{ url_imagen: string }> {
  return apiRequest<{ url_imagen: string }>("/auth/perfil/imagen", {
    method: "PUT",
    body: JSON.stringify({ imagen }),
  });
}

export async function eliminarImagenPerfil(): Promise<{ url_imagen: null }> {
  return apiRequest<{ url_imagen: null }>("/auth/perfil/imagen", {
    method: "DELETE",
  });
}

export async function cambiarMiContrasena(campos: {
  contrasenaActual: string;
  nuevaContrasena: string;
}): Promise<void> {
  await apiRequest("/auth/perfil/contrasena", {
    method: "PATCH",
    body: JSON.stringify(campos),
  });
}

// ------------------------------------------------------------------ Usuarios
export interface UsuarioEdicion {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  rol: RolUsuario;
}

export async function actualizarUsuario(
  id: number,
  campos: UsuarioEdicion,
): Promise<Usuario> {
  await esperar();
  return {
    id_usuario: id,
    nombre: campos.nombre,
    apellido: campos.apellido,
    correo: campos.correo,
    telefono: campos.telefono ?? null,
    rol: campos.rol,
    estado: "ACTIVO",
    url_imagen: null,
    fecha_registro: new Date().toISOString(),
    ultimo_acceso: null,
    intentos_fallidos: 0,
    bloqueado_hasta: null,
  };
}

// ------------------------------------------------------------- Integraciones
let integraciones: Integracion[] = clonar(MOCK_INTEGRACIONES);
let siguienteIdIntegracion = 1000;

export interface IntegracionInput {
  plataforma: PlataformaIntegracion;
  etiqueta: string;
  api_key: string;
  config?: Record<string, string> | null;
  activo?: boolean;
}

export async function listarIntegraciones(): Promise<Integracion[]> {
  await esperar();
  return clonar(integraciones);
}

export async function crearIntegracion(input: IntegracionInput): Promise<Integracion> {
  await esperar();
  const nueva: Integracion = {
    id_integracion: siguienteIdIntegracion++,
    plataforma: input.plataforma,
    etiqueta: input.etiqueta,
    api_key_enmascarada: enmascararApiKey(input.api_key),
    config: input.config ?? null,
    activo: input.activo ?? true,
    fecha_creacion: new Date().toISOString(),
  };
  integraciones = [nueva, ...integraciones];
  return clonar(nueva);
}

export async function actualizarIntegracion(
  id: number,
  cambios: { etiqueta?: string; api_key?: string; activo?: boolean },
): Promise<Integracion> {
  await esperar();
  integraciones = integraciones.map((c) => {
    if (c.id_integracion !== id) return c;
    return {
      ...c,
      etiqueta:
        cambios.etiqueta !== undefined ? cambios.etiqueta : c.etiqueta,
      activo: cambios.activo !== undefined ? cambios.activo : c.activo,
      api_key_enmascarada:
        cambios.api_key !== undefined && cambios.api_key !== ""
          ? enmascararApiKey(cambios.api_key)
          : c.api_key_enmascarada,
    };
  });
  return clonar(integraciones.find((c) => c.id_integracion === id)!);
}

export async function eliminarIntegracion(id: number): Promise<void> {
  await esperar();
  integraciones = integraciones.filter((c) => c.id_integracion !== id);
}

export async function probarConexionIntegracion(id: number): Promise<boolean> {
  await esperar(700);
  const conexion = integraciones.find((c) => c.id_integracion === id);
  return conexion?.activo ?? false;
}

// ----------------------------------------------------------------- Productos
let productos: Producto[] = clonar(MOCK_PRODUCTOS);
let siguienteIdProducto = 1000;

export interface ProductoInput {
  sku_dropi?: string;
  nombre: string;
  descripcion?: string;
  precio_venta: number;
  costo: number;
  stock: number;
  tallas: string[];
  url_imagen?: string;
}

export async function listarProductos(): Promise<Producto[]> {
  await esperar();
  return clonar(productos);
}

export async function crearProducto(input: ProductoInput): Promise<Producto> {
  await esperar();
  const nuevo: Producto = {
    id_producto: siguienteIdProducto++,
    sku_dropi: input.sku_dropi?.trim() || null,
    nombre: input.nombre,
    descripcion: input.descripcion?.trim() || null,
    precio_venta: input.precio_venta,
    costo: input.costo,
    stock: input.stock,
    tallas: input.tallas,
    url_imagen: input.url_imagen?.trim() || null,
    estado: "ACTIVO",
    fecha_creacion: new Date().toISOString(),
  };
  productos = [nuevo, ...productos];
  return clonar(nuevo);
}

export async function actualizarProducto(
  id: number,
  input: ProductoInput,
): Promise<Producto> {
  await esperar();
  productos = productos.map((p) => {
    if (p.id_producto !== id) return p;
    return {
      ...p,
      sku_dropi: input.sku_dropi?.trim() || null,
      nombre: input.nombre,
      descripcion: input.descripcion?.trim() || null,
      precio_venta: input.precio_venta,
      costo: input.costo,
      stock: input.stock,
      tallas: input.tallas,
      url_imagen: input.url_imagen?.trim() || null,
    };
  });
  return clonar(productos.find((p) => p.id_producto === id)!);
}

export async function cambiarEstadoProducto(
  id: number,
  estado: EstadoProducto,
): Promise<void> {
  await esperar(200);
  productos = productos.map((p) => (p.id_producto === id ? { ...p, estado } : p));
}

// ------------------------------------------------------------- Búsqueda Dropi
// TODO(backend): llamar a Dropi con la API key del módulo de integraciones:
//   GET /integraciones/dropi/{sku}
export async function buscarProductoDropi(sku: string): Promise<DropiProducto> {
  await esperar(900);
  const limpio = sku.trim().toUpperCase();
  const enRegistro = MOCK_DROPI_REGISTRO.find(
    (p) => p.sku.toUpperCase() === limpio,
  );
  if (enRegistro) return clonar(enRegistro);
  if (/^DP-/.test(limpio)) {
    return { sku: limpio, ...generarProductoDropiSintetico(limpio) };
  }
  throw new Error(
    `El SKU "${sku}" no existe en Dropi. Verifica el identificador.`,
  );
}

export async function eliminarProducto(id: number): Promise<void> {
  await esperar(200);
  productos = productos.filter((p) => p.id_producto !== id);
}

export async function sincronizarDropi(): Promise<void> {
  await esperar(1200);
}