import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from '../../config/constants';
import { RolUsuario } from '../../user/entity/usuario.entity';

export interface JwtPayload {
  sub: number;
  correo: string;
  rol: RolUsuario;
}

export interface AuthUser {
  id_usuario: number;
  correo: string;
  rol: RolUsuario;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) =>
          (request as { cookies?: Record<string, string> }).cookies?.jwt ??
          null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(JWT_SECRET)!,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id_usuario: payload.sub,
      correo: payload.correo,
      rol: payload.rol,
    };
  }
}
