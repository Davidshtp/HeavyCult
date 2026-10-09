import { Injectable, Logger } from '@nestjs/common';
import { SHOPIFY_API_VERSION } from '../../config/constants';
import { normalizarShopHost } from '../common/util/normalizar-shop';

const TIEMPO_ESPERA_MS = 10000;

/** Puntos de GraphQL por debajo de los cuales avisamos por log. */
const UMBRAL_THROTTLE = 300;

export interface ResultadoGraphql<T> {
  ok: boolean;
  mensaje: string;
  datos: T | null;
  /** GraphQL devuelve 200 aunque la consulta haya fallado; esto marca el 401 real. */
  status?: number;
}

@Injectable()
export class ShopifyGraphqlService {
  private readonly logger = new Logger(ShopifyGraphqlService.name);

  async ejecutar<T>(
    token: string,
    shop: string,
    query: string,
    variables: Record<string, unknown> = {},
    etiqueta = 'consulta',
  ): Promise<ResultadoGraphql<T>> {
    const shopHost = normalizarShopHost(shop);
    const url = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    const controlador = new AbortController();
    const temporizador = setTimeout(
      () => controlador.abort(),
      TIEMPO_ESPERA_MS,
    );

    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controlador.signal,
      });

      if (respuesta.status === 401) {
        return {
          ok: false,
          status: 401,
          mensaje:
            'El token de Shopify fue rechazado (401). Se intentó renovar automáticamente.',
          datos: null,
        };
      }
      if (respuesta.status === 429) {
        return {
          ok: false,
          mensaje:
            'Shopify rechazó la petición por límite de uso (HTTP 429). Intentá de nuevo en un momento.',
          datos: null,
        };
      }

      const cuerpo: unknown = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        return {
          ok: false,
          status: respuesta.status,
          mensaje: `Shopify respondió con un error (HTTP ${respuesta.status}).`,
          datos: null,
        };
      }

      this.avisarThrottle(cuerpo, etiqueta);

      const envelope = cuerpo as {
        data?: unknown;
        errors?: unknown;
      } | null;

      // GraphQL devuelve HTTP 200 aunque `errors` venga poblado, y los errores
      // de negocio llegan mezclados con `data` parcial. Por eso el `ok` sale
      // del primer error, no del status.
      if (Array.isArray(envelope?.errors) && envelope.errors.length > 0) {
        const detalle = this.resumirErrores(envelope.errors);
        this.logger.warn(`GraphQL de Shopify falló (${etiqueta}): ${detalle}`);
        return { ok: false, mensaje: detalle, datos: null };
      }

      return {
        ok: true,
        mensaje: 'ok',
        datos: (envelope?.data ?? null) as T | null,
      };
    } catch {
      return {
        ok: false,
        mensaje:
          'No se pudo contactar la API de Shopify (sin respuesta o tiempo agotado).',
        datos: null,
      };
    } finally {
      clearTimeout(temporizador);
    }
  }

  private resumirErrores(errores: unknown[]): string {
    const partes: string[] = [];
    for (const error of errores.slice(0, 3)) {
      if (!error || typeof error !== 'object') continue;
      const registro = error as Record<string, unknown>;
      const mensaje =
        typeof registro['message'] === 'string' ? registro['message'] : null;
      if (!mensaje) continue;
      const ruta = Array.isArray(registro['path'])
        ? registro['path'].join('.')
        : null;
      partes.push(ruta ? `${mensaje} (en ${ruta})` : mensaje);
    }
    return partes.length > 0
      ? partes.join(' | ')
      : 'Shopify devolvió un error sin detalle.';
  }

  private avisarThrottle(cuerpo: unknown, etiqueta: string): void {
    if (!cuerpo || typeof cuerpo !== 'object') return;
    const extensiones = (cuerpo as Record<string, unknown>)['extensions'];
    if (!extensiones || typeof extensiones !== 'object') return;
    const costo = (extensiones as Record<string, unknown>)['cost'];
    if (!costo || typeof costo !== 'object') return;
    const throttle = (costo as Record<string, unknown>)['throttleStatus'];
    if (!throttle || typeof throttle !== 'object') return;
    const disponibles = (throttle as Record<string, unknown>)[
      'currentlyAvailable'
    ];
    if (typeof disponibles !== 'number') return;
    if (disponibles >= UMBRAL_THROTTLE) return;

    const maximo = (throttle as Record<string, unknown>)['maximumAvailable'];
    const tope = typeof maximo === 'number' ? maximo : '?';
    this.logger.warn(
      `Cupo de GraphQL de Shopify bajo: ${disponibles} de ${tope} puntos disponibles (${etiqueta}).`,
    );
  }
}
