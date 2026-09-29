import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const VERSION = 'aesgcm';

function derivarClave(secreto: string): Buffer {
  return createHash('sha256').update(secreto).digest();
}

export function cifrarApiKey(secreto: string, valor: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derivarClave(secreto), iv);
  const cifrado = Buffer.concat([cipher.update(valor, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    cifrado.toString('base64url'),
  ].join('.');
}

export function descifrarApiKey(secreto: string, valor: string): string {
  const [version, iv, tag, cifrado] = valor.split('.');
  if (version !== VERSION || !iv || !tag || !cifrado) {
    throw new Error('Formato de clave cifrada inválido.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    derivarClave(secreto),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(cifrado, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function enmascararApiKey(valor: string): string {
  if (!valor) return 'Sin clave';
  if (valor.length <= 8) return '•'.repeat(valor.length);
  return `${valor.slice(0, 8)}……${valor.slice(-4)}`;
}
