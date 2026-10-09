import { Injectable } from '@nestjs/common';
import { SHOPIFY_API_VERSION } from '../../config/constants';
import {
  TIEMPO_ESPERA_MS,
  extraerCampo,
  extraerDetalleError,
} from '../common/shopify-http';
import { normalizarShopHost } from '../common/util/normalizar-shop';

export interface ResultadoPrueba {
  ok: boolean;
  mensaje: string;
}

/**
 * Prueba de conexión contra la API REST de Shopify (`shop.json`): es lo que se
 * ejecuta al conectar la tienda desde Configuración → Integraciones.
 */
@Injectable()
export class ShopifyTiendaService {
  async probarConexionConShop(
    token: string,
    shop: string,
  ): Promise<ResultadoPrueba> {
    const shopHost = normalizarShopHost(shop);
    return this.probarConexionEn(
      token,
      `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
      shopHost,
    );
  }

  private async probarConexionEn(
    token: string,
    url: string,
    tienda: string,
  ): Promise<ResultadoPrueba> {
    const controlador = new AbortController();
    const temporizador = setTimeout(
      () => controlador.abort(),
      TIEMPO_ESPERA_MS,
    );

    try {
      const respuesta = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': token,
          Accept: 'application/json',
        },
        signal: controlador.signal,
      });
      const cuerpo: unknown = await respuesta.json().catch(() => null);

      if (respuesta.ok) {
        const shopObj =
          cuerpo && typeof cuerpo === 'object'
            ? (cuerpo as Record<string, unknown>).shop
            : null;
        const nombre = extraerCampo(shopObj, 'name');
        return {
          ok: true,
          mensaje: `Conexión verificada con Shopify${nombre ? ` (${nombre})` : ''}.`,
        };
      }

      const detalle = extraerDetalleError(cuerpo);

      if (respuesta.status === 401) {
        return {
          ok: false,
          mensaje:
            'El token de Shopify fue rechazado (401). Regenera el token en Configuración → Apps → Desarrollar apps.',
        };
      }
      if (respuesta.status === 403) {
        return {
          ok: false,
          mensaje:
            'El token es válido pero la app no tiene los scopes necesarios. Verifica los scopes de Admin API en la app de Shopify.',
        };
      }
      if (respuesta.status === 404) {
        return {
          ok: false,
          mensaje: `No se encontró la tienda Shopify (${tienda}).`,
        };
      }
      if (respuesta.status === 429) {
        return {
          ok: false,
          mensaje:
            'Shopify rechazó la petición por límite de uso (HTTP 429). Intenta nuevamente en un momento.',
        };
      }

      return {
        ok: false,
        mensaje: `Shopify respondió con un error (HTTP ${respuesta.status})${detalle ? `: ${detalle}` : '.'}`,
      };
    } catch {
      return {
        ok: false,
        mensaje:
          'No se pudo contactar la API de Shopify (sin respuesta o tiempo agotado).',
      };
    } finally {
      clearTimeout(temporizador);
    }
  }
}
