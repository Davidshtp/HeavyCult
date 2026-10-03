// Backend ya conectado:
//   - PATCH  /auth/perfil            → actualizarMiPerfil
//   - PUT    /auth/perfil/imagen     → subirImagenPerfil (Foto en Cloudinary)
//   - DELETE /auth/perfil/imagen     → eliminarImagenPerfil
//   - PATCH  /auth/perfil/contrasena → cambiarMiContrasena
//   - PATCH  /users/:id/rol          → cambiarRolUsuario (solo admin)
//   - GET    /integraciones          → listarIntegraciones (solo admin)
//   - POST   /integraciones          → crearIntegracion (solo admin)
//   - PATCH  /integraciones/:id      → actualizarIntegracion (solo admin)
//   - DELETE /integraciones/:id      → eliminarIntegracion (solo admin)
//   - POST   /integraciones/:id/probar → probarConexionIntegracion (solo admin)
//   - POST   /auth/shopify/conectar   → conectarShopify (solo admin)
//   - POST   /auth/meta/conectar      → conectarMetaAds (solo admin)
// Pendiente de conectar (backends aún no implementados):
//   - CRUD   /productos                 → catálogo de productos
import { apiRequest } from "@/lib/api";
import {
  generarProductoDropiSintetico,
  MOCK_DROPI_REGISTRO,
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
export interface UsuarioNuevo {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  telefono?: string;
  rol: RolUsuario;
}

export async function crearUsuario(campos: UsuarioNuevo): Promise<Usuario> {
  const { usuario } = await apiRequest<{ usuario: Usuario }>("/users", {
    method: "POST",
    body: JSON.stringify(campos),
  });
  return usuario;
}

export async function cambiarRolUsuario(
  id: number,
  rol: RolUsuario,
): Promise<Usuario> {
  const { usuario } = await apiRequest<{ usuario: Usuario }>(
    `/users/${id}/rol`,
    {
      method: "PATCH",
      body: JSON.stringify({ rol }),
    },
  );
  return usuario;
}

export async function eliminarUsuario(id: number): Promise<void> {
  await apiRequest<{ message: string }>(`/users/${id}`, {
    method: "DELETE",
  });
}

// ------------------------------------------------------------- Integraciones
export interface IntegracionInput {
  plataforma: PlataformaIntegracion;
  etiqueta: string;
  api_key: string;
  config?: Record<string, string> | null;
  activo?: boolean;
}

export async function listarIntegraciones(): Promise<Integracion[]> {
  return apiRequest<Integracion[]>("/integraciones");
}

export async function crearIntegracion(input: IntegracionInput): Promise<Integracion> {
  const { integracion } = await apiRequest<{ integracion: Integracion }>(
    "/integraciones",
    {
      method: "POST",
      body: JSON.stringify({
        plataforma: input.plataforma,
        etiqueta: input.etiqueta,
        api_key: input.api_key,
        config: input.config ?? null,
      }),
    },
  );
  return integracion;
}

export async function actualizarIntegracion(
  id: number,
  cambios: { etiqueta?: string; api_key?: string; activo?: boolean },
): Promise<Integracion> {
  const cuerpo: Record<string, string | boolean> = {};
  if (cambios.etiqueta !== undefined) cuerpo.etiqueta = cambios.etiqueta;
  if (cambios.api_key !== undefined && cambios.api_key !== "") {
    cuerpo.api_key = cambios.api_key;
  }
  if (cambios.activo !== undefined) cuerpo.activo = cambios.activo;

  const { integracion } = await apiRequest<{ integracion: Integracion }>(
    `/integraciones/${id}`,
    { method: "PATCH", body: JSON.stringify(cuerpo) },
  );
  return integracion;
}

export async function eliminarIntegracion(id: number): Promise<void> {
  await apiRequest<{ message: string }>(`/integraciones/${id}`, {
    method: "DELETE",
  });
}

export interface ResultadoProbarIntegracion {
  ok: boolean;
  mensaje: string;
}

export async function probarConexionIntegracion(
  id: number,
): Promise<ResultadoProbarIntegracion> {
  return apiRequest<ResultadoProbarIntegracion>(`/integraciones/${id}/probar`, {
    method: "POST",
  });
}

export interface ConectarShopifyInput {
  shop: string;
  client_id: string;
  client_secret: string;
}

export interface ConectarShopifyResultado {
  ok: boolean;
  mensaje: string;
}

export async function conectarShopify(
  input: ConectarShopifyInput,
): Promise<ConectarShopifyResultado> {
  return apiRequest<ConectarShopifyResultado>("/auth/shopify/conectar", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface ConectarMetaAdsInput {
  app_id: string;
  app_secret: string;
  access_token: string;
  ad_account_id: string;
}

export interface ConectarMetaAdsResultado {
  ok: boolean;
  mensaje: string;
}

export async function conectarMetaAds(
  input: ConectarMetaAdsInput,
): Promise<ConectarMetaAdsResultado> {
  return apiRequest<ConectarMetaAdsResultado>("/auth/meta/conectar", {
    method: "POST",
    body: JSON.stringify(input),
  });
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