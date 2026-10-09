/** Tags que nunca son una ciudad, aunque vengan en mayúsculas. */
const TAGS_IGNORADOS = new Set(["DROPI"]);

/**
 * La ciudad del proveedor no tiene campo propio en Shopify: viene como tag
 * suelto en mayúsculas (BELLO, BOGOTA, ENVIGADO) mientras las categorías van
 * capitalizadas (Salud, Moda, Otro). Se deduce por forma, así que conviene
 * tenerla en un solo lugar y no duplicar la regla.
 */
export function esCiudad(tag: string): boolean {
  const limpio = tag.trim();
  if (limpio.length < 2 || limpio.length > 30) return false;
  if (TAGS_IGNORADOS.has(limpio.toUpperCase())) return false;
  if (/[a-záéíóúñ]/.test(limpio)) return false;
  if (/^[\d\s.,-]+$/.test(limpio)) return false;
  return true;
}

/** Parte los tags en ciudades y el resto, sin perder ninguno. */
export function usarCiudad(tags: string[]): {
  ciudad: string[];
  otros: string[];
} {
  const ciudad: string[] = [];
  const otros: string[] = [];
  for (const tag of tags) {
    if (esCiudad(tag)) ciudad.push(tag);
    else otros.push(tag);
  }
  return { ciudad, otros };
}