import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  EVOLUTION_WEBHOOK_PUBLIC_URL,
  JWT_SECRET,
} from '../../config/constants';
import {
  cifrarApiKey,
  descifrarApiKey,
} from '../../integracion/util/cifrador-api-key';
import { WhatsappConfiguracionService } from '../configuracion/whatsapp-configuracion.service';
import {
  PROVEEDOR_WHATSAPP,
  type CredencialesWhatsapp,
  type ProveedorWhatsapp,
  type ResultadoConexion,
} from '../core/whatsapp-provider.interface';
import {
  EstadoInstanciaWhatsapp,
  EstadoMensaje,
  ProveedorWhatsapp as ProveedorWhatsappEnum,
} from '../entity/whatsapp.enums';
import { WhatsappInstancia } from '../entity/whatsapp-instancia.entity';
import { WhatsappGateway } from '../realtime/whatsapp.gateway';
import type { CrearInstanciaDto } from './dto/crear-instancia.dto';

const EXPIRACION_QR_MS = 90_000;
const LARGO_MAXIMO_NOMBRE = 80;

export interface PreparacionEnvio {
  nombre: string;
  numero: string;
  credenciales: CredencialesWhatsapp;
}

export interface InstanciaDetalle {
  id_instancia: number;
  nombre: string;
  proveedor: WhatsappInstancia['proveedor'];
  id_integracion: number | null;
  estado: EstadoInstanciaWhatsapp;
  numero: string | null;
  qr_base64: string | null;
  qr_code: string | null;
  qr_expira_at: string | null;
  webhook_url: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

@Injectable()
export class InstanciasService {
  private readonly logger = new Logger(InstanciasService.name);

  constructor(
    @InjectRepository(WhatsappInstancia)
    private readonly instanciaRepository: Repository<WhatsappInstancia>,
    private readonly configuracionService: WhatsappConfiguracionService,
    private readonly configService: ConfigService,
    @Inject(PROVEEDOR_WHATSAPP)
    private readonly proveedor: ProveedorWhatsapp,
    private readonly gateway: WhatsappGateway,
  ) {}

  private get webhookUrl(): string {
    return (
      this.configService.get<string>(EVOLUTION_WEBHOOK_PUBLIC_URL) ??
      'http://localhost:5560/api/whatsapp/webhooks/evolution'
    );
  }

  async listar(): Promise<InstanciaDetalle[]> {
    const instancias = await this.instanciaRepository.find({
      order: { id_instancia: 'DESC' },
    });
    return instancias.map((instancia) => this.serializar(instancia));
  }

  async obtener(idInstancia: number): Promise<InstanciaDetalle> {
    return this.serializar(await this.obtenerEntidad(idInstancia));
  }

  async crear(dto: CrearInstanciaDto): Promise<InstanciaDetalle> {
    const nombre = dto.nombre?.trim() || `heavycult-${Date.now().toString(36)}`;

    const existente = await this.instanciaRepository.findOne({
      where: { nombre },
    });
    if (existente) {
      throw new ConflictException('Ya existe una instancia con ese nombre.');
    }

    const credenciales =
      await this.configuracionService.obtenerCredenciales(null);
    const secreto = randomBytes(32).toString('hex');
    const secretoCifrado = cifrarApiKey(this.secretoJwt, secreto);

    let resultado: ResultadoConexion;
    try {
      resultado = await this.proveedor.crearInstancia(credenciales, {
        nombre,
        webhookUrl: this.webhookUrl,
        webhookSecret: secreto,
        ...(dto.numero ? { numero: dto.numero } : {}),
      });
    } catch (error) {
      throw this.errorProveedor(
        error,
        'No se pudo crear la instancia en Evolution API.',
      );
    }

    const instancia = this.instanciaRepository.create({
      proveedor: ProveedorWhatsappEnum.EVOLUTION_BAILEYS,
      nombre,
      id_externo: nombre,
      id_integracion: await this.configuracionService.idIntegracionActiva(),
      estado: EstadoInstanciaWhatsapp.CONECTANDO,
      numero: null,
      qr_base64: null,
      qr_code: null,
      qr_expira_at: null,
      webhook_secret_cifrado: secretoCifrado,
      config: null,
    });
    this.aplicarQr(instancia, resultado);

    try {
      await this.instanciaRepository.save(instancia);
    } catch (error) {
      await this.proveedor
        .eliminar(credenciales, nombre)
        .catch(() => undefined);
      if (this.esConflicto(error)) {
        throw new ConflictException('Ya existe una instancia con ese nombre.');
      }
      throw error;
    }

    if (!resultado.codigoQr && !resultado.base64Qr) {
      await this.conectarInterno(instancia, credenciales).catch(
        () => undefined,
      );
    }

    this.emitirInstancia(instancia);
    return this.serializar(instancia);
  }

  async conectar(idInstancia: number): Promise<InstanciaDetalle> {
    const instancia = await this.obtenerEntidad(idInstancia);
    const credenciales = await this.configuracionService.obtenerCredenciales(
      instancia.id_integracion,
    );

    try {
      await this.conectarInterno(instancia, credenciales);
    } catch (error) {
      throw this.errorProveedor(
        error,
        'No se pudo generar el código QR de la instancia.',
      );
    }

    this.emitirInstancia(instancia);
    return this.serializar(instancia);
  }

  async consultarEstado(idInstancia: number): Promise<InstanciaDetalle> {
    const instancia = await this.obtenerEntidad(idInstancia);
    const credenciales = await this.configuracionService.obtenerCredenciales(
      instancia.id_integracion,
    );

    try {
      await this.configurarWebhook(instancia, credenciales);
      const estado = await this.proveedor.estado(
        credenciales,
        instancia.nombre,
      );
      this.aplicarEstado(instancia, estado.estado, estado.numero);
      await this.instanciaRepository.save(instancia);
    } catch (error) {
      throw this.errorProveedor(
        error,
        'No se pudo consultar el estado de la instancia.',
      );
    }

    this.emitirInstancia(instancia);
    return this.serializar(instancia);
  }

  async desconectar(idInstancia: number): Promise<InstanciaDetalle> {
    const instancia = await this.obtenerEntidad(idInstancia);
    const credenciales = await this.configuracionService.obtenerCredenciales(
      instancia.id_integracion,
    );

    try {
      await this.proveedor.desconectar(credenciales, instancia.nombre);
    } catch (error) {
      throw this.errorProveedor(error, 'No se pudo desconectar la instancia.');
    }

    this.aplicarEstado(instancia, EstadoInstanciaWhatsapp.DESCONECTADA, null);
    await this.instanciaRepository.save(instancia);
    this.emitirInstancia(instancia);
    return this.serializar(instancia);
  }

  async eliminar(idInstancia: number): Promise<void> {
    const instancia = await this.obtenerEntidad(idInstancia);
    const credenciales = await this.configuracionService.obtenerCredenciales(
      instancia.id_integracion,
    );

    try {
      await this.proveedor.eliminar(credenciales, instancia.nombre);
    } catch (error) {
      throw this.errorProveedor(
        error,
        'No se pudo eliminar la instancia en Evolution API.',
      );
    }

    const sufijo = `~del~${Date.now().toString(36)}`;
    instancia.nombre = `${instancia.nombre.slice(
      0,
      LARGO_MAXIMO_NOMBRE - sufijo.length,
    )}${sufijo}`;
    await this.instanciaRepository.save(instancia);
    await this.instanciaRepository.softDelete(instancia.id_instancia);
  }

  async prepararEnvio(idInstancia: number): Promise<PreparacionEnvio> {
    const instancia = await this.obtenerEntidad(idInstancia);
    if (!instancia.numero) {
      throw new BadGatewayException(
        'La instancia de WhatsApp no tiene un número conectado.',
      );
    }
    const credenciales = await this.configuracionService.obtenerCredenciales(
      instancia.id_integracion,
    );
    return {
      nombre: instancia.nombre,
      numero: instancia.numero,
      credenciales,
    };
  }

  async enviarTexto(
    envio: PreparacionEnvio,
    destino: string,
    texto: string,
    citado?: Parameters<ProveedorWhatsapp['enviarTexto']>[4],
  ): Promise<{ idExterno: string | null; estado: EstadoMensaje }> {
    return this.proveedor.enviarTexto(
      envio.credenciales,
      envio.nombre,
      destino,
      texto,
      citado,
    );
  }

  async enviarMedia(
    envio: PreparacionEnvio,
    destino: string,
    solicitud: Parameters<ProveedorWhatsapp['enviarMedia']>[3],
    citado?: Parameters<ProveedorWhatsapp['enviarMedia']>[4],
  ): Promise<{ idExterno: string | null; estado: EstadoMensaje }> {
    return this.proveedor.enviarMedia(
      envio.credenciales,
      envio.nombre,
      destino,
      solicitud,
      citado,
    );
  }

  async obtenerMediaBase64(
    idInstancia: number,
    mensaje: {
      key: Record<string, unknown>;
      message: Record<string, unknown>;
    },
  ): Promise<string | null> {
    const instancia = await this.obtenerEntidad(idInstancia);
    const credenciales = await this.configuracionService.obtenerCredenciales(
      instancia.id_integracion,
    );
    return this.proveedor.obtenerMediaBase64(
      credenciales,
      instancia.nombre,
      mensaje,
    );
  }

  async actualizarQrDesdeWebhook(
    nombre: string,
    qr: { base64: string | null; codigo: string | null },
  ): Promise<void> {
    const instancia = await this.instanciaRepository.findOne({
      where: { nombre },
    });
    if (!instancia) return;

    instancia.qr_base64 = qr.base64;
    instancia.qr_code = qr.codigo;
    instancia.qr_expira_at = new Date(Date.now() + EXPIRACION_QR_MS);
    instancia.estado = EstadoInstanciaWhatsapp.QR;
    await this.instanciaRepository.save(instancia);
    this.emitirInstancia(instancia);
  }

  async actualizarEstadoDesdeWebhook(
    nombre: string,
    estado: EstadoInstanciaWhatsapp,
    numero: string | null,
  ): Promise<void> {
    const instancia = await this.instanciaRepository.findOne({
      where: { nombre },
    });
    if (!instancia) return;

    this.aplicarEstado(instancia, estado, numero);
    await this.instanciaRepository.save(instancia);
    this.emitirInstancia(instancia);
  }

  @Cron('*/5 * * * *')
  async reconciliarEstados(): Promise<void> {
    const instancias = await this.instanciaRepository.find();
    for (const instancia of instancias) {
      try {
        const credenciales =
          await this.configuracionService.obtenerCredenciales(
            instancia.id_integracion,
          );
        const estado = await this.proveedor.estado(
          credenciales,
          instancia.nombre,
        );
        const cambio =
          instancia.estado !== estado.estado ||
          (estado.numero !== null && instancia.numero !== estado.numero);
        if (!cambio) continue;

        this.aplicarEstado(instancia, estado.estado, estado.numero);
        await this.instanciaRepository.save(instancia);
        this.emitirInstancia(instancia);
      } catch {
        this.logger.warn(
          `No se pudo reconciliar el estado de la instancia ${instancia.id_instancia}.`,
        );
      }
    }
  }

  private async conectarInterno(
    instancia: WhatsappInstancia,
    credenciales: CredencialesWhatsapp,
  ): Promise<void> {
    const resultado = await this.proveedor.conectar(
      credenciales,
      instancia.nombre,
    );
    this.aplicarQr(instancia, resultado);

    if (!resultado.codigoQr && !resultado.base64Qr) {
      const estado = await this.proveedor.estado(
        credenciales,
        instancia.nombre,
      );
      this.aplicarEstado(instancia, estado.estado, estado.numero);
    }

    await this.instanciaRepository.save(instancia);
  }

  private aplicarQr(
    instancia: WhatsappInstancia,
    resultado: ResultadoConexion,
  ): void {
    if (!resultado.codigoQr && !resultado.base64Qr) return;
    instancia.qr_base64 = resultado.base64Qr;
    instancia.qr_code = resultado.codigoQr;
    instancia.qr_expira_at = new Date(Date.now() + EXPIRACION_QR_MS);
    instancia.estado = EstadoInstanciaWhatsapp.QR;
  }

  private aplicarEstado(
    instancia: WhatsappInstancia,
    estado: EstadoInstanciaWhatsapp,
    numero: string | null,
  ): void {
    instancia.estado = estado;
    if (numero) instancia.numero = numero;

    if (
      estado === EstadoInstanciaWhatsapp.CONECTADA ||
      estado === EstadoInstanciaWhatsapp.DESCONECTADA ||
      estado === EstadoInstanciaWhatsapp.ERROR
    ) {
      instancia.qr_base64 = null;
      instancia.qr_code = null;
      instancia.qr_expira_at = null;
    }
  }

  private async obtenerEntidad(
    idInstancia: number,
  ): Promise<WhatsappInstancia> {
    const instancia = await this.instanciaRepository.findOne({
      where: { id_instancia: idInstancia },
    });
    if (!instancia) {
      throw new NotFoundException('La instancia de WhatsApp no existe.');
    }
    return instancia;
  }

  private serializar(instancia: WhatsappInstancia): InstanciaDetalle {
    return {
      id_instancia: instancia.id_instancia,
      nombre: instancia.nombre,
      proveedor: instancia.proveedor,
      id_integracion: instancia.id_integracion,
      estado: instancia.estado,
      numero: instancia.numero,
      qr_base64: instancia.qr_base64,
      qr_code: instancia.qr_code,
      qr_expira_at: instancia.qr_expira_at
        ? instancia.qr_expira_at.toISOString()
        : null,
      webhook_url: this.webhookUrl,
      fecha_creacion: instancia.fecha_creacion.toISOString(),
      fecha_actualizacion: instancia.fecha_actualizacion.toISOString(),
    };
  }

  private emitirInstancia(instancia: WhatsappInstancia): void {
    this.gateway.emitirEstadoInstancia({
      id_instancia: instancia.id_instancia,
      nombre: instancia.nombre,
      estado: instancia.estado,
      numero: instancia.numero,
    });
    if (instancia.qr_base64 || instancia.qr_code) {
      this.gateway.emitirQr({
        id_instancia: instancia.id_instancia,
        nombre: instancia.nombre,
        qr_base64: instancia.qr_base64,
        qr_code: instancia.qr_code,
        qr_expira_at: instancia.qr_expira_at
          ? instancia.qr_expira_at.toISOString()
          : null,
      });
    }
  }

  private get secretoJwt(): string {
    return this.configService.get<string>(JWT_SECRET) ?? '';
  }

  private esConflicto(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }

  private errorProveedor(error: unknown, mensaje: string): Error {
    if (error instanceof BadGatewayException) return error;
    return new BadGatewayException(
      error instanceof Error && error.message
        ? `${mensaje} ${error.message}`
        : mensaje,
    );
  }

  async obtenerContextoWebhook(
    nombre: string,
  ): Promise<{ idInstancia: number; secreto: string } | null> {
    const instancia = await this.instanciaRepository.findOne({
      where: { nombre },
    });
    if (!instancia) return null;
    try {
      const secreto = descifrarApiKey(
        this.secretoJwt,
        instancia.webhook_secret_cifrado,
      );
      return {
        idInstancia: instancia.id_instancia,
        secreto,
      };
    } catch {
      return null;
    }
  }

  private async configurarWebhook(
    instancia: WhatsappInstancia,
    credenciales: CredencialesWhatsapp,
  ): Promise<void> {
    const secreto = descifrarApiKey(
      this.secretoJwt,
      instancia.webhook_secret_cifrado,
    );
    await this.proveedor.configurarWebhook(credenciales, instancia.nombre, {
      nombre: instancia.nombre,
      webhookUrl: this.webhookUrl,
      webhookSecret: secreto,
    });
  }
}
