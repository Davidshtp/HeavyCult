import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  API_GLOBAL_PREFIX,
  FRONTEND_URL,
  SERVER_PORT,
} from './config/constants';

const CUERPO_MAXIMO_JSON = '4mb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>(FRONTEND_URL);
  const port = configService.get<number>(SERVER_PORT) ?? 5560;

  app.setGlobalPrefix(configService.get<string>(API_GLOBAL_PREFIX) ?? 'api');

  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json({ limit: CUERPO_MAXIMO_JSON }));

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(port);
  console.log(`[HeavyCult] API corriendo en http://localhost:${port}`);
}

void bootstrap();
