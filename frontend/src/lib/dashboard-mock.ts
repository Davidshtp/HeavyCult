import type { DropiProducto, Integracion, PlataformaIntegracion, Producto } from "@/lib/types";

export const PLATAFORMA_INTEGRACION_LABEL: Record<PlataformaIntegracion, string> = {
  META_ADS: "Meta Ads",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp Business",
  DROPI: "Dropi",
  SERVIENTREGA: "Servientrega",
  INTER_RAPIDISIMO: "Inter Rapidísimo",
  COORDINADORA: "Coordinadora",
  ENVIA: "Envía",
};

export const PLATAFORMA_INTEGRACION_OPCIONES = Object.entries(
  PLATAFORMA_INTEGRACION_LABEL,
) as [PlataformaIntegracion, string][];

export function enmascararApiKey(clave: string): string {
  if (!clave) return "Sin clave";
  if (clave.length <= 8) return "•".repeat(clave.length);
  return `••••••••${clave.slice(-4)}`;
}

export const MOCK_INTEGRACIONES: Integracion[] = [
  {
    id_integracion: 1,
    plataforma: "META_ADS",
    etiqueta: "Cuenta principal · Pixel HC",
    api_key_enmascarada: "••••••••9f3K",
    config: { id_cuenta: "act_2910483721", pixel: "8491023" },
    activo: true,
    fecha_creacion: "2026-01-14T09:30:00.000Z",
  },
  {
    id_integracion: 2,
    plataforma: "DROPI",
    etiqueta: "Tienda principal",
    api_key_enmascarada: "••••••••c71X",
    config: { tienda: "heavycult-oficial" },
    activo: true,
    fecha_creacion: "2026-02-02T14:05:00.000Z",
  },
  {
    id_integracion: 3,
    plataforma: "TIKTOK",
    etiqueta: "Cuenta TTS · @heavy.cult",
    api_key_enmascarada: "••••••••4b2Q",
    config: { id_anunciante: "7264839201" },
    activo: false,
    fecha_creacion: "2026-02-21T11:18:00.000Z",
  },
  {
    id_integracion: 4,
    plataforma: "WHATSAPP",
    etiqueta: "API WhatsApp · número ventas",
    api_key_enmascarada: "••••••••1d8P",
    config: { numero: "573001234567" },
    activo: true,
    fecha_creacion: "2026-03-10T16:40:00.000Z",
  },
  {
    id_integracion: 5,
    plataforma: "INTER_RAPIDISIMO",
    etiqueta: "Flete nacional",
    api_key_enmascarada: "••••••••7a2N",
    config: { usuario: "HC_VENTAS" },
    activo: true,
    fecha_creacion: "2026-04-05T08:12:00.000Z",
  },
];

export const MOCK_PRODUCTOS: Producto[] = [
  {
    id_producto: 1,
    sku_dropi: "DP-HC-001",
    nombre: "Hoodie Oversize 'Neón Cult'",
    descripcion: "Hoodie unisex algodón 400 g, corte oversize, estampa neón.",
    precio_venta: 149900,
    costo: 68900,
    stock: 42,
    tallas: ["S", "M", "L", "XL"],
    url_imagen: null,
    estado: "ACTIVO",
    fecha_creacion: "2026-05-02T10:00:00.000Z",
  },
  {
    id_producto: 2,
    sku_dropi: "DP-HC-002",
    nombre: "Gorra Trucker 'HeavyFit'",
    descripcion: "Gorra trucker ajustable, bordado lateral.",
    precio_venta: 54900,
    costo: 21800,
    stock: 128,
    tallas: ["Única"],
    url_imagen: null,
    estado: "ACTIVO",
    fecha_creacion: "2026-05-09T10:00:00.000Z",
  },
  {
    id_producto: 3,
    sku_dropi: "DP-HC-003",
    nombre: "Termo 750ml 'Dark Code'",
    descripcion: "Termo térmico acero inoxidable, tapa hermética.",
    precio_venta: 64900,
    costo: 29700,
    stock: 7,
    tallas: ["Única"],
    url_imagen: null,
    estado: "ACTIVO",
    fecha_creacion: "2026-05-16T10:00:00.000Z",
  },
  {
    id_producto: 4,
    sku_dropi: "DP-HC-004",
    nombre: "Tote Bag 'Cult Copy'",
    descripcion: "Tote de lona 24x33 cm, estampado serigráfico.",
    precio_venta: 39000,
    costo: 15300,
    stock: 0,
    tallas: ["Única"],
    url_imagen: null,
    estado: "INACTIVO",
    fecha_creacion: "2026-05-23T10:00:00.000Z",
  },
  {
    id_producto: 5,
    sku_dropi: "DP-HC-005",
    nombre: "Sudadera Zip 'Static'",
    descripcion: "Sudadera con cremallera, bolsillos laterales, tejido fleece.",
    precio_venta: 129900,
    costo: 60400,
    stock: 23,
    tallas: ["M", "L", "XL"],
    url_imagen: null,
    estado: "ACTIVO",
    fecha_creacion: "2026-06-01T10:00:00.000Z",
  },
  {
    id_producto: 6,
    sku_dropi: "DP-HC-006",
    nombre: "Camiseta 'Base Cult'",
    descripcion: "Camiseta 100% algodón 180 g, corte regular.",
    precio_venta: 44900,
    costo: 18700,
    stock: 61,
    tallas: ["S", "M", "L", "XL", "XXL"],
    url_imagen: null,
    estado: "ACTIVO",
    fecha_creacion: "2026-06-12T10:00:00.000Z",
  },
];

// ------------------------------------------------------------------- Dropi
// Registro simulado del catálogo externo de Dropi. Cuando se conecte el
// backend, `buscarProductoDropi` hará la llamada real a Dropi con la API key.
export const MOCK_DROPI_REGISTRO: DropiProducto[] = [
  ...MOCK_PRODUCTOS.filter((p) => p.sku_dropi).map((p) => ({
    sku: p.sku_dropi!,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio_venta: p.precio_venta,
    costo: p.costo,
    stock: p.stock,
    tallas: p.tallas,
    url_imagen: p.url_imagen,
  })),
  {
    sku: "DP-EXT-001",
    nombre: "Gorra Snapback 'SteelFit'",
    descripcion: "Snapback ajustable, bordado en relieve, visera recta.",
    precio_venta: 59900,
    costo: 24700,
    stock: 84,
    tallas: ["Única"],
    url_imagen: null,
  },
  {
    sku: "DP-EXT-002",
    nombre: "Buzo Cortavientos 'NightRun'",
    descripcion: "Chaqueta cortavientos impermeable, diseño técnico urbano.",
    precio_venta: 139900,
    costo: 67200,
    stock: 36,
    tallas: ["S", "M", "L", "XL"],
    url_imagen: null,
  },
  {
    sku: "DP-EXT-003",
    nombre: "Medias Cortas 'Grid Pack'",
    descripcion: "Pack 3 pares de medias algodón peinado, patrón grid.",
    precio_venta: 34900,
    costo: 13400,
    stock: 210,
    tallas: ["Única"],
    url_imagen: null,
  },
];

const NOMBRES_SINTETICOS = [
  "Hoodie Urban 'Base'",
  "Tenis Runner Ligero",
  "Botella Térmica 750ml",
  "Camiseta Oversize 'Loose'",
  "Pantalón Cargo 'Field'",
  "Gorro Beanie 'Winter'",
  "Lentes Deportivos UV",
  "Cargador Turbo 45W",
];

const TALLAS_SINTETICAS = ["S", "M", "L", "XL"];

// Respuesta determinista para SKUs "DP-…" que no están en el registro, así la
// maquetación siempre puede demostrar el flujo de búsqueda.
export function generarProductoDropiSintetico(sku: string): Omit<DropiProducto, "sku"> {
  let hash = 0;
  for (const ch of sku) hash = (hash + ch.charCodeAt(0)) % 9973;
  const precio = 39900 + (hash % 115) * 1000;
  return {
    nombre: NOMBRES_SINTETICOS[hash % NOMBRES_SINTETICOS.length],
    descripcion: `Producto sincronizado desde Dropi (SKU ${sku}). Datos de maquetación.`,
    precio_venta: precio,
    costo: Math.round(precio * 0.42),
    stock: hash % 90,
    tallas: [...TALLAS_SINTETICAS],
    url_imagen: null,
  };
}