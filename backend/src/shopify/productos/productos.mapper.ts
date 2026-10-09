import type {
  EstadoImagenShopify,
  EstadoProductoShopify,
  ImagenProducto,
  OpcionProducto,
  ProductoShopify,
  VarianteProducto,
} from './productos.types';
import { VARIANTES_POR_PAGINA } from './productos.graphql';

/**
 * Mapeadores del catálogo: transforman los nodos crudos de Shopify en los
 * tipos del panel. Son funciones puras (salvo el aviso de variantes truncadas,
 * que llega por callback) para poder probarlas sin tocar la API ni el servicio.
 */

/** Shopify llama "Title" a la opción por defecto de los productos de una sola variante. */
const OPCION_POR_DEFECTO = 'Title';

export interface MapearOpciones {
  /** Aviso de producto con más variantes que las leídas. */
  avisar?: (mensaje: string) => void;
}

export function mapearProducto(
  nodo: unknown,
  opciones: MapearOpciones = {},
): ProductoShopify | null {
  if (!nodo || typeof nodo !== 'object') return null;
  const n = nodo as Record<string, unknown>;

  const variantesCrudo = leerLista(n['variants'], 'nodes');
  const variantes: VarianteProducto[] = [];
  for (const bruto of variantesCrudo) {
    const variante = mapearVariante(bruto);
    if (variante) variantes.push(variante);
  }

  const infoVariantes = leerObjeto(n['variants'])?.['pageInfo'];
  if (infoVariantes && leerObjeto(infoVariantes)?.['hasNextPage'] === true) {
    opciones.avisar?.(
      `El producto "${texto(n['title'])}" tiene más de ${VARIANTES_POR_PAGINA} variantes; solo se leyeron las primeras.`,
    );
  }

  const metafields = leerMetafields(n);
  const precios = variantes
    .map((v) => v.precio)
    .filter((p) => Number.isFinite(p));
  const costos = variantes
    .map((v) => v.costo)
    .filter((c): c is number => typeof c === 'number');

  const status = texto(n['status']) || 'ACTIVE';
  const proveedor = texto(n['vendor']);
  const tipo = texto(n['productType']);
  const imagenes = leerImagenes(n['media']);
  const portada = leerImagen(n['featuredMedia']);

  return {
    id_producto: texto(n['id']),
    titulo: texto(n['title']),
    handle: texto(n['handle']),
    estado: estadoNormalizado(status),
    proveedor: proveedor || null,
    tipo: tipo || null,
    tags: leerListaDeStrings(n['tags']),
    descripcion_html: texto(n['descriptionHtml']),
    garantia: metafields['informacion_de_garantia'] ?? null,
    // La portada cae a la primera foto del array si no hay media destacado.
    url_imagen: portada ?? imagenes[0]?.url ?? null,
    imagenes,
    precio_min: precios.length > 0 ? Math.min(...precios) : 0,
    precio_max: precios.length > 0 ? Math.max(...precios) : 0,
    costo_min:
      costos.length > 0
        ? Math.min(...costos)
        : leerNumero(metafields['costo_de_producto']),
    stock: variantes.reduce((suma, v) => suma + v.stock, 0),
    opciones: construirOpciones(variantes),
    variantes,
    creado: texto(n['createdAt']),
  };
}

export function mapearVariante(bruto: unknown): VarianteProducto | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const v = bruto as Record<string, unknown>;
  const id = texto(v['id']);
  if (!id) return null;

  const unitCost = leerObjeto(leerObjeto(v['inventoryItem'])?.['unitCost']);
  const sku = texto(v['sku']);

  return {
    id_variante: id,
    sku: sku || null,
    titulo: texto(v['title']),
    opciones: leerOpciones(v['selectedOptions']),
    precio: leerNumero(v['price']) ?? 0,
    costo: leerNumero(unitCost?.['amount']),
    stock: Math.max(0, Math.trunc(leerNumero(v['inventoryQuantity']) ?? 0)),
  };
}

export function leerMetafields(
  n: Record<string, unknown>,
): Record<string, string> {
  const resultado: Record<string, string> = {};
  const edges = leerLista(n['metafields'], 'edges');
  for (const edge of edges) {
    const nodo = leerObjeto(leerObjeto(edge)?.['node']);
    const key = nodo?.['key'];
    const value = nodo?.['value'];
    if (typeof key === 'string' && typeof value === 'string') {
      resultado[key] = value;
    }
  }
  return resultado;
}

export function leerImagen(media: unknown): string | null {
  const preview = leerObjeto(leerObjeto(media)?.['preview']);
  const url = leerObjeto(preview?.['image'])?.['url'];
  return typeof url === 'string' && url ? url : null;
}

export function leerImagenes(bruto: unknown): ImagenProducto[] {
  const nodos = leerLista(bruto, 'nodes');
  const imagenes: ImagenProducto[] = [];
  for (const nodo of nodos) {
    const n = leerObjeto(nodo);
    if (!n) continue;
    // `media` mezcla fotos con videos y 3D; la galería es solo de fotos.
    if (texto(n['mediaContentType']) !== 'IMAGE') continue;
    const imagen = leerObjeto(n['image']);
    const url = imagen?.['url'];
    // Sin URL todavía significa que Shopify la está procesando: no hay nada
    // que mostrar, y el panel se entera por el estado del media.
    if (typeof url !== 'string' || !url) continue;
    const alt = n['alt'];
    imagenes.push({
      id: texto(n['id']),
      url,
      // En esta tienda ningún producto tiene alt; el título es la mejor
      // descripción disponible para lectores de pantalla.
      alt: typeof alt === 'string' && alt ? alt : null,
      ancho: leerNumero(imagen?.['width']),
      alto: leerNumero(imagen?.['height']),
      estado: estadoImagenNormalizado(texto(n['status'])),
    });
  }
  return imagenes;
}

function construirOpciones(variantes: VarianteProducto[]): OpcionProducto[] {
  const mapa = new Map<string, string[]>();
  for (const variante of variantes) {
    for (const opcion of variante.opciones) {
      if (opcion.nombre === OPCION_POR_DEFECTO) continue;
      const valores = mapa.get(opcion.nombre) ?? [];
      if (!valores.includes(opcion.valor)) valores.push(opcion.valor);
      mapa.set(opcion.nombre, valores);
    }
  }
  return [...mapa.entries()].map(([nombre, valores]) => ({ nombre, valores }));
}

function leerOpciones(bruto: unknown): { nombre: string; valor: string }[] {
  if (!Array.isArray(bruto)) return [];
  const opciones: { nombre: string; valor: string }[] = [];
  for (const item of bruto) {
    const registro = leerObjeto(item);
    const nombre = registro?.['name'];
    const valor = registro?.['value'];
    if (typeof nombre !== 'string') continue;
    if (nombre === OPCION_POR_DEFECTO) continue;
    opciones.push({ nombre, valor: typeof valor === 'string' ? valor : '' });
  }
  return opciones;
}

export function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return '';
}

/**
 * Shopify podría devolver un estado que esta versión no conoce. Se cae a ACTIVE
 * antes que inventar un estado o romper el tipado del panel.
 */
export function estadoNormalizado(status: string): EstadoProductoShopify {
  switch (status) {
    case 'ACTIVE':
    case 'ARCHIVED':
    case 'DRAFT':
    case 'UNLISTED':
      return status;
    default:
      return 'ACTIVE';
  }
}

/**
 * Igual que el estado del producto: si Shopify inventa un estado nuevo, se
 * ignora en vez de romper el tipado. `null` es "no hay nada que avisar".
 */
export function estadoImagenNormalizado(
  status: string,
): EstadoImagenShopify | null {
  switch (status) {
    case 'READY':
    case 'PROCESSING':
    case 'UPLOADING':
    case 'UPLOADED':
    case 'FAILED':
    case 'SUBMITTED':
      return status;
    default:
      return null;
  }
}

export function leerObjeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

export function leerLista(valor: unknown, clave: string): unknown[] {
  const lista = leerObjeto(valor)?.[clave];
  return Array.isArray(lista) ? lista : [];
}

export function leerListaDeStrings(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((v): v is string => typeof v === 'string');
}

export function leerNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}
