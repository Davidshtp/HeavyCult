import { Body, Controller, Injectable, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JWT_SECRET } from '../../config/constants';
import {
  Integracion,
  PlataformaIntegracion,
} from '../../integracion/entity/integracion.entity';
import { cifrarApiKey } from '../../integracion/util/cifrador-api-key';
import { RolUsuario } from '../../user/entity/usuario.entity';
import { normalizarShopHost } from '../common/util/normalizar-shop';
import { ShopifyAuthService } from '../core/shopify-auth.service';
import { ConectarShopifyDto } from './dto/conectar-shopify.dto';
import { ShopifyTiendaService, ResultadoPrueba } from './tienda.service';

const DURACION_TOKEN_MS = 24 * 60 * 60 * 1000;

/**
 * Conexión de la tienda Shopify (client credentials) y su prueba de vida. La
 * ruta queda igual que antes: `POST /auth/shopify/conectar`.
 */
@Injectable()
@Controller('auth/shopify')
export class ShopifyTiendaController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: ShopifyAuthService,
    private readonly shopifyService: ShopifyTiendaService,
    @InjectRepository(Integracion)
    private readonly integracionRepository: Repository<Integracion>,
  ) {}

  @Post('conectar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  async conectar(@Body() dto: ConectarShopifyDto) {
    const credenciales = await this.authService.obtenerTokenClientCredentials(
      dto.shop,
      dto.client_id,
      dto.client_secret,
    );
    const shopHost = normalizarShopHost(dto.shop);
    const resultado = await this.shopifyService.probarConexionConShop(
      credenciales.access_token,
      shopHost,
    );
    const secreto = this.configService.get<string>(JWT_SECRET) ?? '';
    const ahora = new Date();
    const expiraEn =
      typeof credenciales.expires_in === 'number'
        ? credenciales.expires_in * 1000
        : DURACION_TOKEN_MS;
    const guardada = await this.guardarIntegracion(
      credenciales.access_token,
      secreto,
      resultado,
      {
        etiqueta: `Shopify (${shopHost})`,
        config: {
          shop: shopHost,
          client_id: dto.client_id,
          client_secret: cifrarApiKey(secreto, dto.client_secret),
          token_obtenido_en: ahora.toISOString(),
          token_expira_en: new Date(ahora.getTime() + expiraEn).toISOString(),
        },
      },
    );
    return {
      ok: resultado.ok,
      mensaje: resultado.mensaje,
      integracion: {
        id_integracion: guardada.id_integracion,
        plataforma: guardada.plataforma,
        etiqueta: guardada.etiqueta,
        activo: guardada.activo,
        ultima_prueba_ok: guardada.ultima_prueba_ok ?? null,
        mensaje_ultima_prueba: guardada.mensaje_ultima_prueba ?? null,
      },
    };
  }

  private async guardarIntegracion(
    token: string,
    secreto: string,
    resultado: ResultadoPrueba,
    opciones: {
      etiqueta?: string;
      config?: Record<string, string> | null;
    } = {},
  ): Promise<Integracion> {
    const existente = await this.integracionRepository.findOne({
      where: { plataforma: PlataformaIntegracion.SHOPIFY },
    });

    const datos = {
      api_key_cifrada: cifrarApiKey(secreto, token),
      activo: true,
      ultima_prueba_ok: resultado.ok,
      mensaje_ultima_prueba: resultado.mensaje,
      fecha_ultima_prueba: new Date(),
    };

    if (existente) {
      Object.assign(existente, datos);
      if (opciones.etiqueta !== undefined)
        existente.etiqueta = opciones.etiqueta;
      if (opciones.config !== undefined) existente.config = opciones.config;
      await this.integracionRepository.save(existente);
      return existente;
    }

    const nueva = this.integracionRepository.create({
      plataforma: PlataformaIntegracion.SHOPIFY,
      etiqueta: opciones.etiqueta ?? 'Shopify',
      config: opciones.config ?? null,
      ...datos,
    });
    await this.integracionRepository.save(nueva);
    return nueva;
  }
}
