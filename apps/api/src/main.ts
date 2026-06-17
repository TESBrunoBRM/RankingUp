import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Serve static files from the public directory
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.use(express.static(join(__dirname, '..', 'public')));

  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? '*';

  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RankingUp API')
    .setDescription('Backend API for RankingUp critical business logic')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
}

void bootstrap();
