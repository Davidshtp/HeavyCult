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
import { apiRequest } from "@/lib/api";
import type {
  CrearPedidoInput,
  Departamento,
  DireccionOrden,
  EstadoProductoShopify,
  Integracion,
  Municipio,
  OrdenProductos,
  PaginaPedidos,
  PedidoDetalle,
  PlataformaIntegracion,
  Producto,
  ProductosPagina,
  ProductoInput,
  ResultadoCrearPedido,
  RolUsuario,
  Usuario,
  VarianteInput,
} from "@/lib/types";

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
// Backend conectado (solo admin):
//   - GET    /shopify/productos?buscar=&pagina=&por_pagina=
//   - POST   /shopify/productos/sincronizar
//   - GET    /shopify/productos/:id
//   - PATCH  /shopify/productos/:id
//   - PATCH  /shopify/productos/:id/variantes
//   - DELETE /shopify/productos/:id
export interface ListarProductosParams {
  buscar?: string;
  pagina?: number;
  porPagina?: number;
  estado?: EstadoProductoShopify;
  sinStock?: boolean;
  proveedor?: string;
  orden?: OrdenProductos;
  direccion?: DireccionOrden;
}

export async function listarProductos(
  params: ListarProductosParams = {},
): Promise<ProductosPagina> {
  const query = new URLSearchParams();
  if (params.buscar?.trim()) query.set("buscar", params.buscar.trim());
  if (params.pagina) query.set("pagina", String(params.pagina));
  if (params.porPagina) query.set("por_pagina", String(params.porPagina));
  if (params.estado) query.set("estado", params.estado);
  if (params.sinStock) query.set("sin_stock", "true");
  if (params.proveedor?.trim()) query.set("proveedor", params.proveedor.trim());
  if (params.orden) query.set("orden", params.orden);
  if (params.direccion) query.set("direccion", params.direccion);
  const sufijo = query.size > 0 ? `?${query.toString()}` : "";
  return apiRequest<ProductosPagina>(`/shopify/productos${sufijo}`);
}

export interface SincronizarResultado {
  ok: boolean;
  mensaje: string;
  productos: number;
}

export async function sincronizarDropi(): Promise<SincronizarResultado> {
  return apiRequest<SincronizarResultado>("/shopify/productos/sincronizar", {
    method: "POST",
  });
}

/** El backend envuelve las lecturas en `{ ok, producto }`. */
interface Envelope<T> {
  ok: boolean;
  producto: T;
}

/** Las escrituras responden `{ ok, mensaje }`: el panel recarga con un GET. */
interface Escritura {
  ok: boolean;
  mensaje: string;
}

export async function obtenerProducto(id: string): Promise<Producto> {
  const respuesta = await apiRequest<Envelope<Producto>>(
    `/shopify/productos/${encodeURIComponent(id)}`,
  );
  return respuesta.producto;
}

export async function actualizarProducto(
  id: string,
  input: ProductoInput,
): Promise<void> {
  await apiRequest<Escritura>(`/shopify/productos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function actualizarVariantes(
  id: string,
  variantes: VarianteInput[],
): Promise<void> {
  await apiRequest<Escritura>(
    `/shopify/productos/${encodeURIComponent(id)}/variantes`,
    { method: "PATCH", body: JSON.stringify({ variantes }) },
  );
}

export async function eliminarProducto(id: string): Promise<void> {
  await apiRequest<void>(`/shopify/productos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** La garantía es un metafield `multi_line_text_field`, no un campo del producto. */
export async function actualizarGarantia(
  id: string,
  garantia: string,
): Promise<void> {
  await apiRequest<Escritura>(
    `/shopify/productos/${encodeURIComponent(id)}/garantia`,
    { method: "PATCH", body: JSON.stringify({ garantia }) },
  );
}

/**
 * La imagen se manda como data URL ya comprimida: el backend la sube a Cloudinary
 * y le pasa la URL a Shopify. El límite de 4 MB del JSON es del backend, así que
 * comprimir en el navegador no es opcional.
 */
export async function agregarImagenProducto(
  id: string,
  dataUrl: string,
  alt?: string | null,
): Promise<void> {
  await apiRequest<Escritura>(
    `/shopify/productos/${encodeURIComponent(id)}/imagenes`,
    {
      method: "POST",
      body: JSON.stringify({
        data_url: dataUrl,
        alt: alt?.trim() || null,
      }),
    },
  );
}

/** Manda el orden completo; la primera imagen queda como portada. */
export async function reordenarImagenesProducto(
  id: string,
  ids: string[],
): Promise<void> {
  await apiRequest<Escritura>(
    `/shopify/productos/${encodeURIComponent(id)}/imagenes/orden`,
    { method: "PATCH", body: JSON.stringify({ ids }) },
  );
}

/** Irreversible en Shopify: pedir confirmación antes de llamar. */
export async function eliminarImagenProducto(
  id: string,
  idImagen: string,
): Promise<void> {
  await apiRequest<Escritura>(
    `/shopify/productos/${encodeURIComponent(id)}/imagenes/${encodeURIComponent(idImagen)}`,
    { method: "DELETE" },
  );
}

// ------------------------------------------------------------------ Envíos
// Backend conectado (solo admin):
//   - GET /envios/departamentos
//   - GET /envios/municipios?departamento_id=XX
export async function listarDepartamentos(): Promise<Departamento[]> {
  const { departamentos } = await apiRequest<{ departamentos: Departamento[] }>(
    "/envios/departamentos",
  );
  return departamentos;
}

export async function listarMunicipios(
  departamentoId: string,
): Promise<Municipio[]> {
  const { municipios } = await apiRequest<{ municipios: Municipio[] }>(
    `/envios/municipios?departamento_id=${encodeURIComponent(departamentoId)}`,
  );
  return municipios;
}

// ------------------------------------------------------------------ Pedidos
// Backend conectado (solo admin):
//   - GET    /shopify/pedidos?cursor=...
//   - GET    /shopify/pedidos/:id
//   - POST   /shopify/pedidos
export async function listarPedidos(
  cursor?: string,
): Promise<PaginaPedidos> {
  const sufijo = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const { pagina } = await apiRequest<{ pagina: PaginaPedidos }>(
    `/shopify/pedidos${sufijo}`,
  );
  return pagina;
}

export async function obtenerPedido(id: string): Promise<PedidoDetalle> {
  const { pedido } = await apiRequest<{ pedido: PedidoDetalle }>(
    `/shopify/pedidos/${encodeURIComponent(id)}`,
  );
  return pedido;
}

export async function crearPedido(
  input: CrearPedidoInput,
): Promise<ResultadoCrearPedido> {
  return apiRequest<ResultadoCrearPedido>("/shopify/pedidos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}