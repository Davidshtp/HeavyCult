import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { COOKIE_MAX_AGE_SECONDS, COOKIE_SECURE } from '../config/constants';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRecoveryGuard } from './guards/jwt-recovery.guard';
import { AuthUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async iniciarSesion(
    @Body() dto: InicioSesionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const usuario = await this.authService.iniciarSesion(dto);
    const accessToken = this.authService.firmarToken(usuario);

    const maxAgeSegundos =
      this.configService.get<number>(COOKIE_MAX_AGE_SECONDS) ?? 3600;

    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: this.configService.get<boolean>(COOKIE_SECURE) ?? false,
      sameSite: 'lax',
      maxAge: maxAgeSegundos * 1000,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Inicio de sesión exitoso.',
      usuario,
    };
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  async obtenerPerfil(@Req() req: { user: AuthUser }) {
    return this.authService.getUsuarioPorId(req.user.id_usuario);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cerrarSesion(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: this.configService.get<boolean>(COOKIE_SECURE) ?? false,
      sameSite: 'lax',
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Sesión cerrada correctamente.',
    };
  }

  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async solicitarRecuperacion(@Body() dto: ForgotPasswordDto) {
    return this.authService.solicitarRecuperacion(dto);
  }

  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRecoveryGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async restablecerContrasena(
    @Request() { user }: { user: AuthUser },
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.restablecerContrasena(dto, user.id_usuario);
  }
}
