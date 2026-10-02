/**
 * content_script.js
 *
 * Se inyecta automáticamente en https://app.dropi.co/*.
 * Escucha mensajes del popup y extrae la información del producto desde la
 * vista detallada de Dropi. No realiza ninguna petición de red: el envío a
 * Shopify lo hace el service worker (background.js) para evitar bloqueos de
 * CORS propios de los content scripts.
 */
(() => {
  "use strict";

  const MSG_PING = "PING";
  const MSG_EXTRACT = "EXTRACT_PRODUCT";

  const PRODUCT_DETAILS_PATH_RE = /\/dashboard\/product-details\/(\d+)\/([^/?]+)/;

  const SELECTORS = {
    dropiId: '[data-cy="product-info-copy-id"]',
    titulo: '[data-cy="product-info-name"]',
    skuOriginal: '[data-cy="product-info-sku"]',
    tipoProducto: '[data-cy="product-info-type"]',
    precioCosto: '[data-cy="product-info-price"]',
    precioVenta: '[data-cy="product-info-suggested-price"]',
    stock: '[data-cy="product-info-stock"]',
    categoria: '[data-cy^="product-info-category-"]',
    proveedor: '[data-cy="product-supplier-card-name-link"]',
    bodegas: '[data-cy="product-supplier-card-warehouses"]',
    descripcion: "#descriptionContainer",
    galeria: ".section-gallery p-galleriaitemslot img",
    garantiaRows: ".warranty-accordion .warranty-row",
    garantiaDetalles: ".warranty-details-text",
    variantesTabla: '[data-cy="product-info-variations-table"]',
    variantesFilas: '[data-cy^="product-info-variation-row-"]',
  };

  const MAX_IMAGENES = 20;

  /* --------------------------------------------------------------------- *
   * Normalización de datos
   * --------------------------------------------------------------------- */

  const trimText = (node) =>
    node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : null;

  const innerHtml = (node) => (node ? String(node.innerHTML || "").trim() : null);

  /** "ID:1373545" -> "1373545". Devuelve solo los dígitos o null. */
  const onlyDigits = (text) => {
    const value = String(text ?? "").replace(/\D/g, "");
    return value || null;
  };

  /** Primer entero de un texto: "5 disponibles" -> 5 ; null si no hay dígitos. */
  const toInteger = (text) => {
    const match = String(text ?? "").match(/-?\d+/);
    const value = match ? parseInt(match[0], 10) : NaN;
    return Number.isFinite(value) ? value : null;
  };

  /**
   * Convierte montos expresados con separadores latinoamericanos a número.
   * Ejemplos: "$ 45.000" -> 45000 · "45.000,00" -> 45000 · "1.234" -> 1234 ·
   * "12.50" -> 12.5 · "500" -> 500. Devuelve null si no es un número finito.
   */
  const toAmount = (text) => {
    if (text == null) return null;
    let raw = String(text).replace(/[^\d.,\-]/g, "");
    if (!raw) return null;

    const negative = raw.startsWith("-");
    raw = raw.replace(/-/g, "");

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    let value;
    if (hasComma && hasDot) {
      // "45.000,00" -> quita separadores de miles y usa coma como decimal.
      raw = raw.replace(/\./g, "").replace(",", ".");
      value = parseFloat(raw);
    } else if (hasComma) {
      const parts = raw.split(",");
      value =
        parts.length === 2 && parts[1].length <= 2
          ? parseFloat(raw.replace(",", ".")) // "12,50"
          : parseInt(raw.replace(/,/g, ""), 10); // "1,234"
    } else if (hasDot) {
      const parts = raw.split(".");
      value =
        parts.length > 2 || (parts.length === 2 && parts[1].length === 3)
          ? parseInt(raw.replace(/\./g, ""), 10) // "45.000" / "1.234.567"
          : parseFloat(raw); // "12.50"
    } else {
      value = parseInt(raw, 10);
    }

    if (!Number.isFinite(value)) return null;
    value = Math.round(value * 100) / 100;
    return negative ? -value : value;
  };

  const toAbsoluteUrl = (src) => {
    if (!src) return null;
    try {
      const url = new URL(src, window.location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : null;
    } catch (_err) {
      return null;
    }
  };

  const normalizeUrl = (url) => url.split("#")[0];

  const dedupeUrls = (urls) => {
    const seen = new Set();
    return urls.filter((url) => {
      const key = normalizeUrl(url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  /**
   * Representa la información de garantía del producto como texto plano.
   */
  const extractGarantia = () => {
    const tipos = Array.from(document.querySelectorAll(SELECTORS.garantiaRows))
      .map((row) => trimText(row.querySelector(".warranty-type-label")))
      .filter(Boolean);
    const detalles = Array.from(document.querySelectorAll(SELECTORS.garantiaDetalles))
      .map((item) => trimText(item))
      .filter(Boolean);
    if (tipos.length === 0 && detalles.length === 0) return null;

    const bloques = [];
    if (tipos.length > 0 && detalles.length >= tipos.length) {
      tipos.forEach((tipo, i) =>
        bloques.push(detalles[i] ? `${tipo}\n${detalles[i]}` : tipo)
      );
      for (let i = tipos.length; i < detalles.length; i += 1) bloques.push(detalles[i]);
    } else {
      if (tipos.length > 0) bloques.push(tipos.join("\n"));
      if (detalles.length > 0) bloques.push(detalles.join("\n"));
    }
    return bloques.join("\n\n");
  };

  /** Precio utilizable como número positivo. null/""/undefined se normalizan a 0. */
  const precioValido = (valor) => Number.isFinite(Number(valor)) && Number(valor) > 0;

  /**
   * Normaliza un texto a un slug comparable con el de la URL de Dropi:
   * "Bisutería" -> "bisuteria".
   */
  const aSlug = (texto) =>
    String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  /**
   * Elige la categoría más específica. Dropi pinta un chip por nivel del árbol
   * (raíz -> hoja), así que el primero era el más genérico: se busca el chip que
   * coincide con el slug de la URL y, si no está, se usa el último.
   */
  const elegirCategoria = (chips, slugUrl) => {
    const objetivo = aSlug(slugUrl);
    const coincidencia = objetivo ? chips.find((chip) => aSlug(chip) === objetivo) : null;
    if (coincidencia) return coincidencia;
    if (chips.length > 0) return chips[chips.length - 1];
    return objetivo ? objetivo.replace(/-/g, " ") : null;
  };

  /**
   * Lee los pares opción/valor de la celda "Descripción" de una fila de
   * variaciones. Dropi renderiza un <span> por dimensión
   * ("Color: <strong>Azul</strong>") y, con varias dimensiones, varios <span> o
   * varios <strong> seguidos ("Color: <strong>Azul</strong>, Talla: <strong>M
   * </strong>"). Cada <strong> cierra un par y su nombre es el texto que lo
   * antecede; sin <strong>, el texto plano se parte por "Nombre: Valor".
   */
  const parseOpcionesVariante = (celda) => {
    if (!celda) return [];

    const segmentos = [];
    let acumulado = "";

    const recorrer = (nodo) => {
      Array.from(nodo.childNodes).forEach((hijo) => {
        if (hijo.nodeType === Node.TEXT_NODE) {
          acumulado += hijo.textContent;
        } else if (hijo.nodeType === Node.ELEMENT_NODE) {
          if (hijo.tagName === "STRONG" || hijo.tagName === "B") {
            segmentos.push({ nombre: acumulado, valor: hijo.textContent });
            acumulado = "";
          } else {
            recorrer(hijo);
          }
        }
      });
    };
    recorrer(celda);

    if (acumulado.trim()) segmentos.push({ nombre: "", valor: acumulado });

    const pares = [];
    segmentos.forEach((segmento) => {
      // El nombre arrastra los separadores entre dimensiones ("Azul, Talla: ").
      const nombre = String(segmento.nombre || "")
        .replace(/[\s,;|/·•]+/g, " ")
        .replace(/\s*:\s*$/, "")
        .trim();
      let valor = String(segmento.valor || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!valor) return;

      if (!nombre && valor.includes(":")) {
        const m = valor.match(/^([^\s:]+)\s*:\s*(.+)$/);
        if (m) {
          pares.push({ nombre: m[1].trim(), valor: m[2].trim() });
          return;
        }
      }

      const par = { nombre: nombre || "Opción", valor };
      if (pares.some((p) => p.nombre === par.nombre && p.valor === par.valor)) return;
      pares.push(par);
    });

    return pares;
  };

  const extractVariantes = () => {
    const tabla = document.querySelector(SELECTORS.variantesTabla);
    if (!tabla) return [];
    const filas = Array.from(tabla.querySelectorAll(SELECTORS.variantesFilas));
    if (filas.length === 0) return [];
    return filas
      .map((fila) => {
        const idCell = fila.querySelector('[data-cy^="product-info-variation-row-copy-id-"]');
        const stockCell = fila.querySelector('[data-cy^="product-info-variation-row-stock-"]');
        const costoCell = fila.querySelector('[data-cy^="product-info-variation-row-price-"]');
        const ventaCell = fila.querySelector('[data-cy^="product-info-variation-row-suggested-price-"]');
        const descCell = fila.querySelector("td:nth-child(2)");

        // La celda "Id" es la fuente fiable; el data-cy de la fila es el respaldo.
        const filaId = (fila.getAttribute("data-cy") || "").match(/variation-row-(\d+)/);
        const variantDropiId = onlyDigits(trimText(idCell)) || (filaId ? filaId[1] : null);
        if (!variantDropiId) return null;

        const stock = toInteger(trimText(stockCell));
        const precioCosto = toAmount(trimText(costoCell));
        const precioVenta = toAmount(
          ventaCell ? trimText(ventaCell.querySelector("currency")) || trimText(ventaCell) : null,
        );

        return {
          variantDropiId: String(variantDropiId),
          stock: Number.isFinite(stock) ? stock : 0,
          precioCosto: Number.isFinite(precioCosto) ? precioCosto : null,
          precioVenta: Number.isFinite(precioVenta) ? precioVenta : null,
          opciones: parseOpcionesVariante(descCell),
          descripcion: trimText(descCell),
        };
      })
      .filter(Boolean);
  };

  /* --------------------------------------------------------------------- *
   * Extracción
   * --------------------------------------------------------------------- */

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Las pestañas del detalle (Detalles / Garantías / Recursos adicionales) montan
   * su contenido bajo demanda: con "Garantías" activa, #descriptionContainer no
   * existe en el DOM. Estos helpers hacen el mismo clic que haría el usuario y
   * dejan la pestaña como estaba.
   */
  const pestanasProducto = () =>
    Array.from(document.querySelectorAll('[data-cy^="product-tabs-nav-tab-"]'));

  const pestanaActiva = () => pestanasProducto().find((el) => el.classList.contains("active-tab")) || null;

  /** Activa la pestaña cuyo texto casa con el patrón. Devuelve si cambió de pestaña. */
  const activarPestana = async (patron) => {
    const destino = pestanasProducto().find((el) => patron.test(trimText(el) || ""));
    if (!destino || destino === pestanaActiva()) return false;
    destino.click();
    await wait(400);
    return true;
  };

  const restaurarPestana = async (pestana) => {
    if (!pestana || pestana === pestanaActiva()) return;
    pestana.click();
    await wait(200);
  };

  /**
   * Lee la descripción activando antes la pestaña que la monta, para que no
   * dependa de en qué pestaña estuviera la vista.
   */
  const leerDescripcion = async () => {
    if (!document.querySelector(SELECTORS.descripcion)) {
      await activarPestana(/detalle/i);
    }
    return innerHtml(document.querySelector(SELECTORS.descripcion));
  };

  /**
   * Garantiza que la información de garantía esté presente en el DOM antes
   * de extraerla: abre la pestaña que monta el acordeón (.warranty-accordion)
   * si no existe y expande las filas (.warranty-row) para que Angular renderice
   * los detalles (.warranty-details-text). Es el mismo clic que haría el usuario.
   */
  const leerGarantia = async () => {
    if (!document.querySelector(".warranty-accordion")) {
      await activarPestana(/garant/i);
    }

    const columnas = Array.from(document.querySelectorAll(SELECTORS.garantiaRows)).filter(
      (row) => !/expanded/.test(row.className || "")
    );
    if (columnas.length > 0) {
      columnas.forEach((row) => {
        const header = row.querySelector(".warranty-row-header");
        if (header) header.click();
      });
      await wait(300);
    }

    return extractGarantia();
  };

  const extractProduct = async () => {
    const $ = (selector) => document.querySelector(selector);

    const data = {
      dropiId: null,
      titulo: null,
      skuOriginal: null,
      tipoProducto: null,
      precioCosto: null,
      precioVenta: null,
      stock: null,
      proveedor: null,
      bodegas: null,
      bodegaPrincipal: null,
      categoria: null,
      descripcionHtml: null,
      garantia: null,
      imagenes: [],
      variantes: [],
      tieneVariantes: false,
    };

    data.dropiId = onlyDigits(trimText($(SELECTORS.dropiId)));
    data.titulo = trimText($(SELECTORS.titulo));
    data.skuOriginal = trimText($(SELECTORS.skuOriginal));
    // "Variable" / "Simple": los productos variables no traen precio de venta
    // global, solo por variante.
    data.tipoProducto = trimText($(SELECTORS.tipoProducto));
    data.precioCosto = toAmount(trimText($(SELECTORS.precioCosto)));
    data.precioVenta = toAmount(trimText($(SELECTORS.precioVenta)));
    data.stock = toInteger(trimText($(SELECTORS.stock)));
    data.proveedor = trimText($(SELECTORS.proveedor));
    data.bodegas = trimText($(SELECTORS.bodegas));

    const imageSourceAttrs = ["data-src", "data-original", "src", "currentSrc"];
    const images = Array.from(document.querySelectorAll(SELECTORS.galeria))
      .map((img) => {
        for (const attr of imageSourceAttrs) {
          const source = img.getAttribute(attr) || img[attr];
          const url = toAbsoluteUrl(source);
          if (url) return url;
        }
        return null;
      })
      .filter(Boolean);
    data.imagenes = dedupeUrls(images).slice(0, MAX_IMAGENES);

    const bodegaItems = (data.bodegas || "")
      .split(/[,\|;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    data.bodegaPrincipal = bodegaItems[0] || null;

    const match = window.location.pathname.match(PRODUCT_DETAILS_PATH_RE);
    const slugUrl = match ? match[2] : null;
    if (match && !data.dropiId) data.dropiId = match[1];
    const chipsCategoria = Array.from(document.querySelectorAll(SELECTORS.categoria))
      .map((chip) => trimText(chip))
      .filter(Boolean);
    data.categoria = elegirCategoria(chipsCategoria, slugUrl);

    // Las variantes se leen antes de tocar las pestañas: viven en app-product-info,
    // fuera de dropi-tabs, así que no dependen del estado de la interfaz.
    const variantes = extractVariantes();
    data.variantes = variantes;
    data.tieneVariantes = variantes.length > 0 || /variable/i.test(data.tipoProducto || "");

    // Descripción y garantías están en pestañas distintas: se lee cada una en la
    // suya y al final se devuelve la vista a la pestaña que tenía el usuario.
    const pestanaPrevia = pestanaActiva();
    data.descripcionHtml = await leerDescripcion();
    data.garantia = await leerGarantia();
    await restaurarPestana(pestanaPrevia);

    const missing = [];
    if (!data.dropiId) missing.push("dropi_id");
    if (!data.titulo) missing.push("titulo");
    if (data.tieneVariantes) {
      if (variantes.length === 0) missing.push("variantes");
      for (let i = 0; i < variantes.length; i += 1) {
        const v = variantes[i];
        if (!v || !v.variantDropiId) { missing.push("variante_id"); break; }
        if (!precioValido(v.precioVenta)) { missing.push("precio_venta_variante"); break; }
      }
    } else if (!precioValido(data.precioVenta)) {
      missing.push("precio_venta");
    }
    if (missing.length > 0) {
      return { ok: false, error: "No se pudo leer la información completa del producto.", missing, product: data };
    }

    const warnings = [];
    if (data.imagenes.length === 0)
      warnings.push("No se encontraron imágenes en la galería (.section-gallery p-galleriaitemslot img).");
    if (!data.descripcionHtml) warnings.push("No se encontró la descripción (#descriptionContainer).");
    if (data.tieneVariantes) {
      const dimensiones = Array.from(new Set(variantes.flatMap((v) => v.opciones.map((o) => o.nombre))));
      warnings.push(
        `${variantes.length} variante(s) con precio y stock propios. Opciones: ${dimensiones.join(", ") || "ninguna"}.`,
      );
    }

    return { ok: true, product: data, warnings };
  };

  /* --------------------------------------------------------------------- *
   * Mensajería
   * --------------------------------------------------------------------- */

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== "string") return undefined;

    if (message.type === MSG_PING) {
      sendResponse({
        ok: true,
        ready: Boolean(window.location.pathname.match(PRODUCT_DETAILS_PATH_RE)),
      });
      return undefined;
    }

    if (message.type === MSG_EXTRACT) {
      Promise.resolve(extractProduct()).then(sendResponse);
      return true;
    }

    return undefined;
  });
})();