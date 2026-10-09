import DOMPurify from "dompurify";
import type { Config } from "dompurify";

/**
 * En esta tienda las descripciones vienen mezcladas: unas traen HTML real
 * (<h2>, <ul>, <strong>) y otras son texto plano de miles de caracteres. Si se
 * inyecta todo como HTML, el texto plano se convierte en un bloque sin saltos de
 * línea, ilegible.
 */
const TIENE_ETIQUETAS =
  /<\/?(p|div|h[1-6]|ul|ol|li|strong|em|b|i|span|table|tr|td|th|img|a|br|section|article)\b[^>]*>/i;

export type TipoDescripcion = "vacio" | "html" | "texto";

/**
 * El contenido viene de la tienda del propio usuario y solo un admin lo edita,
 * pero un `<script>` o un `onerror` se ejecutarían igual en el navegador de
 * quien abra el producto. DOMPurify normaliza el árbol y elimina nodos y
 * atributos ejecutables, así que no hace falta confiar en el regex de antes.
 */
const SANITIZAR: Config = {
  ALLOWED_TAGS: [
    "p",
    "div",
    "span",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "small",
    "sub",
    "sup",
    "blockquote",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
    "section",
    "article",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "width", "height", "target", "rel"],
  // Solo URLs seguras: bloquea `javascript:` y `data:` en enlaces e imágenes.
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

/**
 * Limpia HTML de Shopify antes de inyectarlo con `dangerouslySetInnerHTML`.
 * El `String()` es porque @types/dompurify devuelve `TrustedHTML`, que no
 * existe en runtime cuando el DOM no está disponible.
 */
export function sanearHtml(html: string): string {
  return String(DOMPurify.sanitize(html, SANITIZAR));
}

/** Una descripción cuyo valor ya es HTML listo para renderizar. */
export interface DescripcionSaneada {
  tipo: TipoDescripcion;
  valor: string;
}

/**
 * Decide si el contenido se renderiza como HTML o como texto plano, y en el
 * caso de HTML devuelve el resultado ya saneado. Se usa tanto para leer el
 * producto como para previsualizar lo que el admin está escribiendo.
 */
export function analizarDescripcion(html: string | null | undefined): DescripcionSaneada {
  const contenido = html?.trim() ?? "";
  if (!contenido) return { tipo: "vacio", valor: "" };
  if (TIENE_ETIQUETAS.test(contenido)) {
    return { tipo: "html", valor: sanearHtml(contenido) };
  }
  return { tipo: "texto", valor: contenido };
}
