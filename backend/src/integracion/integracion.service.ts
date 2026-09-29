import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JWT_SECRET } from '../config/constants';
import { ActualizarIntegracionDto } from './dto/actualizar-integracion.dto';
import { CrearIntegracionDto } from './dto/crear-integracion.dto';
import { ShopifyTokenService } from '../shopify/shopify-token.service';
import {
  Integracion,
  PlataformaIntegracion,
} from './entity/integracion.entity';
import {
  cifrarApiKey,
  descifrarApiKey,
  enmascararApiKey,
} from './util/cifrador-api-key';

export interface ResultadoPrueba {
  ok: boolean;
  mensaje: string;
}

const SHOPIFY_API_VERSION = '2026-07';
const SHOPIFY_API_TIMEOUT_MS = 10000;

export interface IntegracionSerializada {
  id_integracion: number;
  plataforma: Integracion['plataforma'];
  etiqueta: string;
  api_key_enmascarada: string;
  config: Record<string, string> | null;
  activo: boolean;
  fecha_creacion: Date;
  ultima_prueba_ok: boolean | null;
  mensaje_ultima_prueba: string | null;
  fecha_ultima_prueba: Date | null;
}

@Injectable()
export class IntegracionService {
  constructor(
    @InjectRepository(Integracion)
    private readonly integracionRepository: Repository<Integracion>,
    private readonly configService: ConfigService,
    private readonly shopifyTokenService: ShopifyTokenService,
  ) {}

  private get secreto(): string {
    return this.configService.get<string>(JWT_SECRET) ?? '';
  }

  private serializar(integracion: Integracion): IntegracionSerializada {
    const configVisible: Record<string, string> = {};
    for (const [clave, valor] of Object.entries(integracion.config ?? {})) {
      if (clave !== 'client_secret') configVisible[clave] = valor;
    }
    return {
      id_integracion: integracion.id_integracion,
      plataforma: integracion.plataforma,
      etiqueta: integracion.etiqueta,
      api_key_enmascarada: enmascararApiKey(
        descifrarApiKey(this.secreto, integracion.api_key_cifrada),
      ),
      config: Object.keys(configVisible).length > 0 ? configVisible : null,
      activo: integracion.activo,
      fecha_creacion: integracion.fecha_creacion,
      ultima_prueba_ok: integracion.ultima_prueba_ok ?? null,
      mensaje_ultima_prueba: integracion.mensaje_ultima_prueba ?? null,
      fecha_ultima_prueba: integracion.fecha_ultima_prueba ?? null,
    };
  }

  async findById(idIntegracion: number): Promise<Integracion> {
    const integracion = await this.integracionRepository.findOne({
      where: { id_integracion: idIntegracion },
    });
    if (!integracion) {
      throw new NotFoundException('La conexión no existe.');
    }
    return integracion;
  }

  async listar(): Promise<IntegracionSerializada[]> {
    const integraciones = await this.integracionRepository.find({
      order: { fecha_creacion: 'DESC' },
    });
    return integraciones.map((integracion) => this.serializar(integracion));
  }

  async crear(dto: CrearIntegracionDto): Promise<IntegracionSerializada> {
    const integracion = this.integracionRepository.create({
      plataforma: dto.plataforma,
      etiqueta: dto.etiqueta,
      api_key_cifrada: cifrarApiKey(this.secreto, dto.api_key),
      config: dto.config ?? null,
      activo: true,
    });
    const guardada = await this.integracionRepository.save(integracion);
    return this.serializar(guardada);
  }

  async actualizar(
    idIntegracion: number,
    dto: ActualizarIntegracionDto,
  ): Promise<IntegracionSerializada> {
    const integracion = await this.findById(idIntegracion);

    if (dto.etiqueta !== undefined) {
      integracion.etiqueta = dto.etiqueta;
    }
    if (dto.activo !== undefined) {
      integracion.activo = dto.activo;
    }
    if (dto.config !== undefined) {
      integracion.config = dto.config ?? null;
    }
    if (dto.api_key !== undefined && dto.api_key !== '') {
      integracion.api_key_cifrada = cifrarApiKey(this.secreto, dto.api_key);
      integracion.ultima_prueba_ok = null;
      integracion.mensaje_ultima_prueba = null;
      integracion.fecha_ultima_prueba = null;
    }

    const guardada = await this.integracionRepository.save(integracion);
    return this.serializar(guardada);
  }

  async eliminar(idIntegracion: number): Promise<void> {
    await this.findById(idIntegracion);
    await this.integracionRepository.delete({ id_integracion: idIntegracion });
  }

  async probar(idIntegracion: number): Promise<ResultadoPrueba> {
    const integracion = await this.findById(idIntegracion);

    if (integracion.plataforma === PlataformaIntegracion.SHOPIFY) {
      await this.shopifyTokenService.renovarSiVencido(integracion);
    }

    const apiKey = descifrarApiKey(this.secreto, integracion.api_key_cifrada);

    if (!apiKey) {
      throw new BadRequestException(
        'La conexión no tiene una API key asociada para probar.',
      );
    }

    let resultado: ResultadoPrueba;

    if (integracion.plataforma === PlataformaIntegracion.SHOPIFY) {
      const shop = integracion.config?.['shop'];
      resultado = await this.consultarShopify(apiKey, shop);
    } else {
      resultado = {
        ok: false,
        mensaje:
          'Esta plataforma aún no tiene una prueba de conexión disponible.',
      };
    }

    integracion.ultima_prueba_ok = resultado.ok;
    integracion.mensaje_ultima_prueba = resultado.mensaje;
    integracion.fecha_ultima_prueba = new Date();
    await this.integracionRepository.save(integracion);

    return resultado;
  }

  private async consultarShopify(
    apiKey: string,
    shop?: string,
  ): Promise<ResultadoPrueba> {
    if (!shop) {
      return {
        ok: false,
        mensaje:
          'Esta conexión de Shopify no tiene registrada la tienda. Conéctala de nuevo desde Configuración → Conexiones.',
      };
    }

    const base = shop.includes('.myshopify.com')
      ? shop
      : `${shop.replace(/\.myshopify\.com$/, '')}.myshopify.com`;
    const url = `https://${base}/admin/api/${SHOPIFY_API_VERSION}/shop.json`;

    const controlador = new AbortController();
    const temporizador = setTimeout(
      () => controlador.abort(),
      SHOPIFY_API_TIMEOUT_MS,
    );

    try {
      const respuesta = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': apiKey,
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
          mensaje: `Conexión verificada con Shopify${nombre ? ` (${nombre})` : ''} correctamente.`,
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
          mensaje: `No se encontró la tienda Shopify (${base}).`,
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
          'No se pudo contactar la API de Shopify (sin respuesta o tiempo de espera agotado).',
      };
    } finally {
      clearTimeout(temporizador);
    }
  }
}

function extraerDetalleError(cuerpo: unknown): string | null {
  const campo = extraerCampo(cuerpo, 'message');
  return (
    campo ?? extraerCampo(cuerpo, 'error') ?? extraerCampo(cuerpo, 'mensaje')
  );
}

function extraerCampo(cuerpo: unknown, clave: string): string | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const valor = (cuerpo as Record<string, unknown>)[clave];
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  return null;
}
