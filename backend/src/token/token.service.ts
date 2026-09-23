import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { TOKEN_EXPIRES_MINUTES, TOKEN_MAX_ATTEMPTS } from '../config/constants';
import { Usuario } from '../user/entity/usuario.entity';
import { EstadoToken, TipoToken, Token } from './entity/token.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly configService: ConfigService,
  ) {}

  async generarCodigo(usuario: Usuario, tipo: TipoToken): Promise<Token> {
    try {
      await this.tokenRepository
        .createQueryBuilder()
        .update(Token)
        .set({ estado: EstadoToken.EXPIRADO })
        .where('id_usuario = :idUsuario', { idUsuario: usuario.id_usuario })
        .andWhere('tipo = :tipo', { tipo })
        .andWhere('estado = :estado', { estado: EstadoToken.ACTIVO })
        .execute();

      const codigo = randomBytes(3).toString('hex').toUpperCase();
      const vigenciaMinutos =
        this.configService.get<number>(TOKEN_EXPIRES_MINUTES) ?? 10;
      const maxIntentos =
        this.configService.get<number>(TOKEN_MAX_ATTEMPTS) ?? 3;

      const fechaExpiracion = new Date(
        Date.now() + vigenciaMinutos * 60 * 1000,
      );

      const token = this.tokenRepository.create({
        usuario,
        token: codigo,
        tipo,
        estado: EstadoToken.ACTIVO,
        fecha_expiracion: fechaExpiracion,
        intentos_restantes: maxIntentos,
      });

      return await this.tokenRepository.save(token);
    } catch {
      throw new InternalServerErrorException(
        'Error al generar el código. Inténtalo nuevamente.',
      );
    }
  }

  async validarCodigo(
    codigoIngresado: string,
    tipo: TipoToken,
    idUsuario: number,
  ): Promise<Token> {
    const token = await this.tokenRepository
      .createQueryBuilder('token')
      .leftJoinAndSelect('token.usuario', 'usuario')
      .where('usuario.id_usuario = :idUsuario', { idUsuario })
      .andWhere('token.tipo = :tipo', { tipo })
      .andWhere('token.estado = :estado', { estado: EstadoToken.ACTIVO })
      .getOne();

    if (!token) {
      throw new NotFoundException(
        'No existe un código activo para este usuario.',
      );
    }

    if (new Date() > token.fecha_expiracion) {
      token.estado = EstadoToken.EXPIRADO;
      await this.tokenRepository.save(token);
      throw new BadRequestException('El código ha expirado.');
    }

    if (token.token !== codigoIngresado) {
      token.intentos_restantes -= 1;

      if (token.intentos_restantes <= 0) {
        token.estado = EstadoToken.EXPIRADO;
      }

      await this.tokenRepository.save(token);

      throw new BadRequestException(
        token.estado === EstadoToken.EXPIRADO
          ? 'Has agotado los intentos. El código ha sido bloqueado.'
          : `Código incorrecto. Te quedan ${token.intentos_restantes} intentos.`,
      );
    }

    return token;
  }

  async marcarComoUsado(token: Token): Promise<void> {
    try {
      token.estado = EstadoToken.USADO;
      await this.tokenRepository.save(token);
    } catch {
      throw new InternalServerErrorException(
        'Error al actualizar el código. Inténtalo nuevamente.',
      );
    }
  }
}
