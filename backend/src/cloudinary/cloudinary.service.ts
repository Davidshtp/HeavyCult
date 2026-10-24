import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from '../config/constants';

const CARPETA_AVATARES = 'heavycult/avatars';
const CARPETA_PRODUCTOS = 'heavycult/productos';
const CARPETA_WHATSAPP = 'heavycult/whatsapp';
const TAMANO_MAX_BYTES = 2 * 1024 * 1024;
/**
 * El cuerpo del backend acepta 4 MB de JSON y una data URL de base64 pesa un 33%
 * más que el binario, así que ~2.9 MB es el techo real. El frontend comprime en
 * el navegador para no acercarse a ese límite.
 */
const TAMANO_MAX_PRODUCTO_BYTES = Math.floor((3 * 1024 * 1024 * 4) / 5);
const MIMES_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);

function convertirADataUrl(valor: string, mimeType: string): string {
  if (valor.startsWith('data:')) return valor;
  return `data:${mimeType};base64,${valor}`;
}

function extraerBufferDataUrl(dataUrl: string): Buffer {
  const separador = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || separador < 0) {
    throw new BadRequestException(
      'El archivo multimedia no tiene un formato válido.',
    );
  }

  const codificado = dataUrl.slice(separador + 1);
  try {
    return Buffer.from(codificado, 'base64');
  } catch {
    throw new BadRequestException(
      'El archivo multimedia no tiene un formato válido.',
    );
  }
}

function describirError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Error desconocido';
  }
}

function esBinarioMediaValido(buffer: Buffer, tipo: string): boolean {
  if (tipo === 'IMAGEN') {
    return (
      (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      buffer.subarray(0, 4).toString() === 'RIFF' ||
      buffer.subarray(0, 4).toString() === 'WEBP'
    );
  }
  return buffer.length > 0;
}

export interface ResultadoSubida {
  url_imagen: string;
  public_id: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.getOrThrow<string>(CLOUDINARY_CLOUD_NAME),
      api_key: configService.getOrThrow<string>(CLOUDINARY_API_KEY),
      api_secret: configService.getOrThrow<string>(CLOUDINARY_API_SECRET),
    });
  }

  avatarPublicId(idUsuario: number): string {
    return `${CARPETA_AVATARES}/avatar_${idUsuario}`;
  }

  async subirAvatar(
    idUsuario: number,
    dataUrl: string,
  ): Promise<ResultadoSubida> {
    this.validarDataUrl(dataUrl);

    try {
      const resultado = await cloudinary.uploader.upload(dataUrl, {
        resource_type: 'image',
        public_id: this.avatarPublicId(idUsuario),
        overwrite: true,
        invalidate: true,
      });

      return {
        url_imagen: resultado.secure_url,
        public_id: resultado.public_id,
      };
    } catch (error) {
      this.logger.error(
        `No fue posible subir el avatar del usuario ${idUsuario}: ${String(error)}`,
      );
      throw new BadRequestException(
        'No fue posible subir la imagen. Inténtalo más tarde.',
      );
    }
  }

  /**
   * Sube la imagen de un producto a Cloudinary y devuelve la URL pública, que es
   * la que después se le pasa a Shopify en `productUpdate(media:)`. Shopify
   * descarga la imagen desde esa URL, así que la URL tiene que ser accesible
   * desde internet: por eso no se puede enviar el archivo binario directo.
   */
  async subirImagenProducto(dataUrl: string): Promise<ResultadoSubida> {
    this.validarDataUrl(
      dataUrl,
      TAMANO_MAX_PRODUCTO_BYTES,
      'La imagen supera los 3 MB. Reduce su tamaño e inténtalo de nuevo.',
    );

    try {
      const resultado = await cloudinary.uploader.upload(dataUrl, {
        resource_type: 'image',
        folder: CARPETA_PRODUCTOS,
        overwrite: false,
      });

      return {
        url_imagen: resultado.secure_url,
        public_id: resultado.public_id,
      };
    } catch (error) {
      this.logger.error(
        `No fue posible subir la imagen del producto: ${String(error)}`,
      );
      throw new BadRequestException(
        'No fue posible subir la imagen. Inténtalo más tarde.',
      );
    }
  }

  async subirMediaWhatsapp(
    mediaData: string,
    tipo: 'IMAGEN' | 'AUDIO' | 'VIDEO' | 'DOCUMENTO',
    mimeType: string,
  ): Promise<ResultadoSubida> {
    const esUrl = /^https?:\/\//i.test(mediaData);
    let fuente: string;
    try {
      fuente = esUrl
        ? await this.descargarMediaWhatsapp(mediaData, mimeType, tipo)
        : convertirADataUrl(mediaData, mimeType);
    } catch (error) {
      this.logger.error(
        `No fue posible descargar el archivo de WhatsApp (${tipo}, ${mimeType}): ${describirError(error)}`,
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'No fue posible descargar el archivo multimedia.',
      );
    }
    const coincidencia = esUrl
      ? null
      : new RegExp(
          `^data:${mimeType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};base64,([A-Za-z0-9+/=]+)$`,
        ).exec(fuente);
    if (!coincidencia && !esUrl) {
      throw new BadRequestException('El archivo multimedia no tiene un formato válido.');
    }
    const bytes = coincidencia
      ? Math.floor((coincidencia[1].length * 3) / 4)
      : 0;
    if (bytes > 10 * 1024 * 1024) {
      throw new BadRequestException('El archivo multimedia no puede superar 10 MB.');
    }

    try {
      const buffer = extraerBufferDataUrl(fuente);
      const resultado = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type:
              tipo === 'IMAGEN'
                ? 'image'
                : tipo === 'VIDEO' || tipo === 'AUDIO'
                  ? 'video'
                  : 'raw',
            folder: CARPETA_WHATSAPP,
            overwrite: false,
          },
          (error, resultado) => {
            if (error || !resultado) {
              reject(error ?? new Error('Cloudinary no devolvió resultado.'));
              return;
            }
            resolve({
              secure_url: resultado.secure_url,
              public_id: resultado.public_id,
            });
          },
        );
        stream.end(buffer);
      });
      return {
        url_imagen: resultado.secure_url,
        public_id: resultado.public_id,
      };
    } catch (error) {
      this.logger.error(
        `No fue posible subir el archivo de WhatsApp (${tipo}, ${mimeType}, fuente=${esUrl ? 'url' : 'base64'}): ${describirError(error)}`,
      );
      throw new BadRequestException(
        'No fue posible guardar el archivo multimedia.',
      );
    }
  }

  private async descargarMediaWhatsapp(
    url: string,
    mimeType: string,
    tipo: 'IMAGEN' | 'AUDIO' | 'VIDEO' | 'DOCUMENTO',
  ): Promise<string> {
    const respuesta = await fetch(url, {
      headers: {
        Accept: `${mimeType}, */*`,
        Origin: 'https://web.whatsapp.com',
        Referer: 'https://web.whatsapp.com/',
        'User-Agent': 'HeavyCult-WhatsApp-Media/1.0',
      },
      redirect: 'follow',
    });

    if (!respuesta.ok) {
      throw new BadRequestException(
        `WhatsApp no permitió descargar el archivo multimedia (HTTP ${respuesta.status}).`,
      );
    }

    const longitud = respuesta.headers.get('content-length');
    if (longitud && Number(longitud) > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'El archivo multimedia no puede superar 10 MB.',
      );
    }

    const buffer = Buffer.from(await respuesta.arrayBuffer());
    if (buffer.length === 0) {
      throw new BadRequestException(
        'WhatsApp devolvió un archivo multimedia vacío.',
      );
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'El archivo multimedia no puede superar 10 MB.',
      );
    }

    if (!esBinarioMediaValido(buffer, tipo)) {
      throw new BadRequestException(
        'WhatsApp no devolvió el contenido binario del archivo multimedia.',
      );
    }

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  /** Borra la copia de Cloudinary; Shopify ya tiene la suya. */
  async eliminarImagenProducto(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      // Si falla, la imagen queda huérfana en Cloudinary: se avisa, pero no se
      // revierte la operación, porque en Shopify ya se eliminó.
      this.logger.warn(
        `No se pudo borrar ${publicId} de Cloudinary: ${String(error)}`,
      );
    }
  }

  async eliminarAvatar(idUsuario: number): Promise<void> {
    const publicId = this.avatarPublicId(idUsuario);

    try {
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } catch (error) {
      this.logger.error(
        `No fue posible eliminar el avatar del usuario ${idUsuario}: ${String(error)}`,
      );
      throw new BadRequestException(
        'No fue posible eliminar la imagen. Inténtalo más tarde.',
      );
    }
  }

  private validarDataUrl(
    dataUrl: string,
    maximoBytes = TAMANO_MAX_BYTES,
    mensajeMaximo = 'La imagen supera los 2 MB.',
  ): void {
    const coincidencia =
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);

    if (!coincidencia || !MIMES_PERMITIDOS.has(coincidencia[1])) {
      throw new BadRequestException(
        'Formato de imagen no válido. Usa PNG, JPG o WebP.',
      );
    }

    const bytes = Math.floor((coincidencia[2].length * 3) / 4);
    if (bytes > maximoBytes) {
      throw new BadRequestException(mensajeMaximo);
    }
  }
}
