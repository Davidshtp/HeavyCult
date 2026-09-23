import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  FRONTEND_URL,
  JWT_RECOVERY_EXPIRES_IN_SECONDS,
  JWT_RECOVERY_SECRET,
  NODE_ENV,
} from '../config/constants';
import { TokenService } from '../token/token.service';
import { TipoToken } from '../token/entity/token.entity';
import { MailService } from '../mail/mail.service';
import { Usuario } from '../user/entity/usuario.entity';
import { EstadoUsuario } from '../user/entity/usuario.entity';
import { UserService } from '../user/user.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async iniciarSesion(dto: InicioSesionDto): Promise<Usuario> {
    const usuario = await this.userService.findUserByEmail(dto.correo);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (usuario.estado === EstadoUsuario.INACTIVO) {
      throw new UnauthorizedException(
        'La cuenta se encuentra inactiva. Contacta al administrador.',
      );
    }

    if (
      usuario.estado === EstadoUsuario.BLOQUEADO ||
      (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date())
    ) {
      throw new ForbiddenException(this.mensajeBloqueo(usuario));
    }

    const contrasenaValida = await bcrypt.compare(
      dto.contrasena,
      usuario.contrasena,
    );

    if (!contrasenaValida) {
      const trasIntento =
        await this.userService.registrarIntentoFallido(usuario);
      if (
        trasIntento.bloqueado_hasta &&
        trasIntento.bloqueado_hasta > new Date()
      ) {
        throw new ForbiddenException(this.mensajeBloqueo(trasIntento));
      }
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    await this.userService.registrarAccesoExitoso(usuario);
    return usuario;
  }

  private mensajeBloqueo(usuario: Usuario): string {
    const minutosRestantes = usuario.bloqueado_hasta
      ? Math.ceil((usuario.bloqueado_hasta.getTime() - Date.now()) / 60000)
      : 0;
    const minutos = Math.max(minutosRestantes, 0);
    const unidad = `minuto${minutos === 1 ? '' : 's'}`;
    return `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Inténtalo en ${minutos} ${unidad}.`;
  }

  firmarToken(usuario: Usuario): string {
    const payload = {
      sub: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol,
    };
    return this.jwtService.sign(payload);
  }

  async getUsuarioPorId(idUsuario: number): Promise<Usuario> {
    return this.userService.findById(idUsuario);
  }

  async solicitarRecuperacion(dto: ForgotPasswordDto) {
    const usuario = await this.userService.findUserByEmail(dto.correo);

    if (usuario && usuario.estado === EstadoUsuario.ACTIVO) {
      await this.expedirCorreoRecuperacion(usuario);
    }

    // Mensaje genérico para no revelar si el correo existe (evita enumeración).
    return {
      message: 'Recibirás un enlace para restablecer tu contraseña.',
    };
  }

  private async expedirCorreoRecuperacion(usuario: Usuario): Promise<void> {
    const codigo = await this.tokenService.generarCodigo(
      usuario,
      TipoToken.RECUPERAR_CONTRASENA,
    );

    const jwtTemporal = this.jwtService.sign(
      { sub: usuario.id_usuario },
      {
        secret: this.configService.get<string>(JWT_RECOVERY_SECRET),
        expiresIn:
          this.configService.get<number>(JWT_RECOVERY_EXPIRES_IN_SECONDS) ??
          600,
      },
    );

    const frontendUrl = this.configService.get<string>(FRONTEND_URL);
    const enlace = `${frontendUrl}/reset-password?token=${jwtTemporal}`;

    const { enviado } = await this.mailService.sendTemplateMail({
      to: usuario.correo,
      subject: 'Recuperación de contraseña — HeavyCult',
      template: 'reset-password',
      context: {
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        codigo: codigo.token,
        enlace,
      },
    });

    const esDesarrollo =
      this.configService.get<string>(NODE_ENV) !== 'production';

    if (!enviado && esDesarrollo) {
      this.logger.warn(
        `[Recuperación simulada] correo=${usuario.correo} codigo=${codigo.token}`,
      );
      this.logger.warn(`[Recuperación simulada] enlace=${enlace}`);
    }

    if (!enviado && !esDesarrollo) {
      throw new BadRequestException(
        'No fue posible enviar el correo de recuperación. Inténtalo más tarde.',
      );
    }
  }

  async restablecerContrasena(
    dto: ResetPasswordDto,
    idUsuario: number,
  ): Promise<{ message: string }> {
    const token = await this.tokenService.validarCodigo(
      dto.codigo,
      TipoToken.RECUPERAR_CONTRASENA,
      idUsuario,
    );

    const usuario = token.usuario;

    const esIgualALaAnterior = await bcrypt.compare(
      dto.nuevaContrasena,
      usuario.contrasena,
    );

    if (esIgualALaAnterior) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la anterior.',
      );
    }

    const hash = await this.userService.hashedPassword(dto.nuevaContrasena);
    await this.userService.actualizarContrasena(idUsuario, hash);
    await this.tokenService.marcarComoUsado(token);

    return { message: 'Contraseña restablecida correctamente.' };
  }
}
