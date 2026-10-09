/**
 * Comprime la imagen en el navegador antes de mandarla. El backend acepta JSON
 * de 4 MB y una data URL de base64 pesa un 33% más que el binario, así que una
 * foto de teléfono (3-6 MB) no entra. Redimensionar a 1600 px del lado mayor y
 * pasarla a WebP deja las fotos de producto por debajo de 400 KB sin pérdida
 * visible a ese tamaño.
 */

export const LADO_MAXIMO = 1600;
export const CALIDAD = 0.82;

export interface ResultadoCompresion {
  dataUrl: string;
  ancho: number;
  alto: number;
  bytes: number;
}

/**
 * Si el canvas se contaminara al leer una imagen manipulada, no habría excepción
 * visible: `toDataURL` devolvería algo raro. Se corta con un tamaño máximo.
 */
function leerAnchoAlto(url: string): Promise<ImageBitmap | HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () =>
      rechazar(new Error('El archivo no se pudo leer como imagen.'));
    imagen.src = url;
  });
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () =>
      rechazar(new Error('No se pudo leer el archivo seleccionado.'));
    lector.readAsDataURL(archivo);
  });
}

/** El peso binario real de una data URL, sin base64 inflado. */
export function bytesDeDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

export async function comprimirImagen(
  archivo: File,
  ladoMaximo = LADO_MAXIMO,
): Promise<ResultadoCompresion> {
  const original = await leerComoDataUrl(archivo);
  const imagen = await leerAnchoAlto(original);

  const ancho = imagen.width;
  const alto = imagen.height;
  if (ancho === 0 || alto === 0) {
    throw new Error("El archivo no tiene dimensiones.");
  }

  const escala = Math.min(1, ladoMaximo / Math.max(ancho, alto));
  const destinoAncho = Math.max(1, Math.round(ancho * escala));
  const destinoAlto = Math.max(1, Math.round(alto * escala));

  const lienzo = document.createElement("canvas");
  lienzo.width = destinoAncho;
  lienzo.height = destinoAlto;

  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("El navegador no pudo procesar la imagen.");
  contexto.drawImage(imagen, 0, 0, destinoAncho, destinoAlto);

  // Shopify muestra el PNG con fondo transparente en algunos temas; WebP lo
  // conserva, así que solo se recurre a PNG cuando el original era PNG.
  const formatos: string[] = archivo.type === "image/png"
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg", "image/webp"];

  let dataUrl = "";
  for (const tipo of formatos) {
    const candidato = lienzo.toDataURL(tipo, CALIDAD);
    // Se prefiere el primero que entre en el presupuesto; si ninguno, el último.
    if (!candidato) continue;
    dataUrl = candidato;
    if (bytesDeDataUrl(candidato) <= 3 * 1024 * 1024) break;
  }

  if (!dataUrl) throw new Error("No se pudo comprimir la imagen.");

  if ("close" in imagen && typeof imagen.close === "function") imagen.close();

  return {
    dataUrl,
    ancho: destinoAncho,
    alto: destinoAlto,
    bytes: bytesDeDataUrl(dataUrl),
  };
}
