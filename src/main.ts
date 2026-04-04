import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Increase payload size limit for Base64 image uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:5173'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`🚀 School ERP Backend running on: http://localhost:${port}/api/v1`);
  logger.log(`🔌 WebSocket server active on port ${port}`);
}

bootstrap();
