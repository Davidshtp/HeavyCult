import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from '../config/constants';

const CARPETA_AVATARES = 'heavycult/avatars';
const TAMANO_MAX_BYTES = 2 * 1024 * 1024;
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

  private validarDataUrl(dataUrl: string): void {
    const coincidencia =
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);

    if (!coincidencia || !MIMES_PERMITIDOS.has(coincidencia[1])) {
      throw new BadRequestException(
        'Formato de imagen no válido. Usa PNG, JPG o WebP.',
      );
    }

    const bytes = Math.floor((coincidencia[2].length * 3) / 4);
    if (bytes > TAMANO_MAX_BYTES) {
      throw new BadRequestException('La imagen supera los 2 MB.');
    }
  }
}
