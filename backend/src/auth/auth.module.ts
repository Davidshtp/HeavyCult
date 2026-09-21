import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JWT_EXPIRES_IN_SECONDS, JWT_SECRET } from '../config/constants';
import { MailModule } from '../mail/mail.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRecoveryGuard } from './guards/jwt-recovery.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtRecoveryStrategy } from './strategies/jwt-recovery.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(JWT_SECRET),
        signOptions: {
          expiresIn: configService.get<number>(JWT_EXPIRES_IN_SECONDS) ?? 3600,
        },
      }),
    }),
    UserModule,
    TokenModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRecoveryStrategy,
    JwtAuthGuard,
    JwtRecoveryGuard,
    RolesGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
