import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { normalizarShopHost } from './util/normalizar-shop';

const TIEMPO_ESPERA_MS = 10000;

@Injectable()
export class ShopifyAuthService {
  async obtenerTokenClientCredentials(
    shop: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{
    access_token: string;
    scope?: string;
    expires_in?: number;
  }> {
    const shopHost = normalizarShopHost(shop);
    const url = `https://${shopHost}/admin/oauth/access_token`;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const controlador = new AbortController();
    const temporizador = setTimeout(
      () => controlador.abort(),
      TIEMPO_ESPERA_MS,
    );

    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params,
        signal: controlador.signal,
      });

      const texto = await respuesta.text();
      let cuerpo: unknown = null;
      try {
        cuerpo = texto ? (JSON.parse(texto) as unknown) : null;
      } catch {
        cuerpo = null;
      }

      if (respuesta.ok && esBodyObjeto(cuerpo)) {
        const registro = cuerpo;
        const token = registro.access_token;
        if (typeof token === 'string' && token) {
          return {
            access_token: token,
            scope:
              typeof registro.scope === 'string' ? registro.scope : undefined,
            expires_in:
              typeof registro.expires_in === 'number'
                ? registro.expires_in
                : undefined,
          };
        }
        throw new BadRequestException(
          'Shopify no devolvió un access_token en la respuesta.',
        );
      }

      throw new BadRequestException(
        this.mensajeErrorOAuth(cuerpo, texto, respuesta.status),
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException(
        'No se pudo contactar el endpoint de OAuth de Shopify (sin respuesta o tiempo agotado).',
      );
    } finally {
      clearTimeout(temporizador);
    }
  }

  private mensajeErrorOAuth(
    cuerpo: unknown,
    texto: string,
    status: number,
  ): string {
    let codigo = '';
    if (esBodyObjeto(cuerpo)) {
      const registro = cuerpo;
      if (typeof registro.error === 'string') codigo = registro.error;
    }
    if (!codigo) {
      const coincidencia = texto.match(/Oauth error\s+([A-Za-z_]+)/);
      if (coincidencia) codigo = coincidencia[1];
    }

    const textoError = (
      texto.includes('client secret') ? 'client secret' : ''
    ).toLowerCase();
    const detalle = textoError || codigo.toLowerCase();

    if (codigo.toLowerCase() === 'application_cannot_be_found') {
      return 'No se encontró la app de Shopify con ese Client ID en esa tienda. La app debe existir y pertenecer a tu organización (Dev Dashboard).';
    }
    if (codigo.toLowerCase() === 'shop_not_permitted') {
      return 'La app no puede usar Client Credentials en esta tienda. Instala una app de tu organización en la tienda antes de conectar.';
    }
    if (
      codigo.toLowerCase() === 'invalid_request' ||
      detalle.includes('client secret')
    ) {
      return 'Credenciales inválidas: revisa el Client ID y el Client Secret (mal copiados o rotados).';
    }
    return `Shopify rechazó las credenciales${codigo ? ` (${codigo})` : ` (HTTP ${status})`}. Verifica los datos e inténtalo de nuevo.`;
  }
}

function esBodyObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}
