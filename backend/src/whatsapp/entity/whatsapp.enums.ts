export enum ProveedorWhatsapp {
  EVOLUTION_BAILEYS = 'EVOLUTION_BAILEYS',
  WHATSAPP_CLOUD = 'WHATSAPP_CLOUD',
}

export enum EstadoInstanciaWhatsapp {
  DESCONECTADA = 'DESCONECTADA',
  CONECTANDO = 'CONECTANDO',
  QR = 'QR',
  CONECTADA = 'CONECTADA',
  ERROR = 'ERROR',
}

export enum OrigenContacto {
  ORGANICO = 'ORGANICO',
  ANUNCIO = 'ANUNCIO',
  IMPORTADO = 'IMPORTADO',
}

export enum EstadoConversacion {
  ABIERTA = 'ABIERTA',
  PENDIENTE = 'PENDIENTE',
  CERRADA = 'CERRADA',
}

export enum ModoConversacion {
  IA = 'IA',
  HUMANO = 'HUMANO',
  PAUSADA = 'PAUSADA',
}

export enum EtapaConversacion {
  NUEVO = 'NUEVO',
  INTERESADO = 'INTERESADO',
  COTIZANDO = 'COTIZANDO',
  DATOS = 'DATOS',
  CONFIRMADO = 'CONFIRMADO',
  PEDIDO_CREADO = 'PEDIDO_CREADO',
  PERDIDO = 'PERDIDO',
}

export enum DireccionMensaje {
  ENTRANTE = 'ENTRANTE',
  SALIENTE = 'SALIENTE',
}

export enum OrigenMensaje {
  CLIENTE = 'CLIENTE',
  IA = 'IA',
  AGENTE = 'AGENTE',
  SISTEMA = 'SISTEMA',
}

export enum TipoMensaje {
  TEXTO = 'TEXTO',
  IMAGEN = 'IMAGEN',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENTO = 'DOCUMENTO',
  UBICACION = 'UBICACION',
  OTRO = 'OTRO',
}

export enum EstadoMensaje {
  PENDIENTE = 'PENDIENTE',
  ENVIADO = 'ENVIADO',
  ENTREGADO = 'ENTREGADO',
  LEIDO = 'LEIDO',
  FALLIDO = 'FALLIDO',
}

export enum EstadoEventoWhatsapp {
  PENDIENTE = 'PENDIENTE',
  PROCESANDO = 'PROCESANDO',
  PROCESADO = 'PROCESADO',
  FALLIDO = 'FALLIDO',
}
