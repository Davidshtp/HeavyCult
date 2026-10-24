import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVOLUTION_API_KEY, EVOLUTION_API_URL } from '../../config/constants';
import { PlataformaIntegracion } from '../../integracion/entity/integracion.entity';
import {
  IntegracionService,
  type IntegracionSerializada,
  type ResultadoPrueba,
} from '../../integracion/integracion.service';
import {
  PROVEEDOR_WHATSAPP,
  type CredencialesWhatsapp,
  type ProveedorWhatsapp,
} from '../core/whatsapp-provider.interface';
import type { GuardarConfiguracionWhatsappDto } from './dto/guardar-configuracion-whatsapp.dto';

export interface EntornoWhatsapp {
  configurado: boolean;
  base_url: string;
}

export interface ConfiguracionWhatsappRespuesta {
  configuracion: IntegracionSerializada | null;
  entorno: EntornoWhatsapp;
}

@Injectable()
export class WhatsappConfiguracionService {
  constructor(
    private readonly integracionService: IntegracionService,
    private readonly configService: ConfigService,
    @Inject(PROVEEDOR_WHATSAPP)
    private readonly proveedor: ProveedorWhatsapp,
  ) {}

  async obtener(): Promise<ConfiguracionWhatsappRespuesta> {
    const integraciones = await this.integracionService.listar();
    const configuracion =
      integraciones.find(
        (item) => item.plataforma === PlataformaIntegracion.WHATSAPP,
      ) ?? null;

    return {
      configuracion,
      entorno: this.entorno(),
    };
  }

  async guardar(
    dto: GuardarConfiguracionWhatsappDto,
  ): Promise<ConfiguracionWhatsappRespuesta> {
    const baseUrl = dto.base_url.trim().replace(/\/+$/, '');
    const existente = (await this.obtener()).configuracion;

    if (!existente) {
      if (!dto.api_key) {
        throw new BadRequestException(
          'La API key de Evolution es obligatoria la primera vez.',
        );
      }
      await this.integracionService.crear({
        plataforma: PlataformaIntegracion.WHATSAPP,
        etiqueta: dto.etiqueta?.trim() || 'WhatsApp Evolution',
        api_key: dto.api_key,
        config: { base_url: baseUrl },
      });
      return this.obtener();
    }

    const config = {
      ...(existente.config ?? {}),
      base_url: baseUrl,
    };
    await this.integracionService.actualizar(existente.id_integracion, {
      etiqueta: dto.etiqueta?.trim() || existente.etiqueta,
      ...(dto.api_key ? { api_key: dto.api_key } : {}),
      activo: true,
      config,
    });
    return this.obtener();
  }

  async probar(): Promise<ResultadoPrueba> {
    const integraciones = await this.integracionService.listar();
    const configuracion = integraciones.find(
      (item) => item.plataforma === PlataformaIntegracion.WHATSAPP,
    );

    if (configuracion) {
      return this.integracionService.probar(configuracion.id_integracion);
    }

    const credenciales = this.credencialesEntorno();
    if (!credenciales) {
      return {
        ok: false,
        mensaje:
          'Configura la URL y la API key de Evolution API antes de probar la conexión.',
      };
    }

    try {
      await this.proveedor.probar(credenciales);
      return {
        ok: true,
        mensaje: 'Conexión verificada con Evolution API correctamente.',
      };
    } catch (error) {
      return {
        ok: false,
        mensaje:
          error instanceof Error
            ? error.message
            : 'No se pudo contactar Evolution API.',
      };
    }
  }

  async idIntegracionActiva(): Promise<number | null> {
    const activa = await this.integracionService.buscarActivaPorPlataforma(
      PlataformaIntegracion.WHATSAPP,
    );
    return activa?.id_integracion ?? null;
  }

  /** Credenciales descifradas de la instancia o, si no tiene, del entorno. */
  async obtenerCredenciales(
    idIntegracion: number | null,
  ): Promise<CredencialesWhatsapp> {
    if (idIntegracion) {
      const credenciales =
        await this.integracionService.obtenerCredenciales(idIntegracion);
      return this.armarCredenciales(credenciales.config, credenciales.apiKey);
    }

    const activa = await this.integracionService.buscarActivaPorPlataforma(
      PlataformaIntegracion.WHATSAPP,
    );
    if (activa) {
      const credenciales = await this.integracionService.obtenerCredenciales(
        activa.id_integracion,
      );
      return this.armarCredenciales(credenciales.config, credenciales.apiKey);
    }

    const entorno = this.credencialesEntorno();
    if (!entorno) {
      throw new BadRequestException(
        'Configura la URL y la API key de Evolution API en Configuración → WhatsApp.',
      );
    }
    return entorno;
  }

  private entorno(): EntornoWhatsapp {
    return {
      configurado: !!this.configService.get<string>(EVOLUTION_API_KEY),
      base_url:
        this.configService.get<string>(EVOLUTION_API_URL) ??
        'http://localhost:8080',
    };
  }

  private credencialesEntorno(): CredencialesWhatsapp | null {
    const apiKey = this.configService.get<string>(EVOLUTION_API_KEY)?.trim();
    if (!apiKey) return null;
    const baseUrl =
      this.configService.get<string>(EVOLUTION_API_URL)?.trim() ||
      'http://localhost:8080';
    return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey };
  }

  private armarCredenciales(
    config: Record<string, string> | null,
    apiKey: string,
  ): CredencialesWhatsapp {
    const baseUrl = config?.['base_url']?.trim();
    if (!baseUrl) {
      throw new BadRequestException(
        'La conexión de WhatsApp no tiene registrada la URL de Evolution API.',
      );
    }
    return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey };
  }
}
