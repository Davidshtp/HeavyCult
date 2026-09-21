import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_RECOVERY_SECRET } from '../../config/constants';

interface RecoveryPayload {
  sub: number;
}

@Injectable()
export class JwtRecoveryStrategy extends PassportStrategy(
  Strategy,
  'jwt-recovery',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromUrlQueryParameter('token'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(JWT_RECOVERY_SECRET)!,
    });
  }

  validate(payload: RecoveryPayload): { id_usuario: number } {
    return { id_usuario: payload.sub };
  }
}
