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
const TAMANO_MAX_BYTES = 2 * 1024 * 1024;
/**
 * El cuerpo del backend acepta 4 MB de JSON y una data URL de base64 pesa un 33%
 * más que el binario, así que ~2.9 MB es el techo real. El frontend comprime en
 * el navegador para no acercarse a ese límite.
 */
const TAMANO_MAX_PRODUCTO_BYTES = Math.floor((3 * 1024 * 1024 * 4) / 5);
const MIMES_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);

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
