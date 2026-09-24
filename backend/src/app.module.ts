import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  DB_DATABASE,
  DB_HOST,
  DB_PASSWORD,
  DB_PORT,
  DB_SYNCHRONIZE,
  DB_USER,
} from './config/constants';
import { envValidationSchema } from './config/env.validation';
import { MailModule } from './mail/mail.module';
import { TokenModule } from './token/token.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),

    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>(DB_HOST),
        port: config.get<number>(DB_PORT),
        username: config.get<string>(DB_USER),
        password: config.get<string>(DB_PASSWORD),
        database: config.get<string>(DB_DATABASE),
        autoLoadEntities: true,
        synchronize: config.get<boolean>(DB_SYNCHRONIZE) ?? false,
        migrationsRun: true,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    UserModule,
    TokenModule,
    MailModule,
    CloudinaryModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
