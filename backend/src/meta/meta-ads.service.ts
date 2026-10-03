import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { META_GRAPH_BASE_URL } from '../config/constants';
import {
  formatearAdAccountId,
  normalizarAdAccountId,
} from './util/normalizar-ad-account';

const META_TIMEOUT_MS = 10_000;
const BASE_URL_POR_DEFECTO = 'https://graph.facebook.com/v26.0';

const CAMPOS_CUENTA_ANUNCIOS = [
  'id',
  'name',
  'account_status',
  'currency',
  'timezone_name',
].join(',');

/**
 * `read_insights` ya no es un scope standalone válido: quedó reducido a
 * métricas de Páginas/apps, y para leer Insights de anuncios alcanza con
 * `ads_read` (docs de Ads Insights API). Pedirlo hoy hace fallar el OAuth.
 */
const SCOPES_RECOMENDADOS = [
  'ads_read',
  'ads_management',
  'business_management',
];

/**
 * `account_status` de la cuenta de anuncios. Solo 1, 8 y 9 permiten pautaear;
 * el resto son estados intermedios, de pago o de cierre.
 * https://developers.facebook.com/docs/marketing-api/reference/ad-account/
 */
const MOTIVOS_ESTADO_CUENTA: Record<number, string> = {
  2: 'deshabilitada por Meta',
  3: 'con pagos sin liquidar',
  7: 'en revisión de riesgo',
  100: 'pendiente de cierre',
  101: 'cerrada',
  201: 'activa pero sin confirmar',
  202: 'cerrada',
};

const ESTADOS_OPERABLES = new Set([1, 8, 9]);

export interface CredencialesMetaAds {
  appId: string;
  appSecret: string;
  accessToken: string;
  adAccountId: string;
}

export interface ResultadoPruebaMeta {
  ok: boolean;
  mensaje: string;
}

/** La consulta a la cuenta devuelve datos sueltos: el mensaje al usuario es corto
 * y no necesita la descripción de la cuenta (la card ya la muestra). */
interface ResultadoConsultaCuenta {
  ok: boolean;
  mensaje: string;
  /** false cuando Meta impide pautaear en esa cuenta. */
  operable: boolean;
  /** Motivo legible de por qué no es operable. */
  motivo: string | null;
  detalle: string;
}

interface DetalleErrorGraph {
  codigo: number | null;
  subcodigo: number | null;
  mensaje: string;
}

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string {
    const configurada = this.configService.get<string>(META_GRAPH_BASE_URL);
    return (configurada?.trim() || BASE_URL_POR_DEFECTO).replace(/\/+$/, '');
  }

  /**
   * Verifica las credenciales contra la Graph API real.
   *
   * Meta no tiene Client Credentials: el token lo genera el usuario fuera del
   * sistema, así que acá solo se valida lo que llegó y se guarda cifrado.
   * No hay renovación automática porque los tokens de sistema no expiran.
   */
  async probar(
    credenciales: CredencialesMetaAds,
  ): Promise<ResultadoPruebaMeta> {
    const adAccount = formatearAdAccountId(credenciales.adAccountId);
    if (!adAccount) {
      return {
        ok: false,
        mensaje: 'La cuenta de anuncios no tiene un identificador válido.',
      };
    }

    const validacion = await this.validarToken(credenciales);
    if (validacion.bloqueante) {
      this.logger.warn(
        `Prueba de Meta Ads rechazada para la cuenta ${adAccount}: ${validacion.mensaje}`,
      );
      return { ok: false, mensaje: validacion.mensaje };
    }

    const cuenta = await this.consultarAdAccount(credenciales, adAccount);
    if (!cuenta.ok) {
      this.logger.warn(
        `Prueba de Meta Ads fallida para la cuenta ${adAccount}: ${cuenta.mensaje}`,
      );
      return {
        ok: false,
        mensaje: `${validacion.mensaje} ${cuenta.mensaje}`.trim(),
      };
    }

    const base = cuenta.operable
      ? `Conexión OK. (cuenta ${adAccount})`
      : `Conexión OK, pero la cuenta ${adAccount} requiere atención: ${cuenta.motivo}.`;

    this.logger.log(
      `Conexión de Meta Ads verificada (cuenta ${adAccount}, app ${validacion.appIdDetectado}). ${cuenta.detalle}${
        validacion.avisos ? ` | ${validacion.avisos}` : ''
      }`,
    );

    return {
      ok: true,
      mensaje: base,
    };
  }

  /** `debug_token`: confirma que el App ID y el App Secret pertenecen al token. */
  private async validarToken(credenciales: CredencialesMetaAds): Promise<{
    bloqueante: boolean;
    mensaje: string;
    appIdDetectado: string;
    avisos: string;
  }> {
    const url = new URL(`${this.baseUrl}/debug_token`);
    url.searchParams.set('input_token', credenciales.accessToken);
    url.searchParams.set('access_token', credenciales.accessToken);
    url.searchParams.set(
      'appsecret_proof',
      this.calcularAppsecretProof(
        credenciales.accessToken,
        credenciales.appSecret,
      ),
    );

    const { ok, cuerpo, error } = await this.get(url);

    if (!ok) {
      // Si el token ni siquiera se puede inspeccionar, la prueba de la cuenta
      // de anuncios igual decide si la conexión sirve o no.
      if (error === 'red') {
        return {
          bloqueante: true,
          mensaje: 'No se pudo contactar la API de Meta.',
          appIdDetectado: '',
          avisos: '',
        };
      }
      return {
        bloqueante: false,
        mensaje: '',
        appIdDetectado: '',
        avisos:
          'No se pudo verificar el App Secret, pero la cuenta de anuncios sí respondió.',
      };
    }

    const data = this.obtenerObjeto(cuerpo, 'data');
    if (!data) {
      return {
        bloqueante: false,
        mensaje: '',
        appIdDetectado: '',
        avisos:
          'No se pudo verificar el App Secret, pero la cuenta de anuncios sí respondió.',
      };
    }

    const appIdDelToken = this.obtenerTexto(data, 'app_id');
    if (appIdDelToken && appIdDelToken !== credenciales.appId.trim()) {
      return {
        bloqueante: true,
        mensaje: `El App ID ${credenciales.appId.trim()} no corresponde al Access Token (pertenece a la app ${appIdDelToken}). Verificá que las dos credenciales sean de la misma app.`,
        appIdDetectado: '',
        avisos: '',
      };
    }

    const scopes = Array.isArray(data['scopes'])
      ? (data['scopes'] as unknown[]).filter(
          (s): s is string => typeof s === 'string',
        )
      : [];
    const valido = data['is_valid'];

    if (valido === false) {
      return {
        bloqueante: true,
        mensaje:
          'Meta marcó el Access Token como no válido. Generá uno nuevo en el Events Manager de tu app.',
        appIdDetectado: '',
        avisos: '',
      };
    }

    const faltan = SCOPES_RECOMENDADOS.filter((s) => !scopes.includes(s));
    const avisos =
      faltan.length === 0
        ? ''
        : faltan.length === 1
          ? `Falta ${faltan[0]}.`
          : `Faltan ${faltan.join(', ')}.`;

    return {
      bloqueante: false,
      mensaje: '',
      appIdDetectado: appIdDelToken ?? credenciales.appId.trim(),
      avisos,
    };
  }

  /** Consulta la cuenta de anuncios: la prueba real de que el token sirve. */
  private async consultarAdAccount(
    credenciales: CredencialesMetaAds,
    adAccount: string,
  ): Promise<ResultadoConsultaCuenta> {
    const url = new URL(`${this.baseUrl}/${adAccount}`);
    url.searchParams.set('fields', CAMPOS_CUENTA_ANUNCIOS);
    url.searchParams.set(
      'appsecret_proof',
      this.calcularAppsecretProof(
        credenciales.accessToken,
        credenciales.appSecret,
      ),
    );

    const { ok, cuerpo, error } = await this.get(url, credenciales.accessToken);

    if (error === 'red') {
      return {
        ok: false,
        mensaje:
          'no se pudo contactar la API de Meta (sin respuesta o tiempo de espera agotado).',
        operable: false,
        motivo: null,
        detalle: '',
      };
    }

    if (!ok) {
      const detalle = this.extraerError(cuerpo);
      return {
        ok: false,
        mensaje: this.explicarError(detalle, adAccount),
        operable: false,
        motivo: null,
        detalle: '',
      };
    }

    const nombre = this.obtenerTexto(cuerpo, 'name');
    const id = this.obtenerTexto(cuerpo, 'id');
    const moneda = this.obtenerTexto(cuerpo, 'currency');
    const estado = this.obtenerEstadoCuenta(cuerpo);

    const detalle = [
      `cuenta "${nombre ?? normalizarAdAccountId(adAccount)}"`,
      `(${[
        id ?? normalizarAdAccountId(adAccount),
        estado ? `estado ${estado.codigo}` : null,
        moneda ? `moneda ${moneda}` : null,
      ]
        .filter(Boolean)
        .join(', ')})`,
    ].join(' ');

    return {
      ok: true,
      mensaje: '',
      operable: estado?.operable ?? true,
      motivo: estado?.operable === false ? estado.motivo : null,
      detalle,
    };
  }

  private async get(
    url: URL,
    tokenParaCabecera?: string,
  ): Promise<{ ok: boolean; cuerpo: unknown; error: string | null }> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), META_TIMEOUT_MS);

    try {
      const respuesta = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...(tokenParaCabecera
            ? { Authorization: `Bearer ${tokenParaCabecera}` }
            : {}),
        },
        signal: controlador.signal,
      });

      const cuerpo: unknown = await respuesta.json().catch(() => null);
      return {
        ok: respuesta.ok,
        cuerpo,
        error: respuesta.ok ? null : 'http',
      };
    } catch {
      return { ok: false, cuerpo: null, error: 'red' };
    } finally {
      clearTimeout(temporizador);
    }
  }

  /**
   * `appsecret_proof` es el HMAC-SHA256 del token usando el App Secret.
   * Además de más seguridad, es lo que permite confirmar que el App Secret
   * capturado corresponde de verdad a la app del token.
   */
  private calcularAppsecretProof(
    accessToken: string,
    appSecret: string,
  ): string {
    return createHmac('sha256', appSecret).update(accessToken).digest('hex');
  }

  private extraerError(cuerpo: unknown): DetalleErrorGraph {
    const error = this.obtenerObjeto(cuerpo, 'error');
    if (!error) {
      return {
        codigo: null,
        subcodigo: null,
        mensaje: 'Meta no devolvió un detalle del error.',
      };
    }
    return {
      codigo: typeof error['code'] === 'number' ? error['code'] : null,
      subcodigo:
        typeof error['error_subcode'] === 'number'
          ? error['error_subcode']
          : null,
      mensaje:
        this.obtenerTexto(error, 'message') ??
        'Meta no devolvió un detalle del error.',
    };
  }

  private explicarError(detalle: DetalleErrorGraph, adAccount: string): string {
    const base = `la cuenta ${adAccount}`;

    // 190 + subcódigo 463: el appsecret_proof no cuadra, o sea el App Secret
    // capturado no es el de la app a la que pertenece el token.
    if (
      detalle.codigo === 190 &&
      (detalle.subcodigo === 463 || detalle.subcodigo === 464)
    ) {
      return 'El App Secret no coincide con la app del Access Token. Revisá que app_secret sea el de la misma app que app_id.';
    }

    switch (detalle.codigo) {
      case 190:
        return 'Meta rechazó el Access Token. Generá uno nuevo en el Events Manager de tu app.';
      case 191:
        return 'El Access Token expiró o fue revocado. Generá uno nuevo en el Events Manager.';
      case 100:
        return `Meta rechazó los parámetros enviados: ${detalle.mensaje}`;
      case 10:
      case 200:
        return 'El Access Token es válido pero no tiene los permisos (ads_read / ads_management) para esta operación.';
      case 803:
        return `El token no tiene acceso a ${base}. Agregá esa cuenta al usuario o al sistema con acceso a la app.`;
      case 10094:
        return `La cuenta de anuncios ${adAccount} no está accesible desde esta app. Verificá que el ID sea correcto y que la app tenga acceso a ella.`;
      case 368:
        return 'Meta bloqueó temporalmente la petición por actividad inusual. Esperá unos minutos y volvé a probar.';
      case 1:
      case 2:
      case 4:
      case 17:
      case 32:
      case 613:
        return 'Meta está limitando las llamadas (rate limit). Esperá unos minutos y volvé a probar.';
      case 102:
        return 'Meta está teniendo problemas con su sesión. Intentá de nuevo en unos minutos.';
      default:
        return `Meta respondió con un error${detalle.codigo !== null ? ` (código ${detalle.codigo})` : ''}: ${detalle.mensaje}`;
    }
  }

  private obtenerObjeto(
    cuerpo: unknown,
    clave: string,
  ): Record<string, unknown> | null {
    if (!cuerpo || typeof cuerpo !== 'object') return null;
    const valor = (cuerpo as Record<string, unknown>)[clave];
    return valor && typeof valor === 'object'
      ? (valor as Record<string, unknown>)
      : null;
  }

  private obtenerTexto(cuerpo: unknown, clave: string): string | null {
    if (!cuerpo || typeof cuerpo !== 'object') return null;
    const valor = (cuerpo as Record<string, unknown>)[clave];
    return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
  }

  /**
   * `account_status` llega como número entero, no como texto, así que no se
   * puede leer con `obtenerTexto`. Devuelve null cuando la API no lo envía.
   */
  private obtenerEstadoCuenta(
    cuerpo: unknown,
  ): { codigo: number; operable: boolean; motivo: string } | null {
    if (!cuerpo || typeof cuerpo !== 'object') return null;
    const crudo = (cuerpo as Record<string, unknown>)['account_status'];
    const codigo = typeof crudo === 'number' ? crudo : Number(crudo);
    if (!Number.isFinite(codigo)) return null;

    const operable = ESTADOS_OPERABLES.has(codigo);
    const motivo = MOTIVOS_ESTADO_CUENTA[codigo];
    return {
      codigo,
      operable,
      motivo: motivo ?? `Meta devolvió un estado no documentado (${codigo})`,
    };
  }
}
