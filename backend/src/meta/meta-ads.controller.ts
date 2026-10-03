import {
  BadRequestException,
  Body,
  Controller,
  Injectable,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JWT_SECRET } from '../config/constants';
import {
  Integracion,
  PlataformaIntegracion,
} from '../integracion/entity/integracion.entity';
import {
  cifrarApiKey,
  descifrarApiKey,
} from '../integracion/util/cifrador-api-key';
import { RolUsuario } from '../user/entity/usuario.entity';
import { ConectarMetaAdsDto } from './dto/conectar-meta.dto';
import { MetaAdsService } from './meta-ads.service';
import { normalizarAdAccountId } from './util/normalizar-ad-account';

@Injectable()
@Controller('auth/meta')
export class MetaAdsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly metaAdsService: MetaAdsService,
    @InjectRepository(Integracion)
    private readonly integracionRepository: Repository<Integracion>,
  ) {}

  @Post('conectar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  async conectar(@Body() dto: ConectarMetaAdsDto) {
    const existente = await this.integracionRepository.findOne({
      where: { plataforma: PlataformaIntegracion.META_ADS },
    });

    const adAccountId = normalizarAdAccountId(dto.ad_account_id);
    const secreto = this.configService.get<string>(JWT_SECRET) ?? '';

    // En una reconexión los secretos opcionales conservan los ya guardados, así
    // alcanza con corregir el App ID o la cuenta sin volver a pegar el token.
    const appSecret =
      dto.app_secret?.trim() ||
      this.leerSecretoGuardado(existente?.config?.['app_secret'], secreto);
    const accessToken =
      dto.access_token?.trim() ||
      (existente ? descifrarApiKey(secreto, existente.api_key_cifrada) : '');

    if (!appSecret) {
      throw new BadRequestException(
        'El App Secret es obligatorio para conectar Meta Ads por primera vez.',
      );
    }
    if (!accessToken) {
      throw new BadRequestException(
        'El Access Token es obligatorio para conectar Meta Ads por primera vez.',
      );
    }

    const resultado = await this.metaAdsService.probar({
      appId: dto.app_id.trim(),
      appSecret,
      accessToken,
      adAccountId: dto.ad_account_id,
    });

    // A diferencia de Shopify, acá siempre se guarda: si la prueba falla, el
    // usuario necesita ver el mensaje de Meta y poder corregir un solo campo
    // desde el panel en vez de reescribir las cuatro credenciales.
    const guardada = await this.guardarIntegracion(
      existente,
      {
        appId: dto.app_id.trim(),
        adAccountId,
        appSecret,
        accessToken,
      },
      secreto,
      { ok: resultado.ok, mensaje: resultado.mensaje },
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

  private leerSecretoGuardado(
    valor: string | undefined,
    secreto: string,
  ): string {
    if (!valor || !secreto) return '';
    if (!valor.startsWith('aesgcm.')) return valor;
    try {
      return descifrarApiKey(secreto, valor);
    } catch {
      return '';
    }
  }

  private async guardarIntegracion(
    existente: Integracion | null,
    credenciales: {
      appId: string;
      adAccountId: string;
      appSecret: string;
      accessToken: string;
    },
    secreto: string,
    resultado: { ok: boolean; mensaje: string },
  ): Promise<Integracion> {
    const datos = {
      api_key_cifrada: cifrarApiKey(secreto, credenciales.accessToken),
      activo: true,
      ultima_prueba_ok: resultado.ok,
      mensaje_ultima_prueba: resultado.mensaje,
      fecha_ultima_prueba: new Date(),
    };

    const config: Record<string, string> = {
      app_id: credenciales.appId,
      ad_account_id: credenciales.adAccountId,
      app_secret: cifrarApiKey(secreto, credenciales.appSecret),
    };

    if (existente) {
      Object.assign(existente, datos, {
        config,
        etiqueta: `Meta Ads (${credenciales.adAccountId})`,
      });
      await this.integracionRepository.save(existente);
      return existente;
    }

    const nueva = this.integracionRepository.create({
      plataforma: PlataformaIntegracion.META_ADS,
      etiqueta: `Meta Ads (${credenciales.adAccountId})`,
      config,
      ...datos,
    });
    await this.integracionRepository.save(nueva);
    return nueva;
  }
}
