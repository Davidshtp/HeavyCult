import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JWT_SECRET } from '../../config/constants';
import {
  Integracion,
  PlataformaIntegracion,
} from '../../integracion/entity/integracion.entity';
import { descifrarApiKey } from '../../integracion/util/cifrador-api-key';
import { ShopifyTokenService } from './shopify-token.service';

export interface DatosShopify {
  token: string;
  shop: string;
}

/**
 * Fuente única de las credenciales de Shopify. Antes vivía como método privado
 * de `ShopifyController`; ahora lo comparten el controller y los servicios de
 * productos, así el descifrado del token no queda duplicado.
 */
@Injectable()
export class ShopifyCredentialsService {
  private readonly logger = new Logger(ShopifyCredentialsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: ShopifyTokenService,
    @InjectRepository(Integracion)
    private readonly integracionRepository: Repository<Integracion>,
  ) {}

  async obtener(): Promise<DatosShopify> {
    const integracion = await this.buscarIntegracion();
    if (!integracion) {
      throw new Error(
        'Shopify aún no está conectado. Conéctalo en Configuración → Conexiones usando el formulario.',
      );
    }
    const shop = integracion.config?.['shop'];
    if (!shop) {
      throw new Error(
        'La conexión de Shopify no tiene registrada la tienda. Conéctala de nuevo desde Configuración → Conexiones.',
      );
    }
    const secreto = this.configService.get<string>(JWT_SECRET) ?? '';
    if (!secreto) {
      throw new Error(
        'JWT_SECRET no está configurado en el entorno del servidor.',
      );
    }
    return {
      token: descifrarApiKey(secreto, integracion.api_key_cifrada),
      shop,
    };
  }

  /**
   * Shopify devuelve 200 con `errors` cuando el token expiró, así que un 401
   * puede aparecer en cualquier momento. Tras renovar se reintenta una vez.
   */
  async conReintento<T>(
    ejecutar: (datos: DatosShopify) => Promise<{
      ok: boolean;
      mensaje: string;
      datos: T | null;
      status?: number;
    }>,
  ): Promise<{ ok: boolean; mensaje: string; datos: T | null }> {
    const datos = await this.obtener();
    const primero = await ejecutar(datos);
    if (primero.ok || primero.status !== 401) return primero;

    this.logger.warn('Token de Shopify rechazado; se intenta renovar.');
    const integracion = await this.buscarIntegracion();
    const nuevo = integracion
      ? await this.tokenService.renovarAhora(integracion)
      : null;
    if (!nuevo) return primero;

    const segundo = await ejecutar({ token: nuevo, shop: datos.shop });
    if (!segundo.ok && segundo.status === 401) {
      return {
        ok: false,
        mensaje:
          'El token de Shopify sigue siendo rechazado después de renovarlo. Volvé a conectar la integración.',
        datos: null,
      };
    }
    return segundo;
  }

  private async buscarIntegracion(): Promise<Integracion | null> {
    return this.integracionRepository.findOne({
      where: { plataforma: PlataformaIntegracion.SHOPIFY, activo: true },
    });
  }
}
