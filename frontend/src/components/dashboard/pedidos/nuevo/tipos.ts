import type { Producto, VarianteProducto } from "@/lib/types";

/** Identificador de cada paso del asistente. */
export type PasoId = "producto" | "cliente" | "envio" | "confirmar";

export interface PasoWizard {
  id: PasoId;
  /** Etiqueta corta que se ve en el indicador de progreso. */
  titulo: string;
  /** Descripción de una línea para el encabezado del paso. */
  descripcion: string;
}

export const PASOS: readonly PasoWizard[] = [
  { id: "producto", titulo: "Producto", descripcion: "Elegí qué se envía" },
  { id: "cliente", titulo: "Cliente", descripcion: "Datos de contacto" },
  { id: "envio", titulo: "Envío", descripcion: "Dirección de entrega" },
  { id: "confirmar", titulo: "Confirmar", descripcion: "Revisá y creá el pedido" },
] as const;

/** Tope de unidades por pedido (una sola línea de producto). */
export const MAX_POR_ITEM = 99;

/** Variantes de un producto ordenadas por stock disponible (mayor primero). */
export function variantesConStock(producto: Producto): VarianteProducto[] {
  return [...producto.variantes].sort((a, b) => b.stock - a.stock);
}

/**
 * Etiqueta legible de una variante: sus opciones o, si es el producto por
 * defecto de Shopify, "Única".
 */
export function etiquetaVariante(variante: VarianteProducto): string {
  const porOpciones = variante.opciones
    .filter((o) => o.valor && o.valor !== "Default Title")
    .map((o) => o.valor)
    .join(" · ");
  if (porOpciones) return porOpciones;
  if (variante.titulo && variante.titulo !== "Default Title") {
    return variante.titulo;
  }
  return "Única";
}
