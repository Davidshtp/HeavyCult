/** Espera máxima de cada llamada directa a la API REST de Shopify. */
export const TIEMPO_ESPERA_MS = 10000;

/**
 * Helpers compartidos por las llamadas REST de Shopify (tienda y pedidos): el
 * cuerpo de error llega con formas distintas según el endpoint y conviene
 * leerlo igual en todos lados.
 */
export function extraerDetalleError(cuerpo: unknown): string | null {
  const campo = extraerCampo(cuerpo, 'message');
  return (
    campo ?? extraerCampo(cuerpo, 'error') ?? extraerCampo(cuerpo, 'mensaje')
  );
}

export function extraerCampo(objeto: unknown, clave: string): string | null {
  if (!objeto || typeof objeto !== 'object') return null;
  const valor = (objeto as Record<string, unknown>)[clave];
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  return stringificarValor(valor);
}

export function stringificarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'symbol') return valor.toString();
  if (typeof valor === 'object' || typeof valor === 'function') {
    try {
      return JSON.stringify(valor);
    } catch {
      return '[valor complejo]';
    }
  }
  return `${valor as number | boolean | bigint}`;
}
