const PREFIJO = 'act_';

/**
 * Quita el prefijo `act_`, espacios y cualquier esquema accidental, dejando
 * únicamente los dígitos del identificador de la cuenta de anuncios.
 * Acepta `act_123`, `ACT_123`, ` 123 ` y `123`.
 */
export function normalizarAdAccountId(valor: string): string {
  const limpio = valor.trim().replace(/^act_/i, '').trim();
  const soloDigitos = limpio.replace(/\D/g, '');
  return soloDigitos;
}

/** Devuelve el identificador listo para la Graph API: `act_123456789`. */
export function formatearAdAccountId(valor: string): string {
  const id = normalizarAdAccountId(valor);
  return id ? `${PREFIJO}${id}` : '';
}

/** Valida que el valor sea una cuenta de anuncios plausible (solo dígitos). */
export function esAdAccountIdValido(valor: string): boolean {
  return /^\d{6,20}$/.test(normalizarAdAccountId(valor));
}
