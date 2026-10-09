import type { PlataformaIntegracion } from "@/lib/types";

export const PLATAFORMA_INTEGRACION_LABEL: Record<PlataformaIntegracion, string> = {
  META_ADS: "Meta Ads",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp Business",
  SHOPIFY: "Shopify",
  SERVIENTREGA: "Servientrega",
  INTER_RAPIDISIMO: "Inter Rapidísimo",
  COORDINADORA: "Coordinadora",
  ENVIA: "Envía",
};

export const PLATAFORMA_INTEGRACION_OPCIONES = Object.entries(
  PLATAFORMA_INTEGRACION_LABEL,
) as [PlataformaIntegracion, string][];