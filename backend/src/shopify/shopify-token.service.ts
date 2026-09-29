import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JWT_SECRET } from '../config/constants';
import {
  Integracion,
  PlataformaIntegracion,
} from '../integracion/entity/integracion.entity';
import { cifrarApiKey } from '../integracion/util/cifrador-api-key';
import { ShopifyAuthService } from './shopify-auth.service';

const DURACION_TOKEN_MS = 24 * 60 * 60 * 1000;
const MARGEN_RENOVACION_MS = 30 * 60 * 1000;

@Injectable()
export class ShopifyTokenService implements OnModuleInit {
  private readonly logger = new Logger(ShopifyTokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: ShopifyAuthService,
    @InjectRepository(Integracion)
    private readonly integracionRepository: Repository<Integracion>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Revisando tokens de Shopify vencidos al iniciar…');
    await this.revisarTokensVencidos();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async revisarTokensVencidos(): Promise<void> {
    try {
      const integraciones = await this.integracionRepository.find({
        where: { plataforma: PlataformaIntegracion.SHOPIFY, activo: true },
      });
      for (const integracion of integraciones) {
        await this.renovarSiVencido(integracion);
      }
    } catch (error) {
      this.logger.error(
        'No se pudo revisar los tokens de Shopify.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async renovarSiVencido(integracion: Integracion): Promise<string | null> {
    if (!this.credencialesCompletas(integracion)) return null;
    if (!this.necesitaRenovar(integracion)) return null;
    return this.renovarAhora(integracion);
  }

  async renovarAhora(integracion: Integracion): Promise<string | null> {
    const config = integracion.config;
    if (!config) return null;

    try {
      const credenciales = await this.authService.obtenerTokenClientCredentials(
        config['shop'],
        config['client_id'],
        config['client_secret'],
      );
      const secreto = this.configService.get<string>(JWT_SECRET) ?? '';
      const ahora = new Date();
      const expiraEn =
        typeof credenciales.expires_in === 'number'
          ? credenciales.expires_in * 1000
          : DURACION_TOKEN_MS;

      integracion.api_key_cifrada = cifrarApiKey(
        secreto,
        credenciales.access_token,
      );
      integracion.config = {
        ...config,
        token_obtenido_en: ahora.toISOString(),
        token_expira_en: new Date(ahora.getTime() + expiraEn).toISOString(),
      };
      await this.integracionRepository.save(integracion);
      this.logger.log(
        `Token de Shopify renovado (${config['shop']}). Válido hasta ${integracion.config['token_expira_en']}`,
      );
      return credenciales.access_token;
    } catch (error) {
      this.logger.error(
        `No se pudo renovar el token de Shopify (${config['shop']}).`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  private credencialesCompletas(integracion: Integracion): boolean {
    const config = integracion.config;
    return Boolean(
      config?.['shop'] && config['client_id'] && config['client_secret'],
    );
  }

  private necesitaRenovar(integracion: Integracion): boolean {
    const vencimiento = this.calcularVencimiento(integracion);
    if (vencimiento === null) return true;
    return vencimiento - Date.now() <= MARGEN_RENOVACION_MS;
  }

  private calcularVencimiento(integracion: Integracion): number | null {
    const config = integracion.config;
    if (!config) return null;

    const expira = config['token_expira_en']
      ? Date.parse(config['token_expira_en'])
      : NaN;
    if (!Number.isNaN(expira)) return expira;

    const obtenido = config['token_obtenido_en']
      ? Date.parse(config['token_obtenido_en'])
      : NaN;
    if (Number.isNaN(obtenido)) return null;
    return obtenido + DURACION_TOKEN_MS;
  }
}
