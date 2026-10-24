import { apiRequest } from "@/lib/api";

export type ProveedorWhatsapp = "EVOLUTION_BAILEYS" | "WHATSAPP_CLOUD";
export type EstadoInstanciaWhatsapp =
  | "DESCONECTADA"
  | "CONECTANDO"
  | "QR"
  | "CONECTADA"
  | "ERROR";
export type EstadoConversacion =
  | "ABIERTA"
  | "PENDIENTE"
  | "CERRADA";
export type ModoConversacion = "IA" | "HUMANO" | "PAUSADA";
export type EtapaConversacion =
  | "NUEVO"
  | "INTERESADO"
  | "COTIZANDO"
  | "DATOS"
  | "CONFIRMADO"
  | "PEDIDO_CREADO"
  | "PERDIDO";
export type DireccionMensaje = "ENTRANTE" | "SALIENTE";
export type OrigenMensaje = "CLIENTE" | "IA" | "AGENTE" | "SISTEMA";
export type TipoMensaje =
  | "TEXTO"
  | "IMAGEN"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENTO"
  | "UBICACION"
  | "OTRO";
export type EstadoMensaje =
  | "PENDIENTE"
  | "ENVIADO"
  | "ENTREGADO"
  | "LEIDO"
  | "FALLIDO";

export interface IntegracionWhatsapp {
  id_integracion: number;
  plataforma: "WHATSAPP";
  etiqueta: string;
  api_key_enmascarada: string;
  config: Record<string, string> | null;
  activo: boolean;
  fecha_creacion: string;
  ultima_prueba_ok: boolean | null;
  mensaje_ultima_prueba: string | null;
  fecha_ultima_prueba: string | null;
}

export interface EntornoWhatsapp {
  configurado: boolean;
  base_url: string;
}

export interface ConfiguracionWhatsappRespuesta {
  configuracion: IntegracionWhatsapp | null;
  entorno: EntornoWhatsapp;
}

export interface ResultadoPrueba {
  ok: boolean;
  mensaje: string;
}

export interface WhatsappInstancia {
  id_instancia: number;
  nombre: string;
  proveedor: ProveedorWhatsapp;
  id_integracion: number | null;
  estado: EstadoInstanciaWhatsapp;
  numero: string | null;
  qr_base64: string | null;
  qr_code: string | null;
  qr_expira_at: string | null;
  webhook_url: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ContactoWhatsapp {
  id_contacto: number;
  telefono_e164: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  documento: string | null;
  direccion: string | null;
  departamento_id: string | null;
  municipio_id: string | null;
  notas: string | null;
}

export interface InstanciaResumen {
  id_instancia: number;
  nombre: string;
  proveedor: ProveedorWhatsapp;
  estado: EstadoInstanciaWhatsapp;
  numero: string | null;
}

export interface MensajeWhatsapp {
  id_mensaje: number;
  id_conversacion: number;
  wa_message_id: string | null;
  direccion: DireccionMensaje;
  origen: OrigenMensaje;
  tipo: TipoMensaje;
  contenido: string | null;
  media_url: string | null;
  metadata: Record<string, unknown> | null;
  estado: EstadoMensaje;
  fecha_creacion: string;
  es_entrante: boolean;
}

export interface ConversacionWhatsapp {
  id_conversacion: number;
  estado: EstadoConversacion;
  modo: ModoConversacion;
  etapa: EtapaConversacion;
  asignado_a: number | null;
  no_leidos: number;
  resumen_ia: string | null;
  ultimo_mensaje_at: string | null;
  id_pedido_shopify: string | null;
  numero_pedido: string | null;
  fecha_creacion: string;
  contacto: ContactoWhatsapp;
  instancia: InstanciaResumen;
  ultimo_mensaje: MensajeWhatsapp | null;
}

export interface PaginaConversaciones {
  conversaciones: ConversacionWhatsapp[];
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
}

export interface PaginaMensajes {
  mensajes: MensajeWhatsapp[];
  tiene_mas: boolean;
  siguiente_antes_de: number | null;
}

export interface GuardarConfiguracionWhatsappInput {
  base_url: string;
  api_key?: string;
  etiqueta?: string;
}

export interface CrearInstanciaWhatsappInput {
  nombre?: string;
  numero?: string;
}

export interface FiltrosConversaciones {
  estado?: EstadoConversacion;
  etapa?: EtapaConversacion;
  modo?: ModoConversacion;
  id_instancia?: number;
  solo_no_leidos?: boolean;
  buscar?: string;
  pagina?: number;
  por_pagina?: number;
}

export interface ActualizarConversacionInput {
  estado?: EstadoConversacion;
  modo?: ModoConversacion;
  etapa?: EtapaConversacion;
  asignado_a?: number | null;
}

export interface ActualizarContactoWhatsappInput {
  nombre?: string;
  apellido?: string;
  email?: string;
  documento?: string;
  direccion?: string;
  departamento_id?: string;
  municipio_id?: string;
  notas?: string;
}

export async function obtenerConfiguracionWhatsapp(): Promise<ConfiguracionWhatsappRespuesta> {
  return apiRequest<ConfiguracionWhatsappRespuesta>("/whatsapp/configuracion");
}

export async function guardarConfiguracionWhatsapp(
  input: GuardarConfiguracionWhatsappInput,
): Promise<ConfiguracionWhatsappRespuesta> {
  return apiRequest<ConfiguracionWhatsappRespuesta>("/whatsapp/configuracion", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function probarConfiguracionWhatsapp(): Promise<ResultadoPrueba> {
  return apiRequest<ResultadoPrueba>("/whatsapp/configuracion/probar", {
    method: "POST",
  });
}

export async function listarInstanciasWhatsapp(): Promise<WhatsappInstancia[]> {
  const data = await apiRequest<{ instancias: WhatsappInstancia[] }>(
    "/whatsapp/instancias",
  );
  return data.instancias;
}

export async function crearInstanciaWhatsapp(
  input: CrearInstanciaWhatsappInput,
): Promise<WhatsappInstancia> {
  const data = await apiRequest<{ instancia: WhatsappInstancia }>(
    "/whatsapp/instancias",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.instancia;
}

export async function conectarInstanciaWhatsapp(
  id: number,
): Promise<WhatsappInstancia> {
  const data = await apiRequest<{ instancia: WhatsappInstancia }>(
    `/whatsapp/instancias/${id}/conectar`,
    { method: "POST" },
  );
  return data.instancia;
}

export async function consultarEstadoInstanciaWhatsapp(
  id: number,
): Promise<WhatsappInstancia> {
  const data = await apiRequest<{ instancia: WhatsappInstancia }>(
    `/whatsapp/instancias/${id}/estado`,
  );
  return data.instancia;
}

export async function desconectarInstanciaWhatsapp(
  id: number,
): Promise<WhatsappInstancia> {
  const data = await apiRequest<{ instancia: WhatsappInstancia }>(
    `/whatsapp/instancias/${id}/desconectar`,
    { method: "POST" },
  );
  return data.instancia;
}

export async function eliminarInstanciaWhatsapp(id: number): Promise<void> {
  await apiRequest(`/whatsapp/instancias/${id}`, { method: "DELETE" });
}

export async function listarConversacionesWhatsapp(
  filtros: FiltrosConversaciones = {},
): Promise<PaginaConversaciones> {
  const params = new URLSearchParams();
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.etapa) params.set("etapa", filtros.etapa);
  if (filtros.modo) params.set("modo", filtros.modo);
  if (filtros.id_instancia) {
    params.set("id_instancia", String(filtros.id_instancia));
  }
  if (filtros.solo_no_leidos) params.set("solo_no_leidos", "true");
  if (filtros.buscar?.trim()) params.set("buscar", filtros.buscar.trim());
  if (filtros.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros.por_pagina) {
    params.set("por_pagina", String(filtros.por_pagina));
  }

  const query = params.toString();
  return apiRequest<PaginaConversaciones>(
    `/whatsapp/conversaciones${query ? `?${query}` : ""}`,
  );
}

export async function obtenerConversacionWhatsapp(
  id: number,
): Promise<ConversacionWhatsapp> {
  const data = await apiRequest<{ conversacion: ConversacionWhatsapp }>(
    `/whatsapp/conversaciones/${id}`,
  );
  return data.conversacion;
}

export async function listarMensajesWhatsapp(
  idConversacion: number,
  antesDe?: number,
  limite = 50,
): Promise<PaginaMensajes> {
  const params = new URLSearchParams({ limite: String(limite) });
  if (antesDe) params.set("antes_de", String(antesDe));
  return apiRequest<PaginaMensajes>(
    `/whatsapp/conversaciones/${idConversacion}/mensajes?${params.toString()}`,
  );
}

export async function enviarMensajeWhatsapp(
  idConversacion: number,
  contenido: string,
  responderA?: string,
): Promise<MensajeWhatsapp> {
  const data = await apiRequest<{ mensaje: MensajeWhatsapp }>(
    `/whatsapp/conversaciones/${idConversacion}/mensajes`,
    {
      method: "POST",
      body: JSON.stringify({ contenido, responder_a: responderA }),
    },
  );
  return data.mensaje;
}

export async function enviarMediaWhatsapp(
  idConversacion: number,
  archivo: {
    tipo: Extract<TipoMensaje, "IMAGEN" | "AUDIO" | "VIDEO" | "DOCUMENTO">;
    media_data: string;
    mime_type: string;
    nombre_archivo?: string;
    contenido?: string;
    responder_a?: string;
  },
): Promise<MensajeWhatsapp> {
  const data = await apiRequest<{ mensaje: MensajeWhatsapp }>(
    `/whatsapp/conversaciones/${idConversacion}/mensajes`,
    {
      method: "POST",
      body: JSON.stringify(archivo),
    },
  );
  return data.mensaje;
}

export async function marcarConversacionLeida(
  idConversacion: number,
): Promise<ConversacionWhatsapp> {
  const data = await apiRequest<{ conversacion: ConversacionWhatsapp }>(
    `/whatsapp/conversaciones/${idConversacion}/leido`,
    { method: "PATCH" },
  );
  return data.conversacion;
}

export async function actualizarConversacionWhatsapp(
  idConversacion: number,
  cambios: ActualizarConversacionInput,
): Promise<ConversacionWhatsapp> {
  const data = await apiRequest<{ conversacion: ConversacionWhatsapp }>(
    `/whatsapp/conversaciones/${idConversacion}`,
    {
      method: "PATCH",
      body: JSON.stringify(cambios),
    },
  );
  return data.conversacion;
}

export async function actualizarContactoWhatsapp(
  idContacto: number,
  cambios: ActualizarContactoWhatsappInput,
): Promise<ContactoWhatsapp> {
  const data = await apiRequest<{ contacto: ContactoWhatsapp }>(
    `/whatsapp/contactos/${idContacto}`,
    {
      method: "PATCH",
      body: JSON.stringify(cambios),
    },
  );
  return data.contacto;
}
