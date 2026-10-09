import { usarCiudad } from "@/lib/tags-producto";
import type { Producto } from "@/lib/types";

export interface BorradorGarantia {
  titulo: string;
  detalle: string;
}

/**
 * Lo que el admin puede cambiar desde el detalle. El resto (handle, estado,
 * proveedor, ciudad, costo, SKU y stock) se administra en Shopify: el backend
 * ni siquiera acepta esos campos, así que ni se muestran como inputs.
 */
export interface BorradorProducto {
  titulo: string;
  descripcion_html: string;
  tipo: string;
  tags: string[];
  /** Precio por `id_variante`. */
  precios: Record<string, number>;
}

export function crearBorrador(producto: Producto): BorradorProducto {
  return {
    titulo: producto.titulo,
    descripcion_html: producto.descripcion_html,
    tipo: producto.tipo ?? "",
    tags: [...producto.tags],
    precios: Object.fromEntries(
      producto.variantes.map((v) => [v.id_variante, v.precio]),
    ),
  };
}

/**
 * Compara contra el producto original y devuelve solo lo que cambió. Shopify
 * cobra por cada mutación y las respuestas llegan enteras, así que mandar campos
 * sin cambios solo cuesta latencia.
 */
/** Campos del producto que el detalle puede cambiar. */
export type CambiosProducto = Partial<Omit<BorradorProducto, "precios">>;

export function diferenciasProducto(
  original: Producto,
  borrador: BorradorProducto,
): CambiosProducto | null {
  const producto: CambiosProducto = {};

  const titulo = borrador.titulo.trim();
  if (titulo && titulo !== original.titulo) producto.titulo = titulo;

  if (
    borrador.descripcion_html.trim() !== (original.descripcion_html ?? "").trim()
  ) {
    producto.descripcion_html = borrador.descripcion_html.trim();
  }

  // Shopify usa `null` para quitar el productType; "" no es válido.
  const tipo = borrador.tipo.trim();
  const tipoActual = original.tipo ?? "";
  if (tipo !== tipoActual) producto.tipo = tipo;

  const tags = normalizarTags(borrador.tags);
  if (!mismosTags(tags, original.tags)) producto.tags = tags;

  return Object.keys(producto).length > 0 ? producto : null;
}

/** Variantes cuyo precio cambió, para no reenviar todas. */
export function variantesConPrecioCambiado(
  original: Producto,
  borrador: BorradorProducto,
): { id_variante: string; precio: number }[] {
  const cambios: { id_variante: string; precio: number }[] = [];
  for (const variante of original.variantes) {
    const precio = borrador.precios[variante.id_variante];
    // Un input vacío deja `NaN`: se interpreta como "sin cambios".
    if (typeof precio !== "number" || !Number.isFinite(precio)) continue;
    const redondeado = Math.round(precio);
    if (redondeado !== variante.precio && redondeado > 0) {
      cambios.push({ id_variante: variante.id_variante, precio: redondeado });
    }
  }
  return cambios;
}

/** Shopify no admite tags repetidos ni vacíos; compara sin distinguir mayúsculas. */
export function normalizarTags(tags: string[]): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const tag of tags) {
    const valor = tag.trim();
    if (!valor) continue;
    const clave = valor.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(valor);
  }
  return salida;
}

function mismosTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const ordenB = new Set(b.map((t) => t.toLowerCase()));
  return a.every((tag) => ordenB.has(tag.toLowerCase()));
}

/**
 * La garantía se compara ya serializada, porque es un texto con formato: dos
 * textos distintos pueden describir lo mismo solo por saltos de línea.
 */
export function diferenciasGarantia(
  original: Producto,
  garantias: BorradorGarantia[],
): string | null {
  const serializado = serializarBloques(garantias);
  const actual = (original.garantia ?? "").trim();
  return serializado.trim() === actual ? null : serializado;
}

/** Mismo formato que el backend y que `parsearGarantias`: bloques y línea en blanco. */
function serializarBloques(bloques: BorradorGarantia[]): string {
  return bloques
    .map((bloque) =>
      [bloque.titulo.trim(), bloque.detalle.trim()].filter(Boolean).join("\n"),
    )
    .filter(Boolean)
    .join("\n\n");
}

/** Las ciudades nunca se editan, así que el payload las conserva intactas. */
export function tagsConCiudadIntacta(
  original: Producto,
  editables: string[],
): string[] {
  const { ciudad } = usarCiudad(original.tags);
  return normalizarTags([...ciudad, ...editables]);
}
