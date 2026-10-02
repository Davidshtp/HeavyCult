/**
 * background.js
 *
 * Service worker (MV3). Único punto autorizado para llamar a Shopify (los
 * content scripts están bloqueados por CORS).
 *
 * Autenticación: replica el flujo del sistema local (Client Credentials).
 *  - POST https://{shop}/admin/oauth/access_token con client_id/client_secret.
 *  - El token se cachea en chrome.storage.local con vencimiento (24 h).
 *  - Se renueva por demanda, con un alarm cada 30 min (como el cron backend)
 *    y con reintento automático tras un 401.
 *
 * Mensajes:
 *  - IMPORT_TO_SHOPIFY  { config, product } -> { ok, productId?, productUrl?, errors? }
 *  - TEST_CONNECTION    { config }           -> { ok, mensaje?, scope?, errors? }
 *  - LIST_LOCATIONS     { config }           -> { ok, locations?, errors? }
 *
 * Nota sobre el modelo de productos:
 *  - Esta tienda usa el NUEVO modelo de productos (verificado por introspección):
 *    productCreate ya NO acepta variants en ninguna versión de API.
 *  - El flujo es de DOS mutaciones:
 *      1) productCreate(product, media)                -> crea el producto.
 *      2) productVariantsBulkCreate(productId, variants,
 *            strategy: REMOVE_STANDALONE_VARIANT)     -> crea las variantes con
 *         SKU, precio, tracking de inventario y stock en la ubicación, y borra
 *         la variante "Default Title" que crea productCreate.
 *  - Versión mínima soportada: 2025-01 (default recomendado 2026-07).
 */
"use strict";

const MSG_IMPORT = "IMPORT_TO_SHOPIFY";
const MSG_TEST = "TEST_CONNECTION";
const MSG_LIST_LOCATIONS = "LIST_LOCATIONS";

const REQUEST_TIMEOUT_MS = 30000;
const TIEMPO_ESPERA_TOKEN_MS = 10000;
const DURACION_TOKEN_MS = 24 * 60 * 60 * 1000;
const MARGEN_RENOVACION_MS = 30 * 60 * 1000;
const ALARM_RENOVAR = "renovarTokenShopify";
const ALARM_PERIODO_MIN = 30;

const STORAGE_CONFIG = "dropiImporterConfig";
const STORAGE_TOKEN = "dropiTokenCache";

const NEW_MODEL_MIN_VERSION = 202501; // 2025-01
const LOCATION_GID_RE = /^gid:\/\/shopify\/Location\/\d+$/;

const MAX_OPCIONES_SHOPIFY = 3;
const OPCION_POR_DEFECTO = "Opción";
const VALOR_POR_DEFECTO = "Único";

/**
 * Shopify admite como máximo 250 elementos por argumento de tipo array en
 * cualquier llamada de la API, así que las variantes se envían en lotes.
 */
const MAX_VARIANTES_POR_LOTE = 250;

/**
 * Elimina la variante "Default Title" que deja productCreate, de modo que el
 * producto queda exactamente con las variantes de Dropi.
 */
const STRATEGY_REMOVE_STANDALONE = "REMOVE_STANDALONE_VARIANT";
/** Estrategia para los lotes siguientes: la variante inicial ya no existe. */
const STRATEGY_DEFAULT = "DEFAULT";

/* --------------------------------------------------------------------- *
 * Deducción de nombres de opción
 *
 * Dropi no etiqueta las variaciones de forma consistente: en unos productos
 * escribe "Color: Azul" (nombre correcto) y en otros "Negro: 28", donde pone el
 * VALOR de una dimensión justo donde debería ir su nombre. Copiar su texto tal
 * cual deja en Shopify una opción llamada "Negro" cuyos valores son tallas
 * (28, 30, 32...). Estos conjuntos permiten deducir el nombre real a partir de la
 * forma de los valores y no del rótulo que trae Dropi.
 * --------------------------------------------------------------------- */

const COLOR_OPCION = "Color";
const TALLA_OPCION = "Talla";
const NOMBRES_OPCION_POR_POSICION = [COLOR_OPCION, TALLA_OPCION, "Estilo"];

/** Nombres de dimensión que sí se respetan tal cual si Dropi los escribió. */
const NOMBRES_OPCION_FIABLES = new Set([
  "color",
  "talla",
  "tamaño",
  "tamano",
  "size",
  "material",
  "estampa",
  "estampado",
  "modelo",
  "corte",
  "genero",
  "género",
  "estilo",
  "peso",
  "capacidad",
]);

const COLORES = new Set([
  "negro", "negra", "blanco", "blanca", "rojo", "roja", "azul", "verde",
  "amarillo", "amarilla", "gris", "gris claro", "gris oscuro", "plateado",
  "plateada", "dorado", "dorada", "morado", "morada", "violeta", "lila",
  "rosa", "fucsia", "magenta", "naranja", "cafe", "beige", "crema",
  "turquesa", "celeste", "marron", "vino", "mostaza", "caramelo", "miel",
  "arena", "coral", "salvia", "oliva", "bordo", "lavanda", "perla",
  "transparente", "multicolor",
]);

/** Tallas de letras: 2XS, XS, S, M, L, XL, 2XL… */
const RE_TALLA_LETRAS = /^(xxs|xs|s|m|l|xl|xxxl|xxl|2xl|3xl|4xl|5xl)$/i;
const RE_TALLA_NUMERICA = /^\d+([.,]\d+)?$/;

const RANGO_TALLAS = {
  xxs: 0, xs: 1, s: 2, m: 3, l: 4, xl: 5, xxl: 6,
  xxxl: 7, "2xl": 7, "3xl": 8, "4xl": 9, "5xl": 10,
};

const sinAcentos = (texto) =>
  String(texto == null ? "" : texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** "Negro / Rayas" cuenta como color si alguno de sus segmentos lo es. */
const esValorDeColor = (valor) => {
  const base = sinAcentos(valor);
  if (!base) return false;
  if (COLORES.has(base)) return true;
  return base.split(/[\/,+|]/).some((token) => COLORES.has(token.trim()));
};

const esValorDeTalla = (valor) => {
  const base = sinAcentos(valor);
  if (!base) return false;
  return RE_TALLA_LETRAS.test(base) || RE_TALLA_NUMERICA.test(base);
};

/** Ordena 28,30,…,40 numéricamente y XS,S,M,XL por rango; si no, deja el orden. */
const ordenarValoresOpcion = (lista) => {
  if (lista.length < 2) return lista;
  const claves = lista.map(sinAcentos);

  if (claves.every((clave) => RE_TALLA_NUMERICA.test(clave))) {
    return lista
      .map((valor, i) => ({ valor, orden: Number(claves[i].replace(",", ".")) }))
      .sort((a, b) => a.orden - b.orden)
      .map((par) => par.valor);
  }

  if (claves.every((clave) => RANGO_TALLAS[clave] !== undefined)) {
    return lista
      .map((valor, i) => ({ valor, orden: RANGO_TALLAS[claves[i]] }))
      .sort((a, b) => a.orden - b.orden)
      .map((par) => par.valor);
  }

  return lista;
};

/**
 * Un rótulo sirve como nombre de opción solo si parece una etiqueta y no un
 * valor: "28", "M" o "Negro" son valores que Dropi puso en el lugar del nombre.
 */
const pareceNombreDeOpcion = (texto) => {
  const base = sinAcentos(texto);
  if (!base) return false;
  if (RE_TALLA_NUMERICA.test(base)) return false;
  if (RE_TALLA_LETRAS.test(base)) return false;
  if (esValorDeColor(base)) return false;
  return /[a-z]/.test(base);
};

/** Deduce el nombre real de una dimensión a partir de sus valores. */
const deducirNombreOpcion = (nombreActual, valores) => {
  const base = sinAcentos(nombreActual);
  if (NOMBRES_OPCION_FIABLES.has(base)) return nombreActual;

  const unicos = [...new Set(valores.filter(Boolean))];

  // Los valores mandan sobre el rótulo: en el catálogo real hay una dimensión
  // llamada "Negro" cuyos valores son las tallas (28, 30, 42…), y llamarla
  // "Color" produciría una opción "Color: 28, 30, 42".
  if (unicos.length > 0 && unicos.every(esValorDeTalla)) return TALLA_OPCION;
  if (unicos.length > 0 && unicos.every(esValorDeColor)) return COLOR_OPCION;

  // El nombre de Dropi es un color y sus valores no dicen nada: es el color.
  if (esValorDeColor(nombreActual)) return COLOR_OPCION;

  return null;
};

/**
 * Calcula el nombre final de cada dimensión conservada. Si dos deducen el mismo
 * nombre, la segunda se numera ("Color 2"), porque Shopify no admite dos
 * opciones con el mismo nombre.
 */
const resolverNombresOpcion = (nombres, valoresPorNombre) => {
  const usados = new Set();

  return nombres.map((nombre, indice) => {
    const deducido = deducirNombreOpcion(nombre, valoresPorNombre.get(nombre) || []);
    const candidato =
      deducido ||
      (pareceNombreDeOpcion(nombre) ? nombre : null) ||
      NOMBRES_OPCION_POR_POSICION[indice] ||
      `${OPCION_POR_DEFECTO} ${indice + 1}`;

    if (!usados.has(candidato)) {
      usados.add(candidato);
      return candidato;
    }

    let sufijo = 2;
    while (usados.has(`${candidato} ${sufijo}`)) sufijo += 1;
    const numerado = `${candidato} ${sufijo}`;
    usados.add(numerado);
    return numerado;
  });
};

const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY_COSTO = "costo_de_producto";
const METAFIELD_TYPE_COSTO = "number_decimal";
const METAFIELD_KEY_GARANTIA = "informacion_de_garantia";
const METAFIELD_TYPE_GARANTIA = "multi_line_text_field";

/* --------------------------------------------------------------------- *
 * Mensajería
 * --------------------------------------------------------------------- */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return undefined;

  if (message.type === MSG_TEST) {
    testConnection(message.config)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, errors: [mensajeDe(error)] }));
    return true; // respuesta asíncrona
  }

  if (message.type === MSG_IMPORT) {
    runImport(message.config, message.product)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, errors: [mensajeDe(error)] }));
    return true; // respuesta asíncrona
  }

  if (message.type === MSG_LIST_LOCATIONS) {
    listLocations(message.config)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, errors: [mensajeDe(error)] }));
    return true; // respuesta asíncrona
  }

  return undefined;
});

/* --------------------------------------------------------------------- *
 * Alarmas de renovación (equivale al cron del backend)
 * --------------------------------------------------------------------- */

if (typeof chrome.alarms !== "undefined") {
  chrome.runtime.onInstalled.addListener(configurarAlarmaRenovacion);
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_RENOVAR) renovarTokenPorAlarma();
  });
}

// Nota: configurarAlarmaRenovacion/renovarTokenPorAlarma son funciones
// declaradas (hoisteadas). Si fueran `const`, referenciarlas aquí arriba
// lanzaría un ReferenceError (temporal dead zone) al cargar el worker.

async function configurarAlarmaRenovacion() {
  try {
    const existente = await chrome.alarms.get(ALARM_RENOVAR);
    if (!existente) {
      await chrome.alarms.create(ALARM_RENOVAR, { periodInMinutes: ALARM_PERIODO_MIN });
    }
  } catch (_err) {
    /* sin permisos de alarms: la renovación ocurre bajo demanda */
  }
}

async function renovarTokenPorAlarma() {
  try {
    const config = await leerConfigGuardada();
    if (!config || !config.shopDomain || !config.clientId || !config.clientSecret) return;
    await obtenerAccessToken(config, { forzar: true, permitirCacheVencida: false });
  } catch (_err) {
    /* se reintentará en el próximo alarm o bajo demanda */
  }
}

/* --------------------------------------------------------------------- *
 * Configuración y validación
 * --------------------------------------------------------------------- */

const leerConfigGuardada = async () => {
  try {
    const { [STORAGE_CONFIG]: config } = await chrome.storage.local.get(STORAGE_CONFIG);
    return config || null;
  } catch {
    return null;
  }
};

const versionToNumber = (version) => {
  const match = String(version || "").match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : null;
};

/** Acepta "123456", "Location/123456" o un gid completo. => gid. */
const toLocationGid = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  if (LOCATION_GID_RE.test(text)) return text;
  const match = text.match(/(\d+)/);
  return match ? `gid://shopify/Location/${match[1]}` : null;
};

const validateConfig = (config) => {
  const errors = [];
  const shopDomain = String(config.shopDomain || "").trim().toLowerCase();
  if (!shopDomain) errors.push("Falta el Shopify Shop Domain.");
  else if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopDomain))
    errors.push("Shopify Shop Domain inválido.");

  const clientId = String(config.clientId || "").trim();
  if (!clientId) errors.push("Falta el Client ID.");
  else if (!/^[a-f0-9]{32}$/i.test(clientId)) errors.push("Client ID inválido (32 caracteres hexadecimales).");

  const clientSecret = String(config.clientSecret || "").trim();
  if (!clientSecret) errors.push("Falta el Client Secret.");

  const apiVersion = String(config.apiVersion || "").trim();
  if (!/^\d{4}-\d{2}$/.test(apiVersion)) errors.push("Versión de API inválida (formato YYYY-MM).");

  return { errors, shopDomain, clientId, clientSecret, apiVersion };
};

/** Precio utilizable como número positivo. null/""/undefined se normalizan a 0. */
const precioValido = (valor) => Number.isFinite(Number(valor)) && Number(valor) > 0;

const validateProduct = (product) => {
  const errors = [];
  if (!product || typeof product !== "object") return { errors: ["No se recibió el producto extraído."] };

  if (!String(product.dropiId || "").replace(/\D/g, "")) errors.push("El producto no tiene dropi_id.");
  if (!String(product.titulo || "").trim()) errors.push("El producto no tiene título.");

  // Un producto variable no tiene precio de venta global: solo por variante.
  const variantes = Array.isArray(product.variantes) ? product.variantes : [];
  const tieneVariantes = Boolean(product.tieneVariantes) && variantes.length > 0;

  if (tieneVariantes) {
    for (const variante of variantes) {
      const id = String((variante && variante.variantDropiId) || "").trim();
      if (!id) {
        errors.push("Hay una variante sin ID de Dropi.");
        continue;
      }
      if (!precioValido(variante.precioVenta))
        errors.push(`La variante ${id} no tiene precio de venta válido.`);
    }
  } else if (!precioValido(product.precioVenta)) {
    errors.push("El producto no tiene precio de venta válido.");
  }

  return { errors, dropiId: String(product.dropiId).replace(/\D/g, "") };
};

const buildTags = (product) => {
  const tags = new Set(["Dropi"]);
  const push = (value, max = 80) => {
    const text = String(value || "").trim();
    if (text && !tags.has(text)) tags.add(text.slice(0, max));
  };
  push(product.bodegaPrincipal);
  push(product.categoria);
  return Array.from(tags);
};

const mensajeDe = (error) => (error && error.message ? error.message : String(error));

const truncate = (text, max) => (text && text.length > max ? `${text.slice(0, max)}…` : text || "");

const formatearErrorUser = (error) =>
  error && error.field
    ? `${error.field}: ${error.message}`
    : error && error.message
      ? error.message
      : "Error de Shopify.";

/* --------------------------------------------------------------------- *
 * Utilidades de red
 * --------------------------------------------------------------------- */

const peticionTimeout = async (url, opciones = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } catch (error) {
    if (error && error.name === "AbortError")
      throw new Error("Se agotó el tiempo de espera de la petición a Shopify.");
    throw new Error(`Error de red al contactar Shopify: ${mensajeDe(error)}`);
  } finally {
    clearTimeout(temporizador);
  }
};

const errorHttp = (status, detalle) => {
  const error = new Error(`HTTP ${status}: ${detalle}`);
  error.status = status;
  return error;
};

/* --------------------------------------------------------------------- *
 * Token Client Credentials (mismo flujo que el sistema local)
 * --------------------------------------------------------------------- */

const obtenerTokenClientCredentials = async (shop, clientId, clientSecret) => {
  const url = `https://${shop}/admin/oauth/access_token`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const respuesta = await peticionTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params,
    },
    TIEMPO_ESPERA_TOKEN_MS,
  );

  const texto = await respuesta.text();
  let cuerpo = null;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch (_err) {
    cuerpo = null;
  }

  if (!respuesta.ok) throw new Error(mensajeErrorOAuth(cuerpo, texto, respuesta.status));

  const accessToken =
    cuerpo && typeof cuerpo === "object" && typeof cuerpo.access_token === "string"
      ? cuerpo.access_token
      : null;
  if (!accessToken) throw new Error("Shopify no devolvió un access_token en la respuesta.");

  return {
    accessToken,
    scope: typeof cuerpo.scope === "string" ? cuerpo.scope : null,
    expiresIn: typeof cuerpo.expires_in === "number" ? cuerpo.expires_in : undefined,
  };
};

const mensajeErrorOAuth = (cuerpo, texto, status) => {
  let codigo = "";
  if (cuerpo && typeof cuerpo === "object" && typeof cuerpo.error === "string") codigo = cuerpo.error;
  if (!codigo) {
    const coincidencia = texto.match(/Oauth error\s+([A-Za-z_]+)/);
    if (coincidencia) codigo = coincidencia[1];
  }

  const textoError = String(texto.includes("client secret") ? "client secret" : "").toLowerCase();
  const detalle = textoError || codigo.toLowerCase();

  if (codigo.toLowerCase() === "application_cannot_be_found")
    return "No se encontró la app de Shopify con ese Client ID en esa tienda. La app debe pertenecer a tu organización.";
  if (codigo.toLowerCase() === "shop_not_permitted")
    return "La app no puede usar Client Credentials en esta tienda. Instala una app de tu organización antes de conectar.";
  if (codigo.toLowerCase() === "invalid_request" || detalle.includes("client secret"))
    return "Credenciales inválidas: revisa el Client ID y el Client Secret (mal copiados o rotados).";
  return `Shopify rechazó las credenciales${codigo ? ` (${codigo})` : ` (HTTP ${status})`}. Verifica los datos e inténtalo de nuevo.`;
};

/* --------------------------------------------------------------------- *
 * Cache y vigencia del token
 * --------------------------------------------------------------------- */

const claveToken = (shop) => `${STORAGE_TOKEN}_${shop}`;

const leerTokenCacheado = async (shop) => {
  try {
    const { [claveToken(shop)]: cache } = await chrome.storage.local.get(claveToken(shop));
    return cache || null;
  } catch {
    return null;
  }
};

const tokenVigente = (cache) => {
  if (!cache || !cache.accessToken) return false;
  const expira = cache.tokenExpiraEn ? Date.parse(cache.tokenExpiraEn) : NaN;
  if (Number.isNaN(expira)) return false;
  // Se considera vencido en cuanto falten menos de 30 min (igual que el backend).
  return expira - Date.now() > MARGEN_RENOVACION_MS;
};

const guardarTokenCache = async (shop, credenciales) => {
  const ahora = Date.now();
  const expiraEn = credenciales.expiresIn ? credenciales.expiresIn * 1000 : DURACION_TOKEN_MS;
  await chrome.storage.local.set({
    [claveToken(shop)]: {
      shop,
      accessToken: credenciales.accessToken,
      scope: credenciales.scope || null,
      tokenObtenidoEn: new Date(ahora).toISOString(),
      tokenExpiraEn: new Date(ahora + expiraEn).toISOString(),
    },
  });
};

/**
 * Devuelve un access_token válido. Renueva si el cache no está vigente.
 * Con `forzar` siempre renueva; con `permitirCacheVencida` usa el cache como
 * último recurso si la renovación falla (robustez ante caídas del endpoint).
 */
const obtenerAccessToken = async (config, { forzar = false, permitirCacheVencida = false } = {}) => {
  const cache = await leerTokenCacheado(config.shopDomain);
  if (!forzar && tokenVigente(cache)) return cache.accessToken;

  try {
    const credenciales = await obtenerTokenClientCredentials(
      config.shopDomain,
      config.clientId,
      config.clientSecret,
    );
    await guardarTokenCache(config.shopDomain, credenciales);
    return credenciales.accessToken;
  } catch (error) {
    if (permitirCacheVencida && cache && cache.accessToken) return cache.accessToken;
    throw error;
  }
};

const scopeActual = async (config) => {
  const cache = await leerTokenCacheado(config.shopDomain);
  return cache && cache.scope ? cache.scope : null;
};

/* --------------------------------------------------------------------- *
 * Prueba de conexión (GET shop.json)
 * --------------------------------------------------------------------- */

const probarConexionConShop = async (token, shop) => {
  const url = `https://${shop}/admin/api/2024-01/shop.json`;
  const respuesta = await peticionTimeout(url, {
    headers: { "X-Shopify-Access-Token": token, Accept: "application/json" },
  });
  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch (_err) {
    cuerpo = null;
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401)
      throw new Error("El token fue rechazado (401). Revisa el Client ID y el Client Secret.");
    if (respuesta.status === 403)
      throw new Error("El token es válido pero la app no tiene los scopes de Admin API necesarios.");
    if (respuesta.status === 404) throw new Error(`No se encontró la tienda Shopify (${shop}).`);
    if (respuesta.status === 429)
      throw new Error("Shopify rechazó la petición por límite de uso (HTTP 429). Intenta nuevamente.");
    throw new Error(`Shopify respondió con un error (HTTP ${respuesta.status}).`);
  }

  const nombre =
    cuerpo && typeof cuerpo === "object" && cuerpo.shop && typeof cuerpo.shop.name === "string"
      ? cuerpo.shop.name
      : null;
  return nombre;
};

const testConnection = async (config = {}) => {
  const check = validateConfig(config);
  if (check.errors.length > 0) return { ok: false, errors: check.errors };

  try {
    const token = await obtenerAccessToken(config, { forzar: true, permitirCacheVencida: false });
    const nombre = await probarConexionConShop(token, check.shopDomain);
    const scope = await scopeActual(config);
    return {
      ok: true,
      mensaje: `Conexión verificada con Shopify${nombre ? ` (${nombre})` : ""}.`,
      scope,
    };
  } catch (error) {
    return { ok: false, errors: [mensajeDe(error)] };
  }
};

/* --------------------------------------------------------------------- *
 * Llamada GraphQL
 * --------------------------------------------------------------------- */

const postGraphql = async ({ shopDomain, apiToken, apiVersion, query, variables }) => {
  const endpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
  const respuesta = await peticionTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": apiToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await respuesta.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch (_err) {
    json = null;
  }

  if (!respuesta.ok) {
    let detalle = json ? json.error_description || json.errors || body : body;
    if (typeof detalle !== "string") detalle = JSON.stringify(detalle);
    if (respuesta.status === 401)
      detalle = "El token fue rechazado (401). La extensión intentará renovarlo automáticamente.";
    if (respuesta.status === 403)
      detalle =
        "El token no tiene los scopes necesarios (403). Scopes requeridos: read_products, write_products, " +
        "write_inventory, read_inventory y read_locations.";
    if (respuesta.status === 429)
      detalle = "Límite de uso de la API (429). Intenta nuevamente en un momento.";
    throw errorHttp(respuesta.status, truncate(detalle, 300));
  }

  if (json && json.errors != null) {
    const errores = json.errors;
    let detalle;
    if (Array.isArray(errores)) {
      detalle = errores.map((e) => (e && e.message ? e.message : "Error desconocido de GraphQL")).join(" | ");
    } else if (typeof errores === "string") {
      detalle = errores;
    } else {
      detalle = JSON.stringify(errores);
    }
    throw new Error(truncate(detalle, 300));
  }

  return json;
};

/* --------------------------------------------------------------------- *
 * Flujo de mutaciones (nuevo modelo de productos, >= 2025-01)
 * --------------------------------------------------------------------- */

const PRODUCT_CREATE_QUERY = `
mutation ProductImport($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
  productCreate(product: $product, media: $media) {
    product {
      id
      variants(first: 1) {
        nodes {
          id
          inventoryItem {
            id
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const VARIANTS_BULK_CREATE_QUERY = `
mutation VariantImport($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
    productVariants {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`;

const VARIANTS_BULK_UPDATE_QUERY = `
mutation VariantUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`;

const INVENTORY_SET_QUANTITIES_QUERY = `
mutation InventorySet($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    userErrors {
      field
      message
    }
  }
}
`;

const INVENTORY_SET_QUANTITIES_QUERY_IDEMPOTENT = `
mutation InventorySet($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
  inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
    userErrors {
      field
      message
    }
  }
}
`;

const RAZON_CORRECCION_INVENTARIO = "correction";
const IDEMPOTENCIA_MIN_VERSION = 202604; // @idempotent obligatorio desde 2026-04
const CHANGE_FROM_QUANTITY_MIN_VERSION = 202607; // campo obligatorio desde 2026-07

const generarIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const LOCATIONS_QUERY = `
query Locations {
  locations(first: 20) {
    edges {
      node {
        id
        name
      }
    }
  }
}
`;

const VARIANTS_BY_SKU_QUERY = `
query VariantsBySku($query: String!) {
  productVariants(first: 5, query: $query) {
    edges {
      node {
        id
        sku
        title
        product {
          id
          title
          handle
        }
      }
    }
  }
}
`;

/**
 * Deshace un productCreate que quedó a medias. Es indispensable: un producto
 * sin variantes no tiene SKU, así que la detección de duplicados no lo
 * encontraría y el siguiente intento crearía otro producto igual.
 */
const PRODUCT_DELETE_QUERY = `
mutation ProductImportRollback($input: ProductDeleteInput!) {
  productDelete(input: $input) {
    deletedProductId
    userErrors {
      field
      message
    }
  }
}
`;

/** Firma de productDelete anterior a 2025-10, para versiones más viejas. */
const PRODUCT_DELETE_LEGACY_QUERY = `
mutation ProductImportRollbackLegacy($id: ID!) {
  productDelete(id: $id) {
    deletedProductId
    userErrors {
      field
      message
    }
  }
}
`;

/** Lee los pares opción/valor de una variante, con un respaldo legible. */
const opcionesDeVariante = (variante) => {
  const pares = (Array.isArray(variante && variante.opciones) ? variante.opciones : [])
    .map((opcion) => ({
      nombre: String((opcion && opcion.nombre) || "").trim(),
      valor: String((opcion && opcion.valor) || "").trim(),
    }))
    .filter((opcion) => opcion.nombre && opcion.valor);

  if (pares.length > 0) return pares;

  const descripcion = String((variante && variante.descripcion) || "").trim();
  if (descripcion) return [{ nombre: OPCION_POR_DEFECTO, valor: descripcion }];

  const id = String((variante && variante.variantDropiId) || "").trim();
  return id ? [{ nombre: OPCION_POR_DEFECTO, valor: id }] : [];
};

/**
 * Traduce las variantes de Dropi a opciones de Shopify.
 *
 * `opciones` va a productCreate: ProductCreateInput.productOptions espera
 * [OptionCreateInput!] ({name, position, values:[{name}]}), nunca una lista de
 * strings como:before. `valores` es un valor por variante y por opción, en el
 * mismo orden, para productVariantsBulkCreate: Shopify exige que cada variante
 * tenga un valor para TODAS las opciones del producto, así que lo que falte se
 * rellena con el primer valor conocido de esa opción.
 *
 * Shopify admite como máximo 3 opciones: las dimensiones sobrantes se pliegan
 * dentro del valor de la última ("M / Grande").
 *
 * Los nombres que trae Dropi no se copian tal cual porque no son fiables: se
 * deducen con `resolverNombresOpcion`, que mira primero los VALORES. Así una
 * dimensión rotulada "Negro" cuyos valores son 28, 30, 42… pasa a llamarse
 * "Talla" (y no "Color: 28, 30, 42"), mientras que una rotulada "Color" se
 * respeta. El plegado sigue operándose sobre los nombres originales, antes de
 * renombrar.
 */
const construirOpcionesVariantes = (variantes) => {
  const paresPorVariante = variantes.map(opcionesDeVariante);

  const nombres = [];
  for (const pares of paresPorVariante) {
    for (const par of pares) if (!nombres.includes(par.nombre)) nombres.push(par.nombre);
  }

  const conservadas = nombres.slice(0, MAX_OPCIONES_SHOPIFY);
  const plegadas = nombres.slice(MAX_OPCIONES_SHOPIFY);
  if (conservadas.length === 0) return { opciones: [], valores: [] };

  const ultima = conservadas[conservadas.length - 1];
  const destinoPorVariante = paresPorVariante.map((pares) => {
    const destino = new Map();
    for (const par of pares) {
      if (!plegadas.includes(par.nombre)) {
        if (!destino.has(par.nombre)) destino.set(par.nombre, par.valor);
        continue;
      }
      const previo = destino.get(ultima);
      destino.set(ultima, previo ? `${previo} / ${par.valor}` : par.valor);
    }
    return destino;
  });

  const valoresPorOpcion = new Map(conservadas.map((nombre) => [nombre, []]));
  for (const destino of destinoPorVariante) {
    for (const nombre of conservadas) {
      const valor = destino.get(nombre);
      const lista = valoresPorOpcion.get(nombre);
      if (valor && !lista.includes(valor)) lista.push(valor);
    }
  }

  const opciones = resolverNombresOpcion(conservadas, valoresPorOpcion).map((name, indice) => {
    const lista = valoresPorOpcion.get(conservadas[indice]);
    return {
      name,
      position: indice + 1,
      values: ordenarValoresOpcion(lista.length > 0 ? lista : [VALOR_POR_DEFECTO]).map((valor) => ({
        name: valor,
      })),
    };
  });

  // Los mapas de destino están indexados por el nombre ORIGINAL de la dimensión
  // (conservadas[indice]), no por el nombre final que Shopify recibe: sin esta
  // alineación cada variante recibiría los valores de otra dimensión.
  const valores = destinoPorVariante.map((destino) =>
    opciones.map((opcion, indice) => destino.get(conservadas[indice]) || opcion.values[0].name),
  );

  return { opciones, valores };
};

const buildProductCreateVariables = ({ product, tags }) => {
  const productInput = {
    title: String(product.titulo).trim(),
    descriptionHtml: String(product.descripcionHtml || "").trim(),
    vendor: String(product.proveedor || "").trim() || "Dropi",
    tags,
    status: "ACTIVE",
  };

  const categoria = String(product.categoria || "").trim();
  if (categoria) productInput.productType = categoria;

  const variantes = Array.isArray(product.variantes) ? product.variantes : [];
  const tieneVariantes = Boolean(product.tieneVariantes) && variantes.length > 0;
  if (tieneVariantes) {
    const { opciones } = construirOpcionesVariantes(variantes);
    if (opciones.length > 0) productInput.productOptions = opciones;
  }

  const metafields = [];

  // Un producto variable no trae costo global: se usa el más bajo de sus variantes.
  const costosVariante = variantes
    .map((variante) => Number(variante && variante.precioCosto))
    .filter((numero) => Number.isFinite(numero) && numero > 0);
  const costoGlobal = Number(product.precioCosto);
  const costo =
    Number.isFinite(costoGlobal) && costoGlobal > 0
      ? costoGlobal
      : costosVariante.length > 0
        ? Math.min(...costosVariante)
        : null;
  if (Number.isFinite(costo) && costo > 0) {
    metafields.push({
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY_COSTO,
      type: METAFIELD_TYPE_COSTO,
      value: costo.toFixed(2),
    });
  }

  const garantia = String(product.garantia || "").trim();
  if (garantia) {
    metafields.push({
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY_GARANTIA,
      type: METAFIELD_TYPE_GARANTIA,
      value: garantia,
    });
  }

  if (metafields.length > 0) productInput.metafields = metafields;

  return {
    product: productInput,
    media: (Array.isArray(product.imagenes) ? product.imagenes : []).map((src) => ({
      originalSource: String(src),
      mediaContentType: "IMAGE",
    })),
  };
};

const buildVariantsBulkCreateInput = ({ product, productId, locationGid }) => {
  const variantes = Array.isArray(product.variantes) ? product.variantes : [];
  const tieneVariantes = Boolean(product.tieneVariantes) && variantes.length > 0;

  const buildVariant = (v) => {
    const sku = String((v && v.variantDropiId) || "").trim();
    if (!precioValido(v && v.precioVenta)) {
      throw new Error(`Precio de venta inválido en la variante ${sku || "?"}.`);
    }
    // ProductVariantsBulkInput no tiene campo `sku`: el SKU vive en inventoryItem.
    const input = {
      price: Number(v.precioVenta).toFixed(2),
      inventoryItem: {
        sku,
        tracked: true,
      },
    };
    const costoV = Number(v.precioCosto);
    if (Number.isFinite(costoV) && costoV > 0) {
      input.inventoryItem.cost = costoV.toFixed(2);
    }
    return input;
  };

  if (tieneVariantes) {
    const { opciones, valores } = construirOpcionesVariantes(variantes);
    return {
      variants: variantes.map((v, indice) => {
        const base = buildVariant(v);
        return {
          ...base,
          // VariantOptionValueInput es {optionName, name}; "value" no existe.
          optionValues: opciones.map((opcion, i) => ({
            optionName: opcion.name,
            name: (valores[indice] && valores[indice][i]) || opcion.values[0].name,
          })),
          inventoryQuantities: [
            {
              locationId: locationGid,
              availableQuantity: Number(v.stock || 0),
            },
          ],
        };
      }),
    };
  }

  if (!precioValido(product.precioVenta)) {
    throw new Error("El producto no tiene un precio de venta válido.");
  }
  const data = {
    price: Number(product.precioVenta).toFixed(2),
    inventoryItem: {
      sku: String(product.dropiId).replace(/\D/g, ""),
      tracked: true,
    },
  };
  const costo = Number(product.precioCosto);
  if (Number.isFinite(costo) && costo > 0) data.inventoryItem.cost = costo.toFixed(2);
  return {
    variants: [
      {
        ...data,
        inventoryQuantities: [
          {
            locationId: locationGid,
            availableQuantity: Number.isInteger(product.stock) && product.stock >= 0 ? product.stock : 0,
          },
        ],
      },
    ],
  };
};

const buildVariantsBulkUpdateInput = ({ product, variantGid }) => {
  const variantes = Array.isArray(product.variantes) ? product.variantes : [];
  const tieneVariantes = Boolean(product.tieneVariantes) && variantes.length > 0;
  if (tieneVariantes) {
    // No usado en el nuevo flujo; mantener seguro pero no retornar objeto inválido
  }
  const pVGlobal = Number(product.precioVenta);
  if (!Number.isFinite(pVGlobal) || pVGlobal <= 0) {
    throw new Error("El producto no tiene un precio de venta válido.");
  }
  const data = {
    id: variantGid,
    price: pVGlobal.toFixed(2),
    inventoryItem: {
      sku: String(product.dropiId).replace(/\D/g, ""),
      tracked: true,
    },
  };
  const costo = Number(product.precioCosto);
  if (Number.isFinite(costo) && costo > 0) data.inventoryItem.cost = costo.toFixed(2);
  return data;
};

const parseProductCreateResponse = (json, shopDomain) => {
  const created = json && json.data && json.data.productCreate;
  if (!created) throw new Error("Shopify no devolvió la mutación productCreate.");

  const userErrors = Array.isArray(created.userErrors) ? created.userErrors : [];
  if (userErrors.length > 0) {
    return { ok: false, errors: userErrors.map(formatearErrorUser) };
  }

  const gid = created.product && created.product.id;
  if (!gid) return { ok: false, errors: ["No se recibió el ID del producto creado."] };

  const productId = String(gid).replace(/^gid:\/\/shopify\/Product\//, "");

  const nodoVariante =
    created.product && created.product.variants && Array.isArray(created.product.variants.nodes)
      ? created.product.variants.nodes[0]
      : null;
  const variantGid = nodoVariante && nodoVariante.id ? String(nodoVariante.id) : null;
  const inventoryItemGid =
    nodoVariante && nodoVariante.inventoryItem && nodoVariante.inventoryItem.id
      ? String(nodoVariante.inventoryItem.id)
      : null;

  return {
    ok: true,
    productId,
    productGid: String(gid),
    productUrl: `https://admin.shopify.com/store/${shopDomain.replace(/\.myshopify\.com$/, "")}/products/${productId}`,
    variantGid,
    inventoryItemGid,
  };
};

/**
 * SKU con el que se reconoce un producto ya importado. Se usa el primero que
 * existirá en Shopify: el de la primera variante si el producto es variable, o
 * el id de Dropi si tiene una sola variante.
 */
const skuDeReferencia = (product) => {
  const variantes = Array.isArray(product && product.variantes) ? product.variantes : [];
  const tieneVariantes = Boolean(product && product.tieneVariantes) && variantes.length > 0;
  if (tieneVariantes) {
    const sku = String((variantes[0] && variantes[0].variantDropiId) || "").trim();
    if (sku) return sku;
  }
  return String((product && product.dropiId) || "").replace(/\D/g, "");
};

/**
 * Busca variantes con ese SKU en Shopify. El prefijo "sku:" es obligatorio: sin
 * él Shopify cae en búsqueda de texto completo y hace match con la descripción
 * del producto, lo que produce falsos positivos. Aun así se filtra por igualdad
 * exacta porque los SKU de Shopify distinguen mayúsculas.
 */
const filtrarProductosPorSku = (edges, sku) => {
  const encontrados = [];
  for (const edge of edges || []) {
    const nodo = edge && edge.node;
    if (!nodo || nodo.sku !== sku) continue;
    const producto = nodo.product || {};
    if (!producto.id || encontrados.some((previo) => previo.id === producto.id)) continue;
    encontrados.push({
      id: producto.id,
      title: producto.title || "(sin título)",
      handle: producto.handle || null,
    });
  }
  return encontrados;
};

const consultarSkuExistente = async (config, token, sku) => {
  const json = await postGraphql({
    shopDomain: config.shopDomain,
    apiToken: token,
    apiVersion: config.apiVersion,
    query: VARIANTS_BY_SKU_QUERY,
    variables: { query: `sku:${sku}` },
  });

  const edges = (json && json.data && json.data.productVariants && json.data.productVariants.edges) || [];
  return filtrarProductosPorSku(edges, sku);
};

/**
 * Devuelve el resultado de una importación abortada si el producto ya existe, o
 * null si hay que seguir. No se ofrece actualizar: el producto de Shopify puede
 * tener cambios manuales que una reimportación pisaría.
 */
const buscarDuplicadoPorSku = async (config, token, product) => {
  const sku = skuDeReferencia(product);
  if (!sku) return null;

  const existentes = await consultarSkuExistente(config, token, sku);
  if (existentes.length === 0) return null;

  const lineas = existentes.map((existente) => {
    const url = existente.handle
      ? `https://${config.shopDomain}/admin/products/${existente.handle}`
      : `https://${config.shopDomain}/admin`;
    return `• ${existente.title} — ${url}`;
  });

  return {
    ok: false,
    stage: "duplicado",
    errors: [
      `El SKU ${sku} ya existe en Shopify. No se creó nada.`,
      "Productos que ya lo tienen:",
      ...lineas,
      "Si necesitas actualizarlo, edítalo directamente en Shopify.",
    ],
    duplicateProduct: {
      title: existentes[0].title,
      url: existentes[0].handle
        ? `https://${config.shopDomain}/admin/products/${existentes[0].handle}`
        : `https://${config.shopDomain}/admin`,
    },
  };
};

const ejecutarProductCreate = async (config, token, product, tags) => {
  const variables = buildProductCreateVariables({ product, tags });
  const json = await postGraphql({
    shopDomain: config.shopDomain,
    apiToken: token,
    apiVersion: config.apiVersion,
    query: PRODUCT_CREATE_QUERY,
    variables,
  });
  return parseProductCreateResponse(json, config.shopDomain);
};

const parseVariantsBulkResponse = (json, op = "productVariantsBulkCreate") => {
  const result = json && json.data && json.data[op];
  if (!result) throw new Error(`Shopify no devolvió la mutación ${op}.`);

  const userErrors = Array.isArray(result.userErrors) ? result.userErrors : [];
  if (userErrors.length > 0) {
    return { ok: false, errors: userErrors.map(formatearErrorUser) };
  }

  const variantes = Array.isArray(result.productVariants) ? result.productVariants : [];
  if (variantes.length === 0) return { ok: false, errors: ["No se actualizó ninguna variante (productVariants vacío)."] };

  return { ok: true };
};

/**
 * Borra el producto que se acaba de crear cuando un paso posterior falla.
 * Nunca debe hacer fracasar la importación, por eso el llamador convierte
 * cualquier error en un aviso añadido a los errores originales.
 */
const ejecutarProductDelete = async (config, token, productId) => {
  const ejecutar = async (query, variables) => {
    const json = await postGraphql({
      shopDomain: config.shopDomain,
      apiToken: token,
      apiVersion: config.apiVersion,
      query,
      variables,
    });
    const result = json && json.data && json.data.productDelete;
    if (!result) throw new Error("Shopify no devolvió la mutación productDelete.");
    const userErrors = Array.isArray(result.userErrors) ? result.userErrors : [];
    if (userErrors.length > 0) throw new Error(userErrors.map(formatearErrorUser).join(" | "));
    return result;
  };

  try {
    return await ejecutar(PRODUCT_DELETE_QUERY, { input: { id: productId } });
  } catch (_error) {
    // Versiones anteriores a 2025-10 usan productDelete(id:).
    return await ejecutar(PRODUCT_DELETE_LEGACY_QUERY, { id: productId });
  }
};

/** Parte una lista en trozos de como máximo `max`, sin perder ni reordenar nada. */
const dividirEnLotes = (lista, max) => {
  const lotes = [];
  for (let i = 0; i < lista.length; i += max) lotes.push(lista.slice(i, i + max));
  return lotes;
};

const ejecutarVariantsBulkCreate = async (config, token, productId, product, locationGid) => {
  const inputData = buildVariantsBulkCreateInput({ product, productId, locationGid });
  const total = inputData.variants.length;
  const lotes = dividirEnLotes(inputData.variants, MAX_VARIANTES_POR_LOTE);
  if (lotes.length === 0) return { ok: false, errors: ["No se construyó ninguna variante."] };

  for (const [indice, lote] of lotes.entries()) {
    const json = await postGraphql({
      shopDomain: config.shopDomain,
      apiToken: token,
      apiVersion: config.apiVersion,
      query: VARIANTS_BULK_CREATE_QUERY,
      variables: {
        productId,
        variants: lote,
        // Solo el primer lote borra la variante "Default Title"; en los
        // siguientes ya no existe y la estrategia por defecto la preserva.
        strategy: indice === 0 ? STRATEGY_REMOVE_STANDALONE : STRATEGY_DEFAULT,
      },
    });
    const resultado = parseVariantsBulkResponse(json, "productVariantsBulkCreate");
    if (!resultado.ok) {
      return {
        ok: false,
        errors:
          lotes.length === 1
            ? resultado.errors
            : [
                ...resultado.errors,
                `Falló el lote ${indice + 1} de ${lotes.length} (variantes ${indice * MAX_VARIANTES_POR_LOTE + 1}–${
                  indice * MAX_VARIANTES_POR_LOTE + lote.length
                } de ${total}).`,
              ],
      };
    }
  }

  return { ok: true };
};

const ejecutarVariantsBulkUpdate = async (config, token, productId, product, variantGid) => {
  const json = await postGraphql({
    shopDomain: config.shopDomain,
    apiToken: token,
    apiVersion: config.apiVersion,
    query: VARIANTS_BULK_UPDATE_QUERY,
    variables: {
      productId,
      variants: [buildVariantsBulkUpdateInput({ product, variantGid })],
    },
  });
  return parseVariantsBulkResponse(json, "productVariantsBulkUpdate");
};

const ejecutarSetInventario = async (config, token, inventoryItemGid, locationGid, stock) => {
  const version = versionToNumber(config.apiVersion);
  const conIdempotencia = version != null && version >= IDEMPOTENCIA_MIN_VERSION;
  const conChangeFromQuantity = version != null && version >= CHANGE_FROM_QUANTITY_MIN_VERSION;

  const cantidad = { inventoryItemId: inventoryItemGid, locationId: locationGid, quantity: stock };
  if (conChangeFromQuantity) cantidad.changeFromQuantity = null;

  const variables = {
    input: {
      name: "available",
      reason: RAZON_CORRECCION_INVENTARIO,
      quantities: [cantidad],
    },
  };
  if (conIdempotencia) variables.idempotencyKey = generarIdempotencyKey();

  const json = await postGraphql({
    shopDomain: config.shopDomain,
    apiToken: token,
    apiVersion: config.apiVersion,
    query: conIdempotencia ? INVENTORY_SET_QUANTITIES_QUERY_IDEMPOTENT : INVENTORY_SET_QUANTITIES_QUERY,
    variables,
  });

  const result = json && json.data && json.data.inventorySetQuantities;
  if (!result) throw new Error("Shopify no devolvió la mutación inventorySetQuantities.");
  const userErrors = Array.isArray(result.userErrors) ? result.userErrors : [];
  if (userErrors.length > 0) return { ok: false, errors: userErrors.map(formatearErrorUser) };
  return { ok: true };
};

/**
 * Termina de armar el producto ya creado: precio, SKU, costo y stock de sus
 * variantes. Se separa de `crearProductoEnShopify` para que ese pueda revertir
 * el productCreate cuando algo aquí falla.
 */
const completarCreacion = async (config, token, product, creado, locationGid) => {
  const stock = Number.isInteger(product.stock) && product.stock >= 0 ? product.stock : 0;
  const variantes = Array.isArray(product.variantes) ? product.variantes : [];
  const tieneVariantes = Boolean(product.tieneVariantes) && variantes.length > 0;

  if (tieneVariantes) {
    const creadas = await ejecutarVariantsBulkCreate(
      config,
      token,
      creado.productGid,
      product,
      locationGid,
    );
    if (!creadas.ok) return creadas;
  } else if (creado.variantGid) {
    const update = await ejecutarVariantsBulkUpdate(
      config,
      token,
      creado.productGid,
      product,
      creado.variantGid,
    );
    if (!update.ok) return update;

    if (creado.inventoryItemGid) {
      const inventario = await ejecutarSetInventario(
        config,
        token,
        creado.inventoryItemGid,
        locationGid,
        stock,
      );
      if (!inventario.ok) return inventario;
    }
  } else {
    const creadas = await ejecutarVariantsBulkCreate(
      config,
      token,
      creado.productGid,
      product,
      locationGid,
    );
    if (!creadas.ok) return creadas;
  }

  return {
    ok: true,
    productId: creado.productId,
    productUrl: creado.productUrl,
  };
};

/** Intenta deshacer el productCreate; si tampoco eso funciona, solo lo avisa. */
const revertirCreacion = async (config, token, creado, fallo) => {
  const errores = Array.isArray(fallo && fallo.errors) ? fallo.errors.slice() : [];
  try {
    await ejecutarProductDelete(config, token, creado.productGid);
    errores.push(
      `Se borró el producto ${creado.productId}, que había quedado creado a medias y sin variantes.`,
    );
  } catch (error) {
    errores.push(
      `No se pudo borrar el producto ${creado.productId} que quedó creado a medias (${mensajeDe(error)}). ` +
        "Bórralo en Shopify antes de reintentar, o te quedarán dos productos iguales.",
    );
  }
  return { ...fallo, ok: false, errors: errores, revertido: true };
};

/**
 * Ejecuta el flujo completo:
 *  - Comprueba que el SKU no exista ya en Shopify; si existe, aborta sin crear
 *    nada.
 *  - productCreate (en el nuevo modelo crea el producto con su variante
 *    "Default Title" automática) -> update de esa variante (precio, SKU, costo,
 *    tracking) + inventorySetQuantities del stock en la ubicación.
 *  - Si tiene variantes: productVariantsBulkCreate con las opciones del producto
 *    y una variante por fila de Dropi (precio, SKU, costo, stock por ubicación),
 *    en lotes de 250 porque la API limita el tamaño de los arrays de entrada.
 *    La estrategia borra la variante "Default Title" que deja productCreate.
 *  - Fallback si productCreate no devolvió variante: productVariantsBulkCreate
 *    (flujo clásico con inventoryQuantities.availableQuantity).
 *  - Si cualquier paso posterior a productCreate falla, el producto se borra para
 *    no dejar un producto sin variantes (y por tanto sin SKU, invisible para la
 *    detección de duplicados).
 */
const crearProductoEnShopify = async (config, token, product, tags, locationGid) => {
  let tokenActual = token;

  // Si el token vence ENTRE pasos se renueva aquí, no devolviendo `unauthorized`:
  // si el orquestador reintentara todo el flujo, productCreate crearía un
  // segundo producto del mismo.
  const ejecutar = async (accion) => {
    try {
      return await accion(tokenActual);
    } catch (error) {
      if (!error || error.status !== 401) throw error;
      tokenActual = await obtenerAccessToken(config, { forzar: true, permitirCacheVencida: false });
      return accion(tokenActual);
    }
  };

  try {
    const duplicado = await ejecutar((t) => buscarDuplicadoPorSku(config, t, product));
    if (duplicado) return duplicado;

    const creado = await ejecutar((t) => ejecutarProductCreate(config, t, product, tags));
    if (!creado.ok) return creado;

    try {
      const resto = await ejecutar((t) =>
        completarCreacion(config, t, product, creado, locationGid),
      );
      if (resto.ok) return resto;
      return await revertirCreacion(config, tokenActual, creado, resto);
    } catch (error) {
      return await revertirCreacion(config, tokenActual, creado, {
        ok: false,
        errors: [mensajeDe(error)],
        unauthorized: error && error.status === 401,
      });
    }
  } catch (error) {
    if (error && error.status === 401) return { ok: false, errors: [mensajeDe(error)], unauthorized: true };
    return { ok: false, errors: [mensajeDe(error)] };
  }
};

/* --------------------------------------------------------------------- *
 * Listar ubicaciones (requiere scope read_locations)
 * --------------------------------------------------------------------- */

const consultarUbicaciones = async (config, token) => {
  try {
    const json = await postGraphql({
      shopDomain: config.shopDomain,
      apiToken: token,
      apiVersion: config.apiVersion,
      query: LOCATIONS_QUERY,
      variables: {},
    });

    const data = json && json.data && json.data.locations;
    const edges = data && Array.isArray(data.edges) ? data.edges : [];
    const locations = edges
      .map((edge) => edge && edge.node)
      .filter((node) => node && node.id)
      .map((node) => ({
        id: String(node.id),
        name: String(node.name || "Sin nombre"),
      }));

    return { ok: true, locations };
  } catch (error) {
    if (error && error.status === 401) return { ok: false, errors: [mensajeDe(error)], unauthorized: true };
    const mensaje = mensajeDe(error);
    const denegado = (error && error.status === 403) || /ACCESS_DENIED/i.test(mensaje);
    if (denegado)
      return {
        ok: false,
        errors: ["ACCESS_DENIED: la app necesita el scope read_locations para listar ubicaciones."],
      };
    return { ok: false, errors: [mensaje] };
  }
};

const listLocations = async (config = {}) => {
  const check = validateConfig(config);
  if (check.errors.length > 0) return { ok: false, errors: check.errors };

  let token;
  try {
    token = await obtenerAccessToken(config);
  } catch (error) {
    return { ok: false, errors: [mensajeDe(error)] };
  }

  let resultado = await consultarUbicaciones(check, token);

  // Si el token venció entre la obtención y la llamada: renovar y reintentar una vez.
  if (resultado.unauthorized) {
    try {
      token = await obtenerAccessToken(config, { forzar: true, permitirCacheVencida: false });
      resultado = await consultarUbicaciones(check, token);
    } catch (error) {
      return { ok: false, errors: [mensajeDe(error)] };
    }
  }

  delete resultado.unauthorized;
  return resultado;
};

/* --------------------------------------------------------------------- *
 * Orquestación de la importación
 * --------------------------------------------------------------------- */

const runImport = async (config = {}, product = null) => {
  const check = validateConfig(config);
  if (check.errors.length > 0) return { ok: false, stage: "validacion", errors: check.errors };

  const productCheck = validateProduct(product);
  if (productCheck.errors.length > 0) return { ok: false, stage: "validacion", errors: productCheck.errors };

  const locationGid = toLocationGid(config.locationId);
  if (!locationGid)
    return { ok: false, stage: "validacion", errors: ["Falta un Location ID válido (número o gid://shopify/Location/…)."] };

  const version = versionToNumber(check.apiVersion);
  if (version != null && version < NEW_MODEL_MIN_VERSION) {
    return {
      ok: false,
      stage: "validacion",
      errors: [
        `La versión ${check.apiVersion} es anterior a 2025-01. Este flujo usa el nuevo modelo de ` +
          "productos (productCreate + productVariantsBulkUpdate); usa al menos 2025-01 (recomendado 2026-07).",
      ],
    };
  }

  const tags = buildTags(product);

  let token;
  try {
    token = await obtenerAccessToken(config);
  } catch (error) {
    return { ok: false, errors: [mensajeDe(error)] };
  }

  let resultado = await crearProductoEnShopify(check, token, product, tags, locationGid);

  // Si el token venció entre la obtención y la llamada: renovar y reintentar una vez.
  if (resultado.unauthorized) {
    try {
      token = await obtenerAccessToken(config, { forzar: true, permitirCacheVencida: false });
      resultado = await crearProductoEnShopify(check, token, product, tags, locationGid);
    } catch (error) {
      return { ok: false, errors: [mensajeDe(error)] };
    }
  }

  delete resultado.unauthorized;
  return resultado;
};

// Arranque: crea la alarma periódica de renovación si aún no existe.
configurarAlarmaRenovacion();