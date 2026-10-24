export interface TelefonoWhatsapp {
  /** Número en formato E.164 sin espacios, por ejemplo +573001234567. */
  telefono: string;
  /** Identificador de WhatsApp sin el signo +. */
  waId: string;
  /** JID original del que se obtuvo el número. */
  jid: string;
}

const DOMINIOS_IGNORADOS = ['@g.us', '@broadcast', '@newsletter'];

const LARGO_MINIMO = 10;
const LARGO_MAXIMO = 15;

function esJidIgnorado(jid: string): boolean {
  return DOMINIOS_IGNORADOS.some((dominio) => jid.endsWith(dominio));
}

function extraerDigitos(jid: string | null | undefined): string | null {
  if (!jid) return null;

  const valor = jid.trim();
  if (!valor || esJidIgnorado(valor)) return null;

  const [usuario] = valor.split('@');
  const sinDispositivo = usuario.split(':')[0] ?? '';
  const digitos = sinDispositivo.replace(/\D/g, '');

  if (digitos.length < LARGO_MINIMO || digitos.length > LARGO_MAXIMO) {
    return null;
  }
  return digitos;
}

/**
 * WhatsApp puede entregar el número en `remoteJid` o, para identificadores
 * `@lid`, en `remoteJidAlt`. Se prueban ambos y se descartan grupos,
 * canales y estados.
 */
export function normalizarTelefono(
  jid: string | null | undefined,
  alternativo?: string | null,
): TelefonoWhatsapp | null {
  const candidatos: Array<string | null | undefined> = [];
  if (jid && !jid.includes('@lid')) candidatos.push(jid);
  if (alternativo) candidatos.push(alternativo);
  if (jid && jid.includes('@lid')) candidatos.push(jid);

  for (const candidato of candidatos) {
    const digitos = extraerDigitos(candidato);
    if (!digitos) continue;
    return {
      telefono: `+${digitos}`,
      waId: digitos,
      jid: candidato?.trim() ?? digitos,
    };
  }
  return null;
}

/** Limpia un número escrito por un agente antes de enviarlo a Evolution. */
export function normalizarNumeroEnvio(
  numero: string | null | undefined,
): string | null {
  if (!numero) return null;
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < LARGO_MINIMO || digitos.length > LARGO_MAXIMO) {
    return null;
  }
  return digitos;
}
